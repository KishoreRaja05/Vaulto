import Icon from './Icon'

export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300">
        <Icon name={icon} size={24} />
      </div>
      <p className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
      {description && <p className="mb-4 max-w-xs text-xs text-gray-500">{description}</p>}
      {action}
    </div>
  )
}
