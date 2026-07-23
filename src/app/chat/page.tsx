"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useApp } from "@/components/providers/AppProviders";

function ChatLoading() {
  const { locale } = useApp();
  return (
    <div className="luxury-muted p-8 text-center">
      {locale === "ar" ? "جاري التحميل..." : "Loading..."}
    </div>
  );
}

export default function ChatPage() {
  return (
    <AppShell>
      <Suspense fallback={<ChatLoading />}>
        <ChatPanel />
      </Suspense>
    </AppShell>
  );
}
