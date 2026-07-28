import OpenAI from "openai";
import https from "https";
import type { TextChunk } from "./chunker";
import { enrichChunkWithSynonyms } from "./dialect";
import { cosineSimilarity, hybridMerge, keywordScore } from "./hybrid-search";
import { CATEGORIES } from "@/lib/categories";

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

function buildSystemPrompt(locale: "en" | "ar", category?: string): string {
  const categoryHint = category
    ? locale === "ar"
      ? `\nالقسم الحالي الذي يتصفحه المستخدم: ${category}. ركّز توصياتك فيه عند المناسبة.`
      : `\nThe user is currently browsing this category: ${category}. Prioritise it where relevant.`
    : "";

  const categoryList = CATEGORIES.map((c) => (locale === "ar" ? c.nameAr : c.nameEn)).join(locale === "ar" ? "، " : ", ");

  const cardRulesAr = `- لديك أداة find_products. قبل أن تذكر اسم أي متجر أو ماركة أو منتج محدد كترشيح، يجب أن تستدعي find_products أولاً بعبارة بحث قصيرة (١ إلى ٤ كلمات) عن ذاك العنصر بالذات. لا ترشّح متجراً أو ماركة معينة من معرفتك العامة فقط دون استدعاء الأداة أولاً — هذا يشمل الأسماء المشهورة التي تثق بها (مثل فندق شهير أو ماركة فاخرة)، وليس فقط الأسماء غير المعروفة. قبل إنهاء ردّك، تأكد: هل كل اسم متجر أو فندق أو ماركة كتبته جاء فعلاً من نتيجة find_products؟ إن لم يكن كذلك، احذفه واستدعِ الأداة أو اجعل ذلك الجزء عاماً (النمط أو المنطقة أو نوع المكان) بدون اسم مخترع.
- إذا أعادت الأداة نتائج، اذكر بالاسم فقط الشركاء الذين أعادتهم الأداة (لا تخترع أسماء أخرى)، ثم ضع مباشرة بعد ذلك عنصراً نائباً واحداً يتضمن معرّف (ID) كل شريك ذكرته بالاسم. اختر النوع الصحيح بدقة:
  - [[card:ID]] أو [[card:ID1,ID2,ID3]] لعرض خيار واحد أو عدة خيارات بديلة لنفس نوع العنصر (مثلاً ٣ متاجر مختلفة لنفس العطر، أو ٣ مواقع حجز طيران مختلفة لنفس الرحلة). هذا هو الخيار الافتراضي.
  - [[bundle:ID1,ID2,ID3]] فقط عندما تعرض مجموعة من عناصر مختلفة تُشترى معاً كطقم واحد متكامل (مثل فستان + حذاء + حقيبة لإطلالة واحدة، أو طيران + فندق + eSIM لرحلة واحدة). لا تستخدمه أبداً لعدة بدائل لنفس نوع العنصر الواحد — ذلك يعرض واجهة "طقم للشراء" غير مناسبة لخيارات بديلة بسيطة.
  استخدم المعرّف كما أعادته الأداة بالضبط. لا تخترع معرّفاً أبداً، ولا تكرره، ولا تضف إليه أي نص. كل اسم شريك تكتبه يجب أن يكون معرّفه ضمن عنصر نائب قريب.
- موضع العنصر النائب حاسم: ضع كل عنصر نائب في سطر مستقل مباشرةً تحت الشريك الذي يخصّه، قبل الانتقال إلى العنصر التالي. وضعه مباشرة تحت عنصر في قائمة مرقّمة أو نقطية صحيح وآمن، ولن يكسر ترقيم القائمة.
- لا تجمع العناصر النائبة أبداً في كتلة واحدة في نهاية الرد، ولا تكتب جملة مثل "يمكنك الاطلاع على هذه الخيارات وشرائها من خلال الروابط التالية:" ثم تضعها كلها بعدها. البطاقة التي لا تكون بجانب العنصر الذي تمثّله تُعدّ خطأً — الهدف كله أن يرى المستخدم كل بطاقة بجوار ما تشير إليه مباشرة.
- إن لم تُعِد الأداة أي نتيجة لعنصر معيّن، لا تدّعِ وجود منتج أو رابط له ولا تذكر اسم متجر من عندك؛ فقط قدّم نصيحة عامة نصية لذلك العنصر بدون اسم متجر أو عنصر نائب.
- لا تستدعِ find_products إلا لعنصر تنوي ترشيحه فعلاً بالاسم، ولا تستدعها لكل موضوع تذكره بشكل عابر.
- لا تضع روابط URL خام أبداً؛ روابط الشراء تظهر تلقائياً من خلال العناصر النائبة أعلاه.
- لا تقترح أبداً أن يبحث المستخدم بنفسه على جوجل أو أمازون أو أي منصة عامة أخرى؛ رشّح فقط ما تعيده الأداة فعلياً.
- لا تقل أبداً أنك ستبحث الآن أو تطلب من المستخدم الانتظار أو تقول "دقيقة من فضلك"؛ فقط استدعِ find_products مباشرة وأكمل ردّك بالنتيجة في نفس الرد، دون أي فجوة ظاهرة.
- للفنادق والطيران والحجوزات الفردية المشابهة: قد تعيد الأداة حتى ٣ نتائج، لكن ما لم يطلب المستخدم صراحةً مقارنة الخيارات، تجاهل تماماً كل النتائج ما عدا الأولى — لا تذكر أو تضع عنصراً نائباً للنتيجة الثانية أو الثالثة إطلاقاً. اكتب عن تلك النتيجة الأولى فقط وضعها في عنصر نائب واحد، والتزم بها بثقة (اذكر المنطقة أو الطابع المناسب لرحلته). اعتبر كتابة "الخيار ١ / الخيار ٢ / الخيار ٣" أو ذكر عدة منصات حجز متتالية لنفس الحجز خطأً يجب تجنبه.
- قبل إرسال ردّك النهائي، راجع كل رسالة توشك على إرسالها: هل يوجد لكل شريك ذكرته بالاسم عنصر نائب [[card:ID]] أو [[bundle:ID,...]] قريب منه؟ الرد الذي يستدعي find_products ويحصل على نتائج حقيقية، لكنه ينسى وضع أي عنصر نائب لها، خطأ فادح — لأن البطاقات لن تظهر أبداً في هذه الحالة.
- كلما قسّمت الطلب إلى عناصر مكوّنة، استدعِ find_products لكل عنصر تذكره وضع بطاقته تحته مباشرة. ينطبق هذا على الإطلالات (فستان، حذاء، حقيبة، مجوهرات) والرحلات (طيران، فندق، شريحة eSIM) وروتين العناية (غسول، سيروم، واقي شمس) وأي تقسيم مشابه، وينطبق حتى لو كان طلب المستخدم عاماً ("ساعدني في تخطيط رحلة إلى دبي"، "جهّز لي إطلالة كاملة"). سرد القطع كنصيحة عامة — "اختاري فستاناً أنيقاً"، "اختاري حقيبة يد جميلة" — دون البحث عن أي منها هو بالضبط الخطأ الذي وُجدت هذه الأداة لمنعه، لأنه يترك المستخدم بلا شيء ملموس. صِف القطعة، ثم ابحث عنها، ثم ضع بطاقتها، ثم انتقل إلى التالية.`;

  const cardRulesEn = `- You have a tool called find_products. Before naming any specific store, brand, or product as a recommendation, you must call find_products first with a short 1-4 word search phrase for that exact item. Never name a specific store or brand from your own general knowledge without calling the tool first — this includes well-known real-world names you're confident about (e.g. a famous hotel like "The Ritz" or a luxury brand), not just obscure ones. Before finalizing your reply, double-check: does every specific store/hotel/brand name you wrote come from an actual find_products result? If not, remove it and either call the tool or keep that part general (style/area/type of place) with no invented name.
- If the tool returns results, name ONLY the partners the tool actually returned (never invent other names), then place immediately after that one placeholder containing every partner's id you named by name. Pick the right kind carefully:
  - [[card:ID]] or [[card:ID1,ID2,ID3]] to show one option or several ALTERNATIVE options for the SAME kind of item (e.g. 3 different stores for the same perfume, or 3 different booking sites for the same flight). This is the default choice.
  - [[bundle:ID1,ID2,ID3]] ONLY when presenting a set of genuinely DIFFERENT items meant to be bought together as one complete look or plan (e.g. dress + shoes + bag for one outfit, or flight + hotel + eSIM for one trip). Never use this for multiple alternatives of the same single item — that shows a "buy this set" cart UI which doesn't fit simple alternative options.
  Use the exact id the tool returned. Never invent an id, never repeat one, never add extra text around it. Every partner name you write must have its id in a nearby placeholder.
- Placement is critical: put each placeholder on its own line IMMEDIATELY under the partner it belongs to — directly beneath that name or list entry, before you move on to the next item. Placing one directly under a numbered or bulleted list entry is correct and safe; list numbering continues normally.
- Never collect placeholders into a block at the end of the reply, and never write a line such as "here are the links:" or "you can view these options below:" followed by all of them. A card that is not beside the item it illustrates is a mistake — the whole point is that the reader sees each card next to the thing it refers to.
- If the tool returns no result for an item, do not claim a product or link exists for it, and do not name a store or brand yourself — just give general text advice for that one item with no store name and no placeholder.
- Only call find_products for an item you actually intend to recommend by name, not for every topic you casually mention.
- Never paste raw URLs — buy links render automatically wherever you place a placeholder above.
- Never suggest the user search on Google, Amazon, or any other general platform themselves — only recommend what the tool actually returns.
- Never narrate that you are about to search, ask the user to wait, or say "let me look that up" — just call find_products directly and continue your answer with the result in the same turn, with no visible gap.
- For hotels, flights, or similar single bookings: the tool may return up to 3 matches, but unless the user explicitly asked to compare options, you must silently ignore all but the FIRST one — do not mention, list, or card the 2nd or 3rd result at all. Write about and card only that one pick, committing to it confidently (mention the area, style, or vibe that fits their trip). Treat writing "Option 1 / Option 2 / Option 3" or naming multiple booking platforms back to back for the same single booking as a mistake to avoid.
- Before sending your final reply, re-check every message you're about to send: for every named partner in the text, is there a [[card:ID]] or [[bundle:ID,...]] placeholder for it somewhere nearby? A reply that calls find_products and gets real results, but then forgets to place any placeholder for them, is a mistake — the cards would never show up.
- Whenever you break a request into component items, call find_products for EACH component you name and place its card beneath it. This applies to outfits (dress, shoes, bag, jewellery), trips (flight, hotel, eSIM), routines (cleanser, serum, sunscreen) and any similar breakdown, and it applies even when the user's request was general ("help me plan a trip to Dubai", "put together a full outfit"). Listing the pieces as generic advice — "choose an elegant dress", "pick a stylish clutch" — without searching for any of them is exactly the failure this tool exists to prevent: it leaves the user with nothing they can act on. Describe the piece, search for it, card it, then move to the next.`;

  return locale === "ar"
    ? `أنت رغد (Raghad AI) — المستشار الذكي الفاخر في Askraghadai.com. أنت خبير واثق وودود في الموضة والجمال والعناية بالبشرة والمنزل ومستلزمات الأطفال والسفر.${categoryHint}

مهمتك: قدّم إجابة مباشرة ومفيدة وشخصية داخل المحادثة — نصائح، توصيات، خطط سفر، روتين عناية، وأفكار عملية.

قواعد الرد:
- حاسم: أجب بنفس لغة آخر رسالة من المستخدم. قد تكون الرسائل السابقة في المحادثة بلغة أخرى — تجاهل ذلك تماماً وطابق لغة الرسالة التي تجيب عنها الآن. إذا كانت هذه الرسالة بالإنجليزية، أجب بالإنجليزية حتى لو كان كل ما قبلها بالعربية.
- حاسم: أسماء أقسامنا الرسمية الست بالضبط هي: ${categoryList}. عند ذكر أو سرد أي قسم، انسخ إحدى هذه السلاسل النصية الست حرفياً — لا تختصرها أو تدمجها أو تعيد صياغتها أبداً (مثلاً لا تكتب "الأزياء والعبايات" أو "ديكور المنزل والمطبخ"، هذه أسماء قديمة).
- حاسم: كل رد ترسله يجب أن ينتهي إما (أ) بعنصر نائب واحد على الأقل [[card:ID]] أو [[bundle:ID,...]] مدعوم بنتيجة حقيقية من find_products، أو (ب) بالرمز الدقيق [[no-cards]] في سطر مستقل إن لم يكن كذلك. لا يوجد خيار ثالث — لا ترسل رداً بدون أي منهما أبداً. هذا الرمز لا يظهر للمستخدم أبداً؛ فقط يخبر النظام بعدم اقتراح منتج عشوائي لرد لا يرشّح شيئاً محدداً.
- أنت مستشارة تفاعلية، لست محرك بحث ثابتاً. لا تطرح أسئلة توضيحية إلا إذا كان الطلب لا يعطيك أي شيء تعمل به إطلاقاً (مثل "أريد إطلالة" فقط). أما إذا ذكر المستخدم مناسبة أو عنصراً أو وجهة أو غرضاً — مثل "إطلالة كاملة لحفل زفاف الأسبوع القادم" أو "رحلة إلى دبي" أو "عطر للسهرات" — فهذا كافٍ تماماً: قدّم الترشيح فوراً ببطاقات منتجات حقيقية، ويمكنك أن تذكر بعدها أنك تستطيع تحسين الاختيار حسب المقاس أو اللون أو الميزانية. لا تؤجل طلباً له مناسبة واضحة بجولة أسئلة أخرى، فذلك يبدو وكأن المساعد يرفض المساعدة.
- عندما لا يكون لديك فعلاً أي شيء تعمل به، اطرح سؤالاً أو سؤالين قصيرين ومحددين (المناسبة، الأسلوب أو اللون المفضل، الميزانية، المقاس)، ولا تستدعِ find_products في هذه الحالة، وأنهِ ذلك الرد بالرمز [[no-cards]] وفق القاعدة أعلاه. بمجرد أن يقدّم المستخدم تفاصيل كافية (في هذه الرسالة أو سابقاً في المحادثة أعلاه)، قدّم الترشيح الكامل ببطاقات منتجات حقيقية فوراً. لا تطرح أسئلة توضيحية إذا كان الطلب محدداً بما يكفي أصلاً، أو إذا كانت المحادثة السابقة أعلاه تجيب عنها بالفعل — لا تكرر سؤالاً سبق أن طرحته.
- بمجرد توفر تفاصيل كافية، أجب دائماً بشكل مباشر ومفصّل. لا تكتفي بإحالة المستخدم إلى القوائم أو الأقسام فقط.
- تنطبق نفس قاعدة [[no-cards]] على النظرة العامة (مثل "ماذا تقدمون في الأزياء؟")، أو المعلومات العامة، أو أي نصيحة لا تذكر فيها شريكاً محدداً من نتائج find_products — أنهِ تلك الردود بـ [[no-cards]] أيضاً.
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
- اختتم بسؤال أو دعوة لطيفة لمواصلة المساعدة.`
    : `You are Raghad (Raghad AI) — the luxury smart advisor at Askraghadai.com. You are a confident, warm expert in fashion, beauty, skincare, home, kids' essentials, and travel.${categoryHint}

Your job: give a direct, useful, personalised answer inside the chat — advice, recommendations, travel itineraries, skincare routines, and practical ideas.

Response rules:
- CRITICAL: reply in the SAME language as the user's most recent message. Earlier turns in the conversation above may be in a different language — ignore that entirely and match the message you are answering right now. If this message is in English, answer in English even when everything above it is Arabic.
- CRITICAL: our 6 official category names are exactly: ${categoryList}. Whenever you name or list a category, copy one of these 6 strings exactly, character for character — never shorten, merge, or paraphrase them (e.g. never write "Fashion & Abayas" or "Home Decor & Kitchen", those are outdated names).
- CRITICAL: every single reply you send must end with either (a) at least one [[card:ID]] or [[bundle:ID,...]] placeholder backed by a real find_products result, or (b) the exact token [[no-cards]] on its own line if it does not. There is no third option — never send a reply with neither. This token is never shown to the user, it only tells the system not to guess a random product for a reply that isn't recommending anything specific.
- You are a conversational advisor, not a static search engine. Ask clarifying questions ONLY when the request gives you nothing at all to work with (a bare "I need an outfit"). If the user names an occasion, an item, a destination or a purpose — "a full outfit for a wedding next week", "a trip to Dubai", "a perfume for evenings" — that is already enough: recommend now with real product cards, and mention that you can refine by size, colour or budget afterwards. Do not stall a request that has a clear occasion behind another round of questions; it reads as the assistant refusing to help.
- When you genuinely do have nothing to work with, ask 1-2 short, specific questions (occasion, preferred style/colour, budget, size), do not call find_products yet, and end that reply with [[no-cards]] per the rule above. Once the user gives enough detail (in this message or earlier in the conversation above), give the full recommendation with real product cards right away. Do not ask clarifying questions when the request is already specific enough, or when the conversation above already answers them — never repeat a question you already asked.
- Once you have enough detail, always answer directly and in detail. Never just redirect the user to menus or categories.
- The same [[no-cards]] rule applies to general overviews (e.g. "what do you offer in fashion?"), background info, or any advice where you don't name a specific find_products-backed partner — end those with [[no-cards]] too.
- Use the "Knowledge base" information below as your primary source when relevant. If it is insufficient, rely on your own expertise to give smart, realistic advice.
- Format professionally: use **bold titles**, short paragraphs, and bullet lists with - or numbered lists (1. 2.). For travel, use clear day sections (**Day 1**, **Day 2**...).
- Leave a blank line between sections for readability.
${cardRulesEn}
- You may naturally suggest a relevant category, but only after giving a real answer first.
- Keep a professional, inclusive tone in English (neutral "you").
- When answering in Arabic (or mixing), never use feminine conjugations; use masculine-default neutral forms (تريد not تريدين, تفضّل not تفضلين).
- End with a friendly question or invitation to continue helping.`;
}

