import OpenAI from "openai";
import https from "https";
import type { TextChunk } from "./chunker";
import { enrichChunkWithSynonyms } from "./dialect";
import { chatViaPowerShell, shouldUsePowerShellOpenAI } from "./powershell-openai";
import { cosineSimilarity, hybridMerge, keywordScore } from "./hybrid-search";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-4o-mini";
const EMBED_BATCH_SIZE = 3;
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.includes("REPLACE_WITH")) {
    throw new Error("OPENAI_API_KEY is not configured in .env");
  }
  return new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("connection") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed")
  );
}

function openaiPostViaHttps<T>(path: string, payload: object): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.openai.com",
        path,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: REQUEST_TIMEOUT_MS,
        family: 4,
      },
      (res) => {
        // Collect raw Buffers and decode once as UTF-8 at the end. Concatenating
        // chunks into a string (data += chunk) can split a multi-byte UTF-8
        // character across chunk boundaries and corrupt Arabic text.
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const data = Buffer.concat(chunks).toString("utf8");
            const parsed = JSON.parse(data) as T & { error?: { message: string } };
            if (parsed.error) reject(new Error(parsed.error.message));
            else resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("HTTPS request timed out"));
    });
    req.write(body);
    req.end();
  });
}

async function embedViaHttps(texts: string[]): Promise<number[][]> {
  const parsed = await openaiPostViaHttps<{
    data: { index: number; embedding: number[] }[];
  }>("/v1/embeddings", { model: EMBEDDING_MODEL, input: texts });
  return parsed.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function embedBatch(client: OpenAI, texts: string[]): Promise<number[][]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
      });
      return response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES && isNetworkError(error)) {
        console.warn("SDK failed, falling back to native HTTPS...");
        return embedViaHttps(texts);
      }
      if (attempt < MAX_RETRIES) {
        const delay = attempt * 2000;
        console.warn(`Embedding batch failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenAIClient();
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(texts.length / EMBED_BATCH_SIZE);
    console.log(`Embedding batch ${batchNum}/${totalBatches}...`);

    const embeddings = await embedBatch(client, batch);
    allEmbeddings.push(...embeddings);

    if (i + EMBED_BATCH_SIZE < texts.length) {
      await sleep(400);
    }
  }

  return allEmbeddings;
}

const QUERY_EMBED_TIMEOUT_MS = 8_000;

async function tryEmbedQuery(query: string): Promise<number[] | null> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!.trim(),
    timeout: QUERY_EMBED_TIMEOUT_MS,
    maxRetries: 0,
  });
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: [query],
    });
    return response.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export type IndexedChunk = TextChunk & {
  embedding?: number[];
  searchText: string;
};

export function prepareChunksForIndexing(chunks: TextChunk[]): IndexedChunk[] {
  return chunks.map((chunk) => {
    const synonyms = enrichChunkWithSynonyms(chunk.content);
    return {
      ...chunk,
      metadata: { ...chunk.metadata, synonyms },
      searchText: [chunk.content, ...synonyms].join(" "),
    };
  });
}

export async function indexChunks(chunks: TextChunk[]): Promise<IndexedChunk[]> {
  const prepared = prepareChunksForIndexing(chunks);
  console.log(`Indexing ${prepared.length} chunks...`);
  const embeddings = await embedTexts(prepared.map((c) => c.searchText));
  return prepared.map((chunk, i) => ({ ...chunk, embedding: embeddings[i] }));
}

function keywordOnlyRetrieve(
  indexed: IndexedChunk[],
  query: string,
  topK: number
): IndexedChunk[] {
  const searchQuery = query;
  return [...indexed]
    .map((chunk) => ({
      chunk,
      score: keywordScore(searchQuery, chunk.searchText ?? chunk.content),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

export async function retrieveChunks(
  indexed: IndexedChunk[],
  query: string,
  expandedQuery: string,
  topK = 5
): Promise<IndexedChunk[]> {
  const searchText = `${query} ${expandedQuery}`;
  const queryEmbedding = await tryEmbedQuery(expandedQuery);

  if (!queryEmbedding) {
    return keywordOnlyRetrieve(indexed, searchText, topK);
  }

  const denseScores = new Map<string, number>();
  for (const chunk of indexed) {
    if (!chunk.embedding) continue;
    denseScores.set(chunk.id, cosineSimilarity(queryEmbedding, chunk.embedding));
  }
  const merged = hybridMerge(indexed, query, denseScores, { topK });
  return merged.map((r) => r.item);
}

function buildSystemPrompt(
  locale: "en" | "ar",
  category?: string,
  hasAffiliateCards = false,
): string {
  const categoryHint = category
    ? locale === "ar"
      ? `\nالقسم الحالي الذي يتصفحه المستخدم: ${category}. ركّز توصياتك فيه عند المناسبة.`
      : `\nThe user is currently browsing this category: ${category}. Prioritise it where relevant.`
    : "";

  const categoryList =
    locale === "ar"
      ? "الأزياء والعبايات، الجمال والعطور، العناية بالبشرة، ديكور المنزل والمطبخ، مستلزمات الأطفال والرضع، تخطيط السفر الذكي"
      : "Fashion & Abayas, Beauty & Scents, Skincare, Home Decor & Kitchen, Kids & Baby Essentials, Smart Travel Planning";

  const cardRulesAr = hasAffiliateCards
    ? `- لا تضع روابط URL خام أبداً. اذكر أسماء المنتجات أو المتاجر وأكواد الخصم فقط؛ الروابط تظهر تلقائياً في بطاقات المنتجات أسفل الرد.
- عندما تتوفر بطاقات شركاء أسفل الرد، ادعُ المستخدم بوضوح للضغط على صورة المنتج أو زر «تسوق الآن» للانتقال إلى رابط الشريك والشراء.`
    : `- لا تضع روابط URL خام أبداً.
- لا تدّعِ أن هناك بطاقات منتجات أو روابط شراء أسفل الرد إن لم تكن متوفرة. ادعُ المستخدم لاختيار قسم مناسب إذا لزم.`;

  const cardRulesEn = hasAffiliateCards
    ? `- Never paste raw URLs. Mention product or store names and discount codes only; links appear automatically in the product cards below your reply.
- When partner cards are shown below your reply, clearly invite the user to tap the product photo or the "Shop now" button to open the affiliate link and buy.`
    : `- Never paste raw URLs.
- Do not claim that product cards or shop links appear below the reply when none are available. Invite the user to choose a relevant category if needed.`;

  return locale === "ar"
    ? `أنت رغد (Raghad AI) — المستشار الذكي الفاخر في Askraghadai.com. أنت خبير واثق وودود في الموضة والجمال والعناية بالبشرة والمنزل ومستلزمات الأطفال والسفر.${categoryHint}

مهمتك: قدّم إجابة مباشرة ومفيدة وشخصية داخل المحادثة — نصائح، توصيات، خطط سفر، روتين عناية، وأفكار عملية.

قواعد الرد:
- أجب دائماً بشكل مباشر ومفصّل. لا تكتفي بإحالة المستخدم إلى القوائم أو الأقسام فقط.
- استخدم "معلومات قاعدة المعرفة" أدناه كمصدر أساسي عندما تكون ذات صلة. إن لم تكن كافية، اعتمد على خبرتك العامة لتقديم نصيحة ذكية وواقعية.
- نسّق الرد بشكل احترافي: عناوين عريضة بـ **نص**، فقرات قصيرة، ونقاط بـ - أو قوائم مرقّمة (١. ٢.). لخطط السفر استخدم تقسيماً واضحاً (**اليوم ١**، **اليوم ٢**...).
- اترك سطراً فارغاً بين الأقسام لسهولة القراءة.
${cardRulesAr}
- يمكنك اقتراح قسم مناسب بشكل طبيعي ضمن النصيحة، لكن بعد تقديم إجابة حقيقية أولاً.
- استخدم العربية الفصحى السهلة مع لمسة خليجية راقية.
- استخدم صيغة مخاطبة محايدة وجامعة للجميع (صيغة المذكر الافتراضية المهنية).
- ممنوع تماماً استخدام صيغ المؤنث في الأفعال أو الضمائر أو الأمر، مثل: تأكدي، احجزي، اخترِي، تفضلين، تفضلينه، سؤالكِ، عليكِ، يمكنكِ، هل تريدين.
- استخدم بدلاً منها: تأكد، احجز، اختر، تفضّل، سؤالك، عليك، يمكنك، هل تريد.
- خاطب المستخدم بأسلوب محترم ومحايد يناسب الجميع.
- اختتم بسؤال أو دعوة لطيفة لمواصلة المساعدة.
- الأقسام المتاحة عند الحاجة: ${categoryList}.`
    : `You are Raghad (Raghad AI) — the luxury smart advisor at Askraghadai.com. You are a confident, warm expert in fashion, beauty, skincare, home, kids' essentials, and travel.${categoryHint}

Your job: give a direct, useful, personalised answer inside the chat — advice, recommendations, travel itineraries, skincare routines, and practical ideas.

Response rules:
- Always answer directly and in detail. Never just redirect the user to menus or categories.
- Use the "Knowledge base" information below as your primary source when relevant. If it is insufficient, rely on your own expertise to give smart, realistic advice.
- Format professionally: use **bold titles**, short paragraphs, and bullet lists with - or numbered lists (1. 2.). For travel, use clear day sections (**Day 1**, **Day 2**...).
- Leave a blank line between sections for readability.
${cardRulesEn}
- You may naturally suggest a relevant category, but only after giving a real answer first.
- Keep a professional, inclusive tone in English (neutral "you").
- When answering in Arabic (or mixing), never use feminine conjugations; use masculine-default neutral forms (تريد not تريدين, تفضّل not تفضلين).
- End with a friendly question or invitation to continue helping.
- Available categories when useful: ${categoryList}.`;
}

function buildUserContent(
  query: string,
  context: string,
  locale: "en" | "ar",
  affiliatePartners: string[] = [],
): string {
  const label = locale === "ar" ? "معلومات قاعدة المعرفة" : "Knowledge base";
  const none = locale === "ar" ? "(لا توجد معلومات محددة — اعتمد على خبرتك)" : "(No specific entries — use your expertise)";
  const questionLabel = locale === "ar" ? "سؤال المستخدم" : "User question";

  let partnersBlock = "";
  if (affiliatePartners.length > 0) {
    const list = affiliatePartners.map((p) => `- ${p}`).join("\n");
    partnersBlock =
      locale === "ar"
        ? `\n\nشركاء التسوق المعتمدون لدينا (روابطهم القابلة للنقر تظهر تلقائياً كبطاقات أسفل ردك مباشرة):\n${list}\nرشّح هؤلاء الشركاء بالاسم داخل نصيحتك وادعُ المستخدم للضغط على البطاقات أسفل الرد للتسوق عبرها. لا تخترع متاجر أو روابط أخرى.`
        : `\n\nOur approved shopping partners (their clickable links appear automatically as cards directly below your reply):\n${list}\nRecommend these partners by name within your advice and invite the user to tap the cards below to shop through them. Do not invent other stores or links.`;
  }

  return `${label}:\n${context.trim() || none}${partnersBlock}\n\n${questionLabel}: ${query}`;
}

async function runChat(chatPayload: {
  model: string;
  messages: unknown[];
  temperature: number;
}): Promise<string> {
  if (shouldUsePowerShellOpenAI()) {
    try {
      return await chatViaPowerShell(chatPayload as never);
    } catch (error) {
      console.warn("[rag] PowerShell chat failed:", error);
    }
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 45_000,
      maxRetries: 0,
    });
    const response = await client.chat.completions.create(chatPayload as never);
    return (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "";
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    console.warn("[rag] Chat SDK failed, trying HTTPS...");
    const response = await openaiPostViaHttps<{
      choices: { message: { content: string } }[];
    }>("/v1/chat/completions", chatPayload);
    return response.choices[0]?.message?.content ?? "";
  }
}

export async function generateAnswer(
  query: string,
  contextChunks: IndexedChunk[],
  locale: "en" | "ar" = "en",
  category?: string,
  affiliatePartners: string[] = []
): Promise<string> {
  const context = contextChunks.map((c) => c.content).join("\n\n---\n\n");

  const messages = [
    {
      role: "system" as const,
      content: buildSystemPrompt(locale, category, affiliatePartners.length > 0),
    },
    { role: "user" as const, content: buildUserContent(query, context, locale, affiliatePartners) },
  ];

  const chatPayload = { model: CHAT_MODEL, messages, temperature: 0.5 };

  try {
    return await runChat(chatPayload);
  } catch (error) {
    console.warn("[rag] Chat failed:", error);
    if (locale === "ar") {
      return contextChunks[0]?.content
        ? `إليك ما يمكنني مشاركته الآن:\n\n${contextChunks[0].content}`
        : "عذراً، تعذّر الاتصال بخدمة الذكاء الاصطناعي للحظات. يرجى إعادة إرسال سؤالك وسأساعدك فوراً.";
    }
    return contextChunks[0]?.content
      ? `Here is what I can share right now:\n\n${contextChunks[0].content}`
      : "Sorry, I couldn't reach the AI service for a moment. Please resend your question and I'll help right away.";
  }
}

export async function generateVisionAnswer(
  query: string,
  imageDataUrl: string,
  contextChunks: IndexedChunk[],
  locale: "en" | "ar" = "en",
  category?: string,
  affiliatePartners: string[] = []
): Promise<string> {
  const context = contextChunks.map((c) => c.content).join("\n\n---\n\n");
  const defaultQuery =
    locale === "ar"
      ? "حلّل هذه الصورة وقدّم توصيات مناسبة."
      : "Analyse this image and give suitable recommendations.";

  const messages = [
    {
      role: "system" as const,
      content: buildSystemPrompt(locale, category, affiliatePartners.length > 0),
    },
    {
      role: "user" as const,
      content: [
        { type: "text", text: buildUserContent(query || defaultQuery, context, locale, affiliatePartners) },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const chatPayload = { model: CHAT_MODEL, messages, temperature: 0.5 };

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 60_000,
      maxRetries: 1,
    });
    const response = await client.chat.completions.create(chatPayload as never);
    return (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "";
  } catch (error) {
    console.warn("[rag] Vision chat failed:", error);
    return locale === "ar"
      ? "عذراً، تعذّر تحليل الصورة الآن. يمكنك وصف ما تبحث عنه نصياً وسأساعدك فوراً."
      : "Sorry, I couldn't analyse the image right now. Describe what you're looking for and I'll help right away.";
  }
}

export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && !key.includes("REPLACE_WITH"));
}
