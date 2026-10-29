import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "noBrain API Documentation",
  description: "Developer API for noBrain AI platform — Chat and Canvas endpoints",
}

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