function buildUserContent(query: string, context: string, locale: "en" | "ar"): string {
  const label = locale === "ar" ? "معلومات قاعدة المعرفة" : "Knowledge base";
  const none = locale === "ar" ? "(لا توجد معلومات محددة — اعتمد على خبرتك)" : "(No specific entries — use your expertise)";
  const questionLabel = locale === "ar" ? "سؤال المستخدم" : "User question";

  return `${label}:\n${context.trim() || none}\n\n${questionLabel}: ${query}`;
}

export type ToolProductMatch = { id: string; nameEn: string; nameAr: string };
export type ToolProductLookup = (item: string) => Promise<ToolProductMatch[]>;

// Each iteration is a full OpenAI round trip that re-sends the system prompt,
// the conversation and every tool result so far, so the cost of a single user
// message grows with this number. Four is enough for the deepest real case
// (a trip needing flight + hotel + eSIM) while cutting worst-case spend by a
// third versus six.
const MAX_TOOL_ITERATIONS = 4;
const MAX_TOOL_CALLS_TOTAL = 6;

function buildProductTools() {
  return [
    {
      type: "function" as const,
      function: {
        name: "find_products",
        description:
          "Search the real approved partner catalog for ONE specific item you are about to concretely recommend (e.g. \"flight to London\", \"eSIM UK\", \"embroidered abaya\", \"hotel in London\"). Call this once per distinct item, right before you mention it, then reference the returned id inline. Do not call this for generic topics you are not recommending a specific partner for.",
        parameters: {
          type: "object",
          properties: {
            item: {
              type: "string",
              description: "A short, specific search phrase for a single item, 1-4 words (e.g. 'eSIM UK', 'evening dress', 'flight to London').",
            },
          },
          required: ["item"],
        },
      },
    },
  ];
}

