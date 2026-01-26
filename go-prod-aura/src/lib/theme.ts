export type ThemeMode = 'dark' | 'light'

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme') as ThemeMode | null
  if (stored) return stored
  return 'dark'
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem('theme', mode)
  if (mode === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function toggleTheme(): ThemeMode {
  const current = getTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}
