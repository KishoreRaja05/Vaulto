import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import usePWAInstall from '../hooks/usePWAInstall'

const DOWNLOAD_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M5 19h14" />
  </svg>
)

export default function InstallButton({ variant = 'menu', onAfterClick }) {
  const { dark } = useTheme()
  const { canInstall, showIOSHint, supportsPrompt, installing, install } = usePWAInstall()
  const [hint, setHint] = useState('')

  if (!canInstall && !showIOSHint && !supportsPrompt) return null

  const handleClick = async () => {
    setHint('')
    const accepted = await install()
    if (accepted) {
      onAfterClick?.()
      return
    }
    setHint(
      showIOSHint
        ? 'Tap the Share icon, then Add to Home Screen'
        : 'Use the install icon in your browser address bar to install Vaulto'
    )
  }

  const variantClass = {
    menu: `vl-focus flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
      dark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
    }`,
    sidebar: `vl-focus flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm transition-colors ${
      dark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
    }`,
    navbar: `vl-focus inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
      dark ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
    }`,
  }[variant]

  const labelClass = variant === 'navbar' ? 'hidden sm:inline' : variant === 'sidebar' ? 'vl-sidebar-label' : ''

  return (
    <div className={variant === 'navbar' ? 'inline-flex flex-col items-end' : 'w-full'}>
      <button
        type="button"
        role={variant === 'menu' ? 'menuitem' : undefined}
        onClick={handleClick}
        disabled={installing}
        aria-busy={installing || undefined}
        aria-label="Install app"
        title="Install app"
        className={`${variantClass} disabled:cursor-wait disabled:opacity-60`}
      >
        <span className="shrink-0 text-indigo-600 dark:text-indigo-300">{DOWNLOAD_ICON}</span>
        <span className={labelClass}>Install app</span>
      </button>
      {hint && (
        <p
          role="status"
          className={`mt-1.5 text-[11px] leading-snug ${dark ? 'text-amber-300' : 'text-amber-700'}`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