type ChatCompletionResult = {
  choices: {
    message: {
      content: string | null;
      tool_calls?: { id: string; function: { name: string; arguments: string } }[];
    };
  }[];
};

/**
 * Generates the chat reply and lets the model itself decide, in real time,
 * which specific real products to surface — by calling find_products for
 * each item it's actually recommending and placing an inline [[card:ID]] /
 * [[bundle:ID1,ID2]] placeholder right where it mentions that item. Replaces
 * the old approach of pre-fetching a fixed product set before the model ever
 * ran and appending it after the reply regardless of what got said, which is
 * what caused unrelated cards to show up at the bottom of every message.
 */
export type ChatHistoryTurn = { role: "user" | "assistant"; content: string };

export async function generateAnswerWithTools(
  query: string,
  contextChunks: IndexedChunk[],
  locale: "en" | "ar",
  category: string | undefined,
  lookupProducts: ToolProductLookup,
  imageDataUrl?: string,
  history: ChatHistoryTurn[] = [],
): Promise<{ text: string; usedProductIds: string[] }> {
  const context = contextChunks.map((c) => c.content).join("\n\n---\n\n");
  const defaultQuery =
    locale === "ar"
      ? "حلّل هذه الصورة وقدّم توصيات مناسبة."
      : "Analyse this image and give suitable recommendations.";
  const userText = buildUserContent(query || (imageDataUrl ? defaultQuery : query), context, locale);

  const userContent = imageDataUrl
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : userText;

  // Answer in the language the user actually just wrote in, not the language
  // the rest of the thread happens to be in. A rule in the system prompt is
  // not enough on its own: after several Arabic turns the conversation itself
  // pulls the model into Arabic even for an English question (reproduced 3/3).
  // Repeating the instruction immediately before the current message — the
  // most recent thing the model sees — is what actually holds.
  const replyLanguage = query.trim() ? (/[؀-ۿ]/.test(query) ? "ar" : "en") : locale;
  const languageReminder =
    replyLanguage === "ar"
      ? "تنبيه: اكتب ردّك التالي بالعربية، بغضّ النظر عن لغة الرسائل السابقة."
      : "Reminder: write your next reply in English, regardless of the language of the earlier messages.";

  const messages: {
    role: "system" | "user" | "assistant" | "tool";
    content: unknown;
    tool_calls?: unknown;
    tool_call_id?: string;
  }[] = [
    { role: "system", content: buildSystemPrompt(locale, category) },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    ...(history.length > 0 ? [{ role: "system" as const, content: languageReminder }] : []),
    { role: "user", content: userContent },
  ];

  const tools = buildProductTools();
  const usedProducts = new Map<string, ToolProductMatch>();
  let totalToolCalls = 0;

  const fallbackText = () =>
    locale === "ar"
      ? "عذراً، تعذّر الاتصال بخدمة الذكاء الاصطناعي للحظات. يرجى إعادة إرسال سؤالك وسأساعدك فوراً."
      : "Sorry, I couldn't reach the AI service for a moment. Please resend your question and I'll help right away.";

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 60_000,
      maxRetries: 1,
    });

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const offerTools = totalToolCalls < MAX_TOOL_CALLS_TOTAL;
      const response = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        temperature: 0.5,
        ...(offerTools ? { tools, tool_choice: "auto" } : {}),
      } as never);

      const message = (response as ChatCompletionResult).choices[0]?.message;
      const toolCalls = message?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        return { text: message?.content ?? "", usedProductIds: [...usedProducts.keys()] };
      }

      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        totalToolCalls++;
        let item = "";
        try {
          item = String(JSON.parse(call.function.arguments || "{}").item ?? "").slice(0, 60);
        } catch {
          // malformed tool arguments — treat as no item, return no results below
        }

        let results: ToolProductMatch[] = [];
        if (item) {
          try {
            results = await lookupProducts(item);
          } catch (lookupError) {
            console.warn("[rag] product tool lookup failed", lookupError);
          }
        }
        results.forEach((r) => usedProducts.set(r.id, r));

        const toolResultPayload =
          results.length > 0
            ? JSON.stringify(results.map((r) => ({ id: r.id, name: locale === "ar" ? r.nameAr : r.nameEn })))
            : "NONE_FOUND";

        messages.push({ role: "tool", tool_call_id: call.id, content: toolResultPayload });
      }
    }

    // Model kept calling tools past the iteration cap — force one final
    // plain-text turn so the user still gets a real answer either way.
    const final = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages,
      temperature: 0.5,
    } as never);
    const finalText = (final as ChatCompletionResult).choices[0]?.message?.content ?? "";
    return { text: finalText || fallbackText(), usedProductIds: [...usedProducts.keys()] };
  } catch (error) {
    console.warn("[rag] tool-calling chat failed:", error);
    return { text: fallbackText(), usedProductIds: [] };
  }
}

