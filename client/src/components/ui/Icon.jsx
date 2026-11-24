// Inline stroke icons, 1.5px weight, no emojis anywhere in the UI.
const PATHS = {
  check: 'M5 13l4 4L19 7',
  chevronDown: 'M19 9l-7 7-7-7',
  chevronLeft: 'M15 19l-7-7 7-7',
  chevronRight: 'M9 5l7 7-7 7',
  x: 'M6 18L18 6M6 6l12 12',
  plus: 'M12 4v16m8-8H4',
  search: 'M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z',
  calendar: 'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  upload: 'M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  download: 'M12 4v12m0 0l-4-4m4 4l4-4M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1',
  file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5',
  table: 'M3 10h18M3 15h18M9 5v14M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z',
  pdf: 'M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM14 3v5h5M8 14h2a1.5 1.5 0 000-3H8v6',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash: 'M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-2-1.86L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  filter: 'M4 6h16M7 12h10m-7 6h4',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z',
  chat: 'M8 10h8m-8 4h5m-9 6l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z',
  send: 'M5 12l14-7-5 14-2.5-5.5L5 12z',
  refresh: 'M4 4v5h5M20 20v-5h-5M5.6 15A8 8 0 0018.4 9M18.4 9A8 8 0 005.6 15',
  trendUp: 'M3 17l6-6 4 4 8-8m0 0h-5m5 0v5',
  trendDown: 'M3 7l6 6 4-4 8 8m0 0h-5m5 0v-5',
  wallet: 'M3 7a2 2 0 012-2h13a1 1 0 011 1v2M3 7v10a2 2 0 002 2h14a1 1 0 001-1v-3M3 7h15a2 2 0 012 2v2m0 0h-4a2 2 0 100 4h4v-4z',
  minimize: 'M5 12h14',
  expand: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  inbox: 'M3 13l2-8h14l2 8M3 13v5a1 1 0 001 1h16a1 1 0 001-1v-5M3 13h5l1 2h6l1-2h5',
  clock: 'M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z',
}

export default function Icon({ name, size = 16, className = '', strokeWidth = 1.5, ...rest }) {
  const d = PATHS[name]
  if (!d) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
