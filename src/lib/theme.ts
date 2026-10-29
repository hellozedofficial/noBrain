"use client"

export type ThemeMode = "system" | "dark" | "light"

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system"
  return (localStorage.getItem("nobrain_theme") as ThemeMode) || "system"
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return

  const root = document.documentElement
  root.classList.remove("dark", "light")

  if (theme === "system") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    root.classList.add(systemDark ? "dark" : "light")
  } else {
    root.classList.add(theme)
  }
}

export function setStoredTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return
  localStorage.setItem("nobrain_theme", theme)
  applyTheme(theme)
}

export function getStoredSidebarOpen(): boolean {
  if (typeof window === "undefined") return true
  if (window.innerWidth < 768) {
    return false
  }
  const stored = localStorage.getItem("nobrain_sidebar_open")
  if (stored === null) return true
  return stored === "true"
}

export function setStoredSidebarOpen(isOpen: boolean) {
  if (typeof window === "undefined") return
  if (window.innerWidth >= 768) {
    localStorage.setItem("nobrain_sidebar_open", String(isOpen))
  }
}
