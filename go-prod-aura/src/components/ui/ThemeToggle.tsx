import { useState, useEffect } from 'react'
import { getTheme, toggleTheme } from '../../lib/theme'
import { Icon } from './Icon'
import { Button } from './Button'

export function ThemeToggle() {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    setThemeState(getTheme())
  }, [])

  const handleToggle = () => {
    const newTheme = toggleTheme()
    setThemeState(newTheme)
  }

  return (
    <Button variant="secondary" onClick={handleToggle}>
      <Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={16} />
      {' '}
      {theme === 'dark' ? 'Clair' : 'Sombre'}
    </Button>
  )
}





