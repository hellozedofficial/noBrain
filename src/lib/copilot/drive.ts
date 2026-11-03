import "server-only"
import { getIntegration } from "./integrations"
import { execute } from "@/lib/db"
import { getRoomFiles, getBotFiles } from "./store"

interface DriveAuth {
  email: string
  accessToken: string
  refreshToken?: string
  provider: "drive" | "gmail"
}

export interface DriveFileItem {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  size?: string
  modifiedTime?: string
  parents?: string[]
}

/**
 * Retrieve valid Google Drive access token, automatically refreshing if needed.
 */
export async function getValidDriveAccessToken(userId: string): Promise<DriveAuth> {
  // Check drive integration first, fallback to gmail integration if it has Google OAuth tokens
  let integration = await getIntegration(userId, "drive")
  let provider: "drive" | "gmail" = "drive"

  if (!integration || integration.status !== "connected") {
    integration = await getIntegration(userId, "gmail")
    provider = "gmail"
  }

  if (!integration || integration.status !== "connected") {
    throw new Error("Google Drive integration is not connected. Connect Google Drive in Workspace Integrations first.")
  }

  const meta = integration.metadata || {}
  const email = integration.account_email || ""
  let accessToken = meta.access_token as string
  const refreshToken = meta.refresh_token as string

  // Token refresh logic
  if (refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    if (!accessToken || accessToken.startsWith("simulated_")) {
      try {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        })

        if (refreshRes.ok) {
          const tokenData = await refreshRes.json()
          accessToken = tokenData.access_token
          const updatedMeta = { ...meta, access_token: accessToken, refreshed_at: new Date().toISOString() }
          await execute(
            "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = ?",
            [JSON.stringify(updatedMeta), userId, provider]
          )
        }
      } catch (e) {
        console.warn("Could not proactively refresh Drive token:", e)
      }
    }
  }

  return { email, accessToken, refreshToken, provider }
}

/**
 * Authenticated fetch to Google Drive API with automatic 401 token refresh retry.
 */
async function callDriveApi(
  userId: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  let auth = await getValidDriveAccessToken(userId)

  let res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${auth.accessToken}`,
    },
  })

  // Retry on 401 Unauthorized
  if (res.status === 401 && auth.refreshToken && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: auth.refreshToken,
          grant_type: "refresh_token",
        }),
      })

      if (refreshRes.ok) {
        const tokenData = await refreshRes.json()
        const newAccessToken = tokenData.access_token

        const integration = await getIntegration(userId, auth.provider)
        const updatedMeta = {
          ...(integration?.metadata || {}),
          access_token: newAccessToken,
          refreshed_at: new Date().toISOString(),
        }
        await execute(
          "UPDATE copilot_integrations SET metadata = ?, updated_at = NOW() WHERE user_id = ? AND provider = ?",
          [JSON.stringify(updatedMeta), userId, auth.provider]
        )

        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          },
        })
      }
    } catch (e) {
      console.error("Drive token refresh failed:", e)
    }
  }

  return res
}

// 1. Search & List Drive Files
export async function searchDriveFiles(
  userId: string,
  query = "",
  maxResults = 10
): Promise<{ files: DriveFileItem[]; total: number }> {
  let q = "trashed = false"
  if (query && query.trim()) {
    const cleanQ = query.trim()
    if (cleanQ.includes("=") || cleanQ.includes("contains")) {
      q = `(${cleanQ}) and trashed = false`
    } else {
      q = `name contains '${cleanQ.replace(/'/g, "\\'")}' and trashed = false`
    }
  }

  const params = new URLSearchParams({
    q,
    pageSize: String(Math.min(maxResults, 25)),
    fields: "files(id, name, mimeType, webViewLink, size, modifiedTime, parents)",
    orderBy: "modifiedTime desc",
  })

  const res = await callDriveApi(
    userId,
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Google Drive search error (${res.status}): ${errorText}`)
  }

  const data = await res.json()
  const filesList = (data.files || []).map((f: any) => ({
    ...f,
    webViewLink:
      f.webViewLink ||
      (f.mimeType === "application/vnd.google-apps.folder"
        ? `https://drive.google.com/drive/folders/${f.id}`
        : `https://drive.google.com/file/d/${f.id}/view`),
  }))

  return {
    files: filesList,
    total: filesList.length,
  }
}

