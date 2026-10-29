"use client"

import dynamic from "next/dynamic"

// Dynamically import ChatApp with ssr: false so that browser extensions
// (like Bitdefender injecting bis_skin_checked or Zed assistant) will never cause SSR hydration mismatches
const ChatApp = dynamic(
  () => import("@/components/chat/ChatApp").then((mod) => mod.ChatApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full bg-[#0d0d0d] items-center justify-center text-[#8e8e8e] text-xs select-none">
        <span className="font-mono text-sm tracking-tight text-white/80">noBrain</span>
      </div>
    ),
  }
)

export default function Page() {
  return <ChatApp />
}
