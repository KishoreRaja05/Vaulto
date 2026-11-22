import { forwardRef } from 'react'

// Full static class names (Tailwind v4 purges string-built ones).
const VARIANTS = {
  primary: 'rounded-[10px] bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent',
  secondary: 'rounded-[10px] bg-white text-gray-700 border border-gray-300 hover:border-indigo-300 hover:text-indigo-700 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:border-indigo-500 dark:hover:text-white',
  ghost: 'rounded-[10px] bg-transparent text-gray-600 border border-transparent hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  danger: 'rounded-[10px] bg-red-600 text-white hover:bg-red-700 border border-transparent',
  seg: 'rounded-none border-0 bg-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  icon: 'h-9 w-9 text-sm',
  fill: 'h-full px-4 text-sm gap-2',
}

const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, leftIcon, className = '', children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`vl-focus inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : leftIcon}
      {children}
    </button>
  )
})

export default Button
