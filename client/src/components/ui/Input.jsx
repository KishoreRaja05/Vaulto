import { forwardRef, useId } from 'react'

// Text-like input with optional label, leading icon, hint and error.
const Input = forwardRef(function Input(
  { label, hint, error, leadingIcon, className = '', wrapperClassName = '', id, ...rest },
  ref
) {
  const uid = useId()
  const inputId = id || uid
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leadingIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`vl-control px-3 placeholder:text-gray-400 ${leadingIcon ? 'pl-9' : ''} ${className}`}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