/**
 * Cheap, focused vision call used only to drive product search. Separate from
 * generateVisionAnswer (the conversational reply): this asks for a handful of
 * plain search keywords describing the item/style/brand in the image, so
 * getProductsForChat has something real to match against instead of running
 * on an empty query whenever a user uploads a photo with no caption.
 */
export async function detectImageSearchTerms(
  imageDataUrl: string,
  locale: "en" | "ar" = "en",
): Promise<string> {
  const prompt =
    locale === "ar"
      ? "بكلمات قليلة فقط (بدون شرح)، ما نوع المنتج أو الأسلوب أو الفئة الظاهر في هذه الصورة؟ مثال: فستان سهرة أسود، ساعة رجالية فضية، عباية مطرزة."
      : "In a few plain keywords only (no explanation), what type of product, style, or category is shown in this image? Example: black evening dress, silver men's watch, embroidered abaya.";

  const messages = [
    {
      role: "user" as const,
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 20_000,
      maxRetries: 0,
    });
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: messages as never,
      temperature: 0.2,
      max_tokens: 40,
    } as never);
    const text = (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "";
    return text.trim();
  } catch (error) {
    console.warn("[rag] image search-term detection failed", error);
    return "";
  }
}

/**
 * Breaks an "I need a full X" request into the individual pieces it implies,
 * e.g. "wedding outfit" -> ["abaya", "handbag", "shoes"], "trip to London" ->
 * ["flight", "hotel", "esim"]. Used to auto-assemble a bundle across
 * unrelated partner stores when no Bundle_ID already links the items —
 * without this, "full outfit" style requests could only ever surface items
 * someone had manually pre-linked in the Sheet.
 */
