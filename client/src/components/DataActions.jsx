import Button from './ui/Button'
import Icon from './ui/Icon'
import ExportMenu from './ExportMenu'

// Import + Export as one compact group instead of two unrelated buttons.
export default function DataActions({ onImport, allTransactions, filteredTransactions, filterMeta }) {
  return (
    <div role="group" aria-label="Data" className="inline-flex h-10 items-stretch divide-x divide-gray-300 overflow-hidden rounded-[10px] border border-gray-300 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
      <Button variant="seg" size="fill" onClick={onImport} leftIcon={<Icon name="upload" size={16} />}>
        Import
      </Button>
      <ExportMenu
        allTransactions={allTransactions}
        filteredTransactions={filteredTransactions}
        filterMeta={filterMeta}
        triggerVariant="seg"
      />
    </div>
  )
}