// 2. Read Full File Content
export async function readDriveFile(
  userId: string,
  fileId: string
): Promise<{ id: string; name: string; mimeType: string; webViewLink?: string; content: string }> {
  // First, get metadata to check mimeType
  const metaRes = await callDriveApi(
    userId,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink`
  )

  if (!metaRes.ok) {
    throw new Error(`Drive file not found or inaccessible (${metaRes.status})`)
  }

  const meta = await metaRes.json()
  const mime = meta.mimeType || ""
  let content = ""

  // If Google Docs, export to plain text / markdown
  if (mime === "application/vnd.google-apps.document") {
    const exportRes = await callDriveApi(
      userId,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/plain`
    )
    if (exportRes.ok) {
      content = await exportRes.text()
    }
  } else if (mime === "application/vnd.google-apps.spreadsheet") {
    const exportRes = await callDriveApi(
      userId,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=text/csv`
    )
    if (exportRes.ok) {
      content = await exportRes.text()
    }
  } else {
    // Normal text/markdown/code/json media download
    const mediaRes = await callDriveApi(
      userId,
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
    )
    if (mediaRes.ok) {
      content = await mediaRes.text()
    } else {
      content = `[Binary file or export not supported for mimeType: ${mime}]`
    }
  }

  return {
    id: meta.id,
    name: meta.name,
    mimeType: meta.mimeType,
    webViewLink: meta.webViewLink,
    content: content.slice(0, 10000), // Protect context limit
  }
}

// 3. Create or Upload File to Google Drive
export async function createDriveFile(
  userId: string,
  params: {
    name: string
    content: string
    folderId?: string
    mimeType?: string
  }
): Promise<DriveFileItem> {
  const boundary = "-------nobrain_drive_boundary_" + Date.now()
  const mimeType = params.mimeType || (params.name.endsWith(".md") ? "text/markdown" : "text/plain")

  const metadata: any = {
    name: params.name,
    mimeType,
  }
  if (params.folderId) {
    metadata.parents = [params.folderId]
  }

  const multipartBody =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n` +
    params.content +
    `\r\n--${boundary}--`

  const res = await callDriveApi(
    userId,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create Google Drive file (${res.status}): ${errorText}`)
  }

  const createdFile = await res.json()

  // Set public view permission
  try {
    await callDriveApi(userId, `https://www.googleapis.com/drive/v3/files/${createdFile.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })
  } catch {}

  return {
    ...createdFile,
    webViewLink: createdFile.webViewLink || `https://drive.google.com/file/d/${createdFile.id}/view`,
  }
}

// 4. Create Folder in Google Drive
export async function createDriveFolder(
  userId: string,
  name: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const res = await callDriveApi(userId, "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create Google Drive folder (${res.status}): ${errorText}`)
  }

  const folder = await res.json()

  // Make folder viewable via web link
  try {
    await callDriveApi(userId, `https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })
  } catch (permErr) {
    console.warn("Could not set anyone permission on created folder:", permErr)
  }

  return {
    ...folder,
    webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
  }
}

// 4b. Resolve Target Drive Folder (by ID, exact name, or defaults to "noBrain")
export async function resolveTargetDriveFolder(
  userId: string,
  folderNameOrId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  if (folderNameOrId && folderNameOrId.trim()) {
    const target = folderNameOrId.trim()

    // 1. If it looks like a Google Drive ID (e.g. 1G38R1NTwFfy0LM_JKIL2qpIQh3AgJRNB)
    if (/^[a-zA-Z0-9_-]{20,}$/.test(target)) {
      try {
        const res = await callDriveApi(
          userId,
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target)}?fields=id,name,mimeType,webViewLink`
        )
        if (res.ok) {
          const folderMeta = await res.json()
          if (folderMeta.mimeType === "application/vnd.google-apps.folder") {
            return {
              id: folderMeta.id,
              name: folderMeta.name,
              webViewLink: folderMeta.webViewLink || `https://drive.google.com/drive/folders/${folderMeta.id}`,
            }
          }
        }
      } catch (err) {
        console.warn("[resolveTargetDriveFolder] Could not verify by ID:", err)
      }
    }

    // 2. Search for existing folder by name
    const folderSearch = await searchDriveFiles(
      userId,
      `mimeType = 'application/vnd.google-apps.folder' and name = '${target.replace(/'/g, "\\'")}'`
    )
    if (folderSearch.files.length > 0) {
      const f = folderSearch.files[0]
      return {
        id: f.id,
        name: f.name,
        webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      }
    }

    // 3. Folder does not exist yet -> create it
    const newFolder = await createDriveFolder(userId, target)
    return {
      id: newFolder.id,
      name: newFolder.name,
      webViewLink: newFolder.webViewLink || `https://drive.google.com/drive/folders/${newFolder.id}`,
    }
  }

  // 4. Default: Find "noBrain" or "noBrain Workspace", or create "noBrain"
  const defaultSearch = await searchDriveFiles(
    userId,
    `mimeType = 'application/vnd.google-apps.folder' and (name = 'noBrain' or name = 'noBrain Workspace')`
  )
  if (defaultSearch.files.length > 0) {
    const f = defaultSearch.files[0]
    return {
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
    }
  }

  const created = await createDriveFolder(userId, "noBrain")
  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  }
}

