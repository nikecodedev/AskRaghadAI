"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/components/providers/AppProviders";
import { ChatProductCard } from "@/components/chat/ChatProductCard";
import {
  CategorySuggestions,
  ChatMessageContent,
} from "@/components/chat/ChatMessageContent";
import { exportChatToPdf } from "@/lib/pdf/export-chat";
import { prepareChatDisplayText } from "@/lib/text/normalize";
import type { ChatProduct } from "@/lib/products/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  products?: ChatProduct[];
  suggestCategories?: boolean;
};

/* Minimal typing for the browser Web Speech API (Chrome/Edge/Safari). */
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function ChatPanel() {
  const { messages, locale, dir } = useApp();
  const searchParams = useSearchParams();
  const [input, setInput] = useState(() => searchParams.get("q") ?? "");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const category = searchParams.get("category") ?? undefined;
  const [exportingPdf, setExportingPdf] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const actionHandled = useRef(false);
  const autoSentRequest = useRef<string | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputPlaceholder =
    locale === "ar" ? messages.chat.placeholder : messages.chat.placeholder;

  const startVoice = () => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert(messages.chat.voiceUnsupported);
      return;
    }
    recognition.lang = locale === "ar" ? "ar-SA" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const readImageFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  // Trigger action requested from the homepage icons (voice / camera / file).
  useEffect(() => {
    if (actionHandled.current) return;
    const action = searchParams.get("action");
    if (!action) return;
    actionHandled.current = true;
    const t = setTimeout(() => {
      if (action === "voice") startVoice();
      else if (action === "camera") cameraInputRef.current?.click();
      else if (action === "file") fileInputRef.current?.click();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const scrollActiveField = () => {
      window.setTimeout(() => {
        inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        formRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
      }, 250);
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", scrollActiveField);
    return () => viewport?.removeEventListener("resize", scrollActiveField);
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setHistory((previous) => {
      const next = [...previous, message];
      historyRef.current = next;
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (options?: {
    query?: string;
    category?: string;
  }) => {
    const userMessage = (options?.query ?? input).trim();
    const requestCategory = options?.category ?? category;
    if ((!userMessage && !image) || loading) return;
    const userImage = image;
    setInput("");
    setImage(null);
    appendMessage({
      role: "user",
      content: userMessage,
      image: userImage ?? undefined,
    });
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage,
          locale,
          category: requestCategory,
          image: userImage,
        }),
      });
      const data = await res.json();
      appendMessage({
        role: "assistant",
        content: data.answer ?? data.error ?? "Error",
        products: data.products,
        suggestCategories: data.suggestCategories,
      });
    } catch {
      appendMessage({
        role: "assistant",
        content:
          locale === "ar"
            ? "عذراً، حدث خطأ تقني بسيط. يسعدني مساعدتك — جرّب إعادة إرسال سؤالك وسأكون معك."
            : "Sorry, a small technical issue occurred. I'm still here to help — try sending your question again.",
        suggestCategories: true,
      });
    } finally {
      setLoading(false);
    }
  }, [appendMessage, category, image, input, loading, locale]);

  // A homepage search is a one-click action: clear any prior thread, then
  // submit immediately. `request` makes repeating the same query a new action
  // so PDF export never mixes an older conversation with the active one.
  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    const cat = searchParams.get("category") ?? undefined;
    if (!q) return;
    if (searchParams.get("send") !== "1") return;

    const requestKey = searchParams.get("request") ?? `${q}|${cat ?? ""}`;
    if (autoSentRequest.current === requestKey) return;
    autoSentRequest.current = requestKey;
    historyRef.current = [];
    setHistory([]);
    void sendMessage({ query: q, category: cat });
  }, [searchParams, sendMessage]);

  const exportPdf = async () => {
    if (exportingPdf || history.length === 0) return;
    setExportingPdf(true);
    try {
      await exportChatToPdf({
        history: historyRef.current.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        locale,
        labels: {
          title: messages.chat.pdfTitle,
          user: messages.chat.pdfUser,
          assistant: messages.chat.pdfAssistant,
        },
      });
    } catch (error) {
      console.error("[chat] PDF export failed", error);
      alert(
        locale === "ar"
          ? "تعذر تصدير PDF. يرجى المحاولة مرة أخرى."
          : "Could not export PDF. Please try again."
      );
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="luxury-page mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]" dir={dir}>
      <div className="flex items-center justify-between gap-3">
        <h1 className="luxury-heading-section text-2xl sm:text-3xl">{messages.chat.title}</h1>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={exportingPdf}
            className="luxury-card luxury-muted shrink-0 px-3 py-2 text-base transition hover:bg-white disabled:opacity-60"
          >
            {exportingPdf ? messages.chat.exportingPdf : messages.chat.exportPdf}
          </button>
        )}
      </div>

      <div className="min-h-[360px] luxury-card p-5 sm:p-6">
        {history.length === 0 ? (
          <p className="chat-message-body luxury-muted text-center leading-8" dir={dir}>
            {messages.chat.welcome}
          </p>
        ) : (
          <div className="space-y-4">
            {history.map((msg, i) => (
              <div key={i}>
                <div
                  className={`chat-bubble-${msg.role} chat-message-body rounded-xl px-4 py-3.5 text-base leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#2c6e55]/10 font-medium text-[#1f5240]"
                      : "bg-white font-medium text-[#24332c]"
                  }`}
                  dir={dir}
                >
                  {msg.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.image}
                      alt="attachment"
                      className="mb-2 max-h-48 rounded-lg border border-[#ddd0b8]/60 object-cover"
                    />
                  )}
                  {msg.role === "user" ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <ChatMessageContent
                      content={prepareChatDisplayText(msg.content, locale)}
                      linkLabel={messages.chat.visitLink}
                      dir={dir}
                    />
                  )}
                </div>
                {msg.suggestCategories && (
                  <div className="chat-bubble-assistant">
                    <CategorySuggestions
                      locale={locale}
                      title={messages.chat.browseCategories}
                    />
                  </div>
                )}
                {msg.products && msg.products.length > 0 && (
                  <div className="chat-bubble-assistant mt-3 grid gap-3 sm:grid-cols-2">
                    {msg.products.map((p) => (
                      <ChatProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-assistant flex items-center gap-2 rounded-xl bg-white px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2c6e55] [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2c6e55] [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#2c6e55]" />
              </div>
            )}
          </div>
        )}
      </div>

      {image && (
        <div className="flex items-center gap-3 rounded-xl border border-[#ddd0b8]/60 bg-white/70 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="preview" className="h-14 w-14 rounded-lg object-cover" />
          <span className="flex-1 text-xs text-[#7a8b82]">{messages.chat.imageAttached}</span>
          <button
            type="button"
            onClick={() => setImage(null)}
            className="rounded-full px-2 py-1 text-xs text-[#a05a4a] hover:bg-[#f3ece0]"
          >
            {messages.nav.close}
          </button>
        </div>
      )}

      <form
        ref={formRef}
        className="luxury-search-bar sticky bottom-0 z-20 bg-[#f3ece0]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
      >
        <div className="luxury-search-inner gap-2">
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            aria-label={messages.hero.voice}
            title={messages.hero.voice}
            className={`shrink-0 rounded-full p-2 transition ${
              listening
                ? "bg-[#a05a4a] text-white"
                : "text-[#2c6e55] hover:bg-[#2c6e55]/10"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-label={messages.hero.camera}
            title={messages.hero.camera}
            className="shrink-0 rounded-full p-2 text-[#2c6e55] transition hover:bg-[#2c6e55]/10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={messages.hero.file}
            title={messages.hero.file}
            className="shrink-0 rounded-full p-2 text-[#2c6e55] transition hover:bg-[#2c6e55]/10"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => {
              window.setTimeout(() => {
                inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
              }, 300);
            }}
            placeholder={inputPlaceholder}
            dir={dir}
            aria-label={messages.chat.title}
            className="min-w-0 flex-1 bg-transparent text-lg font-medium text-[#3d4f45] outline-none placeholder:text-[#5f6d63] sm:text-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-full bg-gradient-to-b from-[#2c6e55] to-[#1f5240] px-5 py-2.5 text-base font-semibold text-white shadow-[0_2px_10px_rgba(31,82,64,0.4)] transition hover:from-[#337d61] hover:to-[#24614b] disabled:opacity-50"
          >
            {loading ? "..." : messages.chat.send}
          </button>
        </div>
      </form>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => readImageFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => readImageFile(e.target.files?.[0])}
      />
    </div>
  );
}
