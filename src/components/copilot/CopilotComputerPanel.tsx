"use client"

import React, { useState, useEffect } from "react"
import {
  FileText,
  FolderOpen,
  Brain,
  Terminal,
  Save,
  Eye,
  Edit3,
  Columns2,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react"
import { CopilotBot, CopilotRoom, CopilotFile } from "@/lib/copilot/types"
import { RaisedButton } from "@/components/ui/raised-button"
import { Markdown } from "@/components/ui/markdown"
import { rareToast } from "@/components/ui/rare-toast"
import { ConfirmModal } from "@/components/ui/confirm-modal"

interface ComputerPanelProps {
  bot?: CopilotBot | null
  room?: CopilotRoom | null
  files: CopilotFile[]
  onSaveFile?: (path: string, content: string) => void
  onDeleteFile?: (fileId: string) => void
}

type TabType = "workspace" | "memory"
type ViewMode = "preview" | "edit" | "split"

export function CopilotComputerPanel({
  bot,
  room,
  files,
  onSaveFile,
  onDeleteFile,
}: ComputerPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("workspace")
  const [selectedFileId, setSelectedFileId] = useState<string | null>(files[0]?.id || null)
  const [fileContent, setFileContent] = useState<string>(files[0]?.content || "")
  const [viewMode, setViewMode] = useState<ViewMode>("preview")
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [copied, setCopied] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Keep selected file in sync with files prop
  useEffect(() => {
    if (files.length === 0) {
      setSelectedFileId(null)
      setFileContent("")
      return
    }

    const current = files.find((f) => f.id === selectedFileId)
    if (current) {
      // If content on server changed (e.g. bot wrote file), update content
      setFileContent((prev) => (prev === current.content ? prev : current.content))
    } else {
      setSelectedFileId(files[0].id)
      setFileContent(files[0].content)
    }
  }, [files, selectedFileId])

  const selectedFile = files.find((f) => f.id === selectedFileId) || null
  const isDirty = selectedFile ? fileContent !== selectedFile.content : false

  const handleSelectFile = (f: CopilotFile) => {
    setSelectedFileId(f.id)
    setFileContent(f.content)
  }

  const handleSaveCurrentFile = () => {
    if (!selectedFile || !onSaveFile) return
    onSaveFile(selectedFile.file_path, fileContent)
    rareToast.success("File Saved", `${selectedFile.file_path} updated in workspace`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault()
      handleSaveCurrentFile()
    }
  }

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFileName.trim() || !onSaveFile) return

    let cleanName = newFileName.trim().replace(/^\/+/, "")
    if (!cleanName.includes(".")) cleanName += ".md"

    const defaultContent = `# ${cleanName}\n\nDrafted by user. Real-time markdown workspace.`
    onSaveFile(cleanName, defaultContent)
    setIsCreatingFile(false)
    setNewFileName("")
    setViewMode("edit")
    rareToast.success("Created File", cleanName)
  }

  const handleDeleteCurrentFile = () => {
    if (!selectedFile || !onDeleteFile) return
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDeleteFile = () => {
    if (!selectedFile || !onDeleteFile) return
    onDeleteFile(selectedFile.id)
    setIsDeleteModalOpen(false)
    rareToast.info("Deleted", selectedFile.file_path)
  }

  const handleCopyContent = () => {
    if (!fileContent) return
    navigator.clipboard.writeText(fileContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const title = room ? `${room.name} Squad Files` : bot ? `${bot.name} Workspace` : "Workspace Files"

  return (
    <div
      onKeyDown={handleKeyDown}
      className="flex flex-col h-full bg-zinc-50/80 dark:bg-[#121212] select-none text-foreground border-l border-zinc-200/50 dark:border-zinc-800/50"
    >
      {/* Top Header & Tab switcher */}
      <div className="h-16 px-4 flex items-center justify-between shrink-0 border-b border-zinc-200/40 dark:border-zinc-800/40 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("workspace")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "workspace"
                ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Files</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60 font-mono font-medium">
              {files.length}
            </span>
          </button>

          {bot && (
            <button
              onClick={() => setActiveTab("memory")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "memory"
                  ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Memory</span>
            </button>
          )}
        </div>

        {/* View mode toggle (Preview | Edit | Split) */}
        {activeTab === "workspace" && selectedFile && (
          <div className="flex items-center bg-zinc-200/70 dark:bg-zinc-800/70 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "preview"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="Markdown Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="Text Editor"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer max-sm:hidden ${
                viewMode === "split"
                  ? "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title="Split View (Editor + Live Preview)"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Workspace Content */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col p-3 pt-2">
        {activeTab === "workspace" && (
          <div className="h-full flex flex-col space-y-2.5 min-h-0">
            {/* File explorer pill bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer font-medium ${
                    selectedFile?.id === file.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                      : "bg-zinc-200/60 text-zinc-600 hover:text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{file.file_path}</span>
                  {selectedFile?.id === file.id && isDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              ))}

              {/* + New file pill */}
              <button
                type="button"
                onClick={() => setIsCreatingFile(!isCreatingFile)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer shrink-0"
                title="Create new markdown file"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Inline new file input */}
            {isCreatingFile && (
              <form
                onSubmit={handleCreateNewFile}
                className="flex items-center gap-2 p-2 rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 shrink-0 animate-in fade-in duration-150"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. startup-plan.md, tasks.md"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg outline-none font-mono"
                />
                <RaisedButton size="sm" variant="primary" type="submit" className="!h-7 !px-2.5 !text-xs">
                  Create
                </RaisedButton>
                <button
                  type="button"
                  onClick={() => setIsCreatingFile(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-1 cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Main File Viewer / Editor Card */}
            <div className="flex-1 flex flex-col min-h-0 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              {selectedFile ? (
                <>
                  {/* Action Bar */}
                  <div className="h-10 px-3.5 flex items-center justify-between shrink-0 bg-zinc-100/70 dark:bg-zinc-800/50 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200 truncate">
                        {selectedFile.file_path}
                      </span>
                      {isDirty && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-medium">
                          Unsaved
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyContent}
                        title="Copy content"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {onDeleteFile && files.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDeleteCurrentFile}
                          title="Delete file"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <RaisedButton
                        size="sm"
                        variant={isDirty ? "primary" : "secondary"}
                        onClick={handleSaveCurrentFile}
                        className="!h-7 !px-2.5 !text-xs !gap-1"
                        title="Save file (Cmd+S / Ctrl+S)"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </RaisedButton>
                    </div>
                  </div>

                  {/* Body: Preview / Edit / Split */}
                  <div className="flex-1 overflow-hidden min-h-0 flex">
                    {/* Mode: Preview Only */}
                    {viewMode === "preview" && (
                      <div className="flex-1 overflow-y-auto p-4 select-text">
                        {fileContent.trim() ? (
                          <Markdown className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                            {fileContent}
                          </Markdown>
                        ) : (
                          <div className="text-xs text-zinc-400 italic p-4 text-center">
                            File is empty. Switch to editor to write.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mode: Edit Only */}
                    {viewMode === "edit" && (
                      <textarea
                        value={fileContent}
                        onChange={(e) => setFileContent(e.target.value)}
                        className="flex-1 p-3.5 font-mono text-xs bg-transparent border-none outline-none resize-none leading-relaxed text-zinc-900 dark:text-zinc-100 select-text font-normal"
                        placeholder="Write markdown here..."
                        spellCheck={false}
                      />
                    )}

                    {/* Mode: Split (Live Editor + Live Markdown Preview) */}
                    {viewMode === "split" && (
                      <div className="flex-1 flex min-h-0">
                        <textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="w-1/2 p-3.5 font-mono text-xs bg-transparent border-r border-zinc-200/60 dark:border-zinc-800/60 outline-none resize-none leading-relaxed text-zinc-900 dark:text-zinc-100 select-text font-normal"
                          placeholder="Write markdown here..."
                          spellCheck={false}
                        />
                        <div className="w-1/2 overflow-y-auto p-4 select-text bg-zinc-50/50 dark:bg-zinc-950/40">
                          <Markdown className="text-xs sm:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                            {fileContent || "*Empty file*"}
                          </Markdown>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs p-6 text-center">
                  <Terminal className="w-8 h-8 mb-2 opacity-40" />
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">No workspace file selected</span>
                  <p className="text-[11px] mt-1 max-w-xs text-zinc-400">
                    When copilot teammates create plans or task backlogs, they will appear here. You can also click + New to create one now.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Memory Tab (For individual bots) */}
        {activeTab === "memory" && bot && (
          <div className="p-2 space-y-3 overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Long-Term Memory</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Facts, project rules, and instructions {bot.name} remembers permanently across conversations.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed min-h-[120px] shadow-sm font-sans select-text">
              {bot.memory || "No memories stored yet. Mention key facts in chat to record."}
            </div>
          </div>
        )}
      </div>

      {/* Delete File Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete File"
        description={`Are you sure you want to delete "${selectedFile?.file_path}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDeleteFile}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  )
}