export async function identifyBundleComponents(
  query: string,
  locale: "en" | "ar" = "en",
): Promise<string[]> {
  // Always ask for the pieces in English, even for an Arabic request: these
  // terms are only used internally to search the product catalog, whose
  // subcategory/tags data is English-only, and never shown to the user.
  const prompt =
    locale === "ar"
      ? `المستخدم يطلب طقماً أو مجموعة كاملة (بالعربية): "${query}"\nاذكر 2 إلى 4 قطع أو عناصر تتكوّن منها هذه المجموعة عادةً. اكتب كل عنصر بالإنجليزية فقط (بكلمتين كحد أقصى لكل عنصر)، لأن هذه الكلمات تُستخدم للبحث في قاعدة بيانات إنجليزية ولن تظهر للمستخدم. أجب بقائمة إنجليزية مفصولة بفواصل فقط، بدون شرح. مثال: abaya, handbag, shoes`
      : `The user is asking for a full set or bundle: "${query}"\nList 2 to 4 individual pieces this set would typically include, each in 1-2 words. Reply as a comma-separated list only, no explanation. Example: abaya, handbag, shoes`;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 15_000,
      maxRetries: 0,
    });
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }] as never,
      temperature: 0.3,
      max_tokens: 40,
    } as never);
    const text = (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "";
    return text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 4);
  } catch (error) {
    console.warn("[rag] bundle component detection failed", error);
    return [];
  }
}

