import { Metadata } from "next"
import { CopilotApp } from "@/components/copilot/CopilotApp"

export const metadata: Metadata = {
  title: "Workspace Copilot | noBrain 1.5",
  description: "3D Autonomous AI Copilots and Multi-Bot Collaboration Room.",
}

export default async function WorkspaceCopilotPage(props: {
  params: Promise<{ code: string }>
}) {
  const { code } = await props.params
  return <CopilotApp initialCode={code} />
}