// 5. Sync / Export Single Workspace File to Google Drive
export async function syncWorkspaceFileToDrive(
  userId: string,
  targetContext: { roomId?: string | null; botId?: string | null },
  workspacePath: string,
  folderNameOrId = "noBrain"
): Promise<{ success: boolean; file: DriveFileItem; folderName: string; webViewLink: string }> {
  // Step 1: Read the workspace file from copilot database
  const files = targetContext.roomId
    ? await getRoomFiles(targetContext.roomId, userId)
    : targetContext.botId
    ? await getBotFiles(targetContext.botId, userId)
    : []

  const targetFile = files.find(
    (f) => f.file_path.toLowerCase() === workspacePath.toLowerCase().replace(/^\/+/, "")
  )

  if (!targetFile) {
    throw new Error(
      `Workspace file "${workspacePath}" not found in current copilot files. Available files: ${files
        .map((x) => x.file_path)
        .join(", ")}`
    )
  }

  // Step 2: Resolve target folder in Google Drive
  const targetFolder = await resolveTargetDriveFolder(userId, folderNameOrId)

  // Step 3: Check if file already exists in this folder to avoid duplicates
  const existingFileSearch = await searchDriveFiles(
    userId,
    `'${targetFolder.id}' in parents and name = '${targetFile.file_path.replace(/'/g, "\\'")}'`
  )

  let driveFileResult: DriveFileItem
  if (existingFileSearch.files.length > 0) {
    // Update existing file content
    const existingFileId = existingFileSearch.files[0].id
    const patchRes = await callDriveApi(
      userId,
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media&fields=id,name,mimeType,webViewLink`,
      {
        method: "PATCH",
        headers: { "Content-Type": "text/markdown; charset=UTF-8" },
        body: targetFile.content,
      }
    )
    if (!patchRes.ok) {
      throw new Error(`Failed to update Drive file: ${await patchRes.text()}`)
    }
    driveFileResult = await patchRes.json()
  } else {
    // Create new file inside folder
    driveFileResult = await createDriveFile(userId, {
      name: targetFile.file_path,
      content: targetFile.content,
      folderId: targetFolder.id,
      mimeType: "text/markdown",
    })
  }

  // Set public view permission on synced file
  try {
    await callDriveApi(userId, `https://www.googleapis.com/drive/v3/files/${driveFileResult.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })
  } catch {}

  const finalLink = driveFileResult.webViewLink || `https://drive.google.com/file/d/${driveFileResult.id}/view`

  return {
    success: true,
    file: {
      ...driveFileResult,
      webViewLink: finalLink,
    },
    folderName: targetFolder.name,
    webViewLink: finalLink,
  }
}

// 5b. Sync / Upload ALL Workspace Files to Google Drive at once
export async function syncAllWorkspaceFilesToDrive(
  userId: string,
  targetContext: { roomId?: string | null; botId?: string | null },
  folderNameOrId?: string
): Promise<{
  success: boolean
  folder: { id: string; name: string; webViewLink: string }
  files: Array<{ name: string; id: string; webViewLink: string; status: "created" | "updated" }>
  total: number
}> {
  // Step 1: Read all workspace files from copilot database
  const files = targetContext.roomId
    ? await getRoomFiles(targetContext.roomId, userId)
    : targetContext.botId
    ? await getBotFiles(targetContext.botId, userId)
    : []

  if (!files || files.length === 0) {
    throw new Error("No workspace files found in current copilot workspace to upload.")
  }

  // Step 2: Resolve target folder in Google Drive
  const targetFolder = await resolveTargetDriveFolder(userId, folderNameOrId)

  // Step 3: For each workspace file, upload or patch inside target folder
  const uploadedFiles: Array<{ name: string; id: string; webViewLink: string; status: "created" | "updated" }> = []

  for (const f of files) {
    const fileName = f.file_path.replace(/^\/+/, "")
    const content = f.content || ""

    const existingSearch = await searchDriveFiles(
      userId,
      `'${targetFolder.id}' in parents and name = '${fileName.replace(/'/g, "\\'")}'`
    )

    let fileItem: DriveFileItem
    let status: "created" | "updated" = "created"

    if (existingSearch.files.length > 0) {
      status = "updated"
      const existingId = existingSearch.files[0].id
      const patchRes = await callDriveApi(
        userId,
        `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media&fields=id,name,mimeType,webViewLink`,
        {
          method: "PATCH",
          headers: { "Content-Type": "text/markdown; charset=UTF-8" },
          body: content,
        }
      )
      if (!patchRes.ok) {
        throw new Error(`Failed to update Drive file ${fileName}: ${await patchRes.text()}`)
      }
      fileItem = await patchRes.json()
    } else {
      fileItem = await createDriveFile(userId, {
        name: fileName,
        content: content,
        folderId: targetFolder.id,
        mimeType: fileName.endsWith(".md") ? "text/markdown" : "text/plain",
      })
    }

    // Ensure public view permission
    try {
      await callDriveApi(userId, `https://www.googleapis.com/drive/v3/files/${fileItem.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      })
    } catch {}

    const link = fileItem.webViewLink || `https://drive.google.com/file/d/${fileItem.id}/view`
    uploadedFiles.push({
      name: fileName,
      id: fileItem.id,
      webViewLink: link,
      status,
    })
  }

  return {
    success: true,
    folder: targetFolder,
    files: uploadedFiles,
    total: uploadedFiles.length,
  }
}

// 6. Share Google Drive File & Generate Web Link
export async function shareDriveFile(
  userId: string,
  params: {
    fileId: string
    role?: "reader" | "commenter" | "writer"
    type?: "anyone" | "user"
    email?: string
  }
): Promise<{ success: boolean; webViewLink: string; role: string; type: string }> {
  const role = params.role || "reader"
  const type = params.type || "anyone"

  const permBody: any = { role, type }
  if (type === "user" && params.email) {
    permBody.emailAddress = params.email
  }

  const res = await callDriveApi(
    userId,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(params.fileId)}/permissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(permBody),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Drive share error (${res.status}): ${errorText}`)
  }

  // Fetch file's webViewLink
  const metaRes = await callDriveApi(
    userId,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(params.fileId)}?fields=webViewLink`
  )
  const meta = await metaRes.json()

  return {
    success: true,
    webViewLink: meta.webViewLink || "",
    role,
    type,
  }
}

// 7. Trash File or Folder
export async function trashDriveFile(
  userId: string,
  fileId: string
): Promise<{ success: boolean; fileId: string }> {
  const res = await callDriveApi(
    userId,
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true }),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to trash file (${res.status}): ${errorText}`)
  }

  return { success: true, fileId }
}

