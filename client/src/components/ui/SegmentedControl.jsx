import { useRef } from 'react'

// Equal-width segments so the sliding indicator is a pure translateX (no measuring).
export default function SegmentedControl({ options, value, onChange, 'aria-label': ariaLabel, size = 'md', className = '' }) {
  const refs = useRef([])
  const count = options.length
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  const onKeyDown = (e) => {
    let next
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % count
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + count) % count
    else return
    e.preventDefault()
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative grid ${size === 'sm' ? 'h-8' : 'h-10'} rounded-[10px] border border-gray-200 vl-muted-bg p-0.5 dark:border-gray-700 ${className}`}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-lg vl-seg-active transition-transform duration-200 ease-out"
        style={{
          width: `calc((100% - 4px) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((opt, i) => {
        const selected = i === index
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`vl-focus relative z-10 rounded-lg px-3 text-xs font-medium transition-colors duration-150 ${
              selected ? 'text-indigo-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
