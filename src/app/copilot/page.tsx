import { Metadata } from "next"
import { CopilotApp } from "@/components/copilot/CopilotApp"

export const metadata: Metadata = {
  title: "noBrain Copilot | AI Workspace",
  description: "Collaborative 3D AI Robot Agents with dedicated workspaces and multi-bot rooms.",
}

export default function CopilotPage() {
  return <CopilotApp />
}