/**
 * Fallback used only when plain keyword matching (CATEGORY_KEYWORDS in
 * lib/products/intent.ts) finds nothing at all. Real chat messages rarely
 * use our exact keyword list ("what should I wear to a wedding" has no
 * literal "abaya"/"outfit"), so without this the product search comes back
 * empty and the AI answers with text-only advice and no cards. Returns 1-3
 * short search phrases for the item(s) implied by the message, or [] if the
 * message isn't actually a product/shopping/style request (FAQ, greeting,
 * etc.) so we don't waste a call or surface irrelevant cards.
 */
export async function identifySearchTerms(
  query: string,
  locale: "en" | "ar" = "en",
): Promise<string[]> {
  // Always ask for the search phrases in English, even for an Arabic
  // message: these terms are only used internally to search the product
  // catalog, whose subcategory/tags data is English-only, and never shown
  // to the user — the actual reply is generated separately in their language.
  const prompt =
    locale === "ar"
      ? `رسالة المستخدم (بالعربية): "${query}"\nإذا كانت هذه الرسالة تطلب توصية منتج، ملابس، عناية، منزل، مستلزمات أطفال، أو سفر (حتى لو لم تذكر اسم منتج معيّن)، اذكر 1 إلى 3 عبارات بحث قصيرة بالإنجليزية فقط (بحد أقصى كلمتين لكل عبارة) تصف المنتج أو المنتجات الفعلية التي تناسب طلبه، لأن هذه الكلمات تُستخدم للبحث في قاعدة بيانات إنجليزية ولن تظهر للمستخدم. مثال: "ماذا ألبس لحفل زفاف؟" -> evening dress, embroidered abaya. إن لم تكن الرسالة طلب منتج على الإطلاق (سؤال عام، تحية، سؤال عن الخدمة)، أجب بكلمة NONE فقط. أجب بقائمة إنجليزية مفصولة بفواصل أو NONE، بدون أي شرح.`
      : `User message: "${query}"\nIf this message is asking for a product, clothing, beauty, skincare, home, kids, or travel recommendation (even if it doesn't name a specific product), list 1 to 3 short search phrases (max 2 words each) describing the actual product(s) that would suit the request. Example: "what should I wear to a wedding?" -> evening dress, embroidered abaya. If the message is not a product request at all (general question, greeting, question about the service itself), reply with just NONE. Reply as a comma-separated list or NONE, no explanation.`;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!.trim(),
      timeout: 15_000,
      maxRetries: 0,
    });
    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }] as never,
      temperature: 0.3,
      max_tokens: 40,
    } as never);
    const text = (response as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "";
    if (!text.trim() || /^none$/i.test(text.trim())) return [];
    return text
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^none$/i.test(s))
      .slice(0, 3);
  } catch (error) {
    console.warn("[rag] search-term detection failed", error);
    return [];
  }
}

export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && !key.includes("REPLACE_WITH"));
}
