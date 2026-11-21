import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const CSV_BOM = '\uFEFF'

export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisYear', label: 'This year' },
  { value: 'custom', label: 'Custom' },
]

const pad = (value) => String(value).padStart(2, '0')
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const getDateBounds = (preset, from, to) => {
  if (preset === 'custom') {
    if (from && to && from > to) return { from: '', to: '', invalid: true }
    return { from: from || '', to: to || '', invalid: false }
  }
  const now = new Date()
  if (preset === 'thisWeek') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffToMonday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - diffToMonday)
    return { from: ymd(start), to: ymd(now), invalid: false }
  }
  if (preset === 'thisMonth') {
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now), invalid: false }
  }
  if (preset === 'lastMonth') {
    return {
      from: ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
      invalid: false,
    }
  }
  if (preset === 'last30') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    start.setDate(start.getDate() - 30)
    return { from: ymd(start), to: ymd(now), invalid: false }
  }
  if (preset === 'thisYear') {
    return { from: ymd(new Date(now.getFullYear(), 0, 1)), to: ymd(now), invalid: false }
  }
  return { from: '', to: '', invalid: false }
}

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return dateStr
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export const getAppliedFilterMeta = ({
  searchInput = '',
  typeFilter = 'all',
  categoryFilter = '',
  datePreset = 'all',
  fromDate = '',
  toDate = '',
  sortBy = 'newest',
  dateBounds,
  totalCount = 0,
  filteredCount = 0,
}) => {
  const bounds = dateBounds || getDateBounds(datePreset, fromDate, toDate)
  const hasSearch = Boolean(String(searchInput || '').trim())
  const hasType = typeFilter && typeFilter !== 'all'
  const hasCategory = Boolean(categoryFilter)
  const hasDate = datePreset && datePreset !== 'all' && !bounds.invalid && (bounds.from || bounds.to)
  const hasCustomInvalid = datePreset === 'custom' && bounds.invalid
  const hasSort = sortBy && sortBy !== 'newest'
  const isFiltered = hasSearch || hasType || hasCategory || hasDate || hasCustomInvalid || hasSort || filteredCount !== totalCount

  const parts = []
  if (hasType) parts.push(`Type: ${typeFilter === 'income' ? 'Income' : 'Expense'}`)
  if (hasCategory) parts.push(`Category: ${categoryFilter}`)
  if (hasSearch) parts.push(`Search: "${String(searchInput).trim()}"`)
  if (datePreset === 'custom' && bounds.invalid) {
    parts.push('Date: invalid range')
  } else if (hasDate) {
    const fromLabel = bounds.from ? formatDisplayDate(bounds.from) : 'start'
    const toLabel = bounds.to ? formatDisplayDate(bounds.to) : 'today'
    if (datePreset === 'thisWeek') parts.push(`Date: This week (${fromLabel} to ${toLabel})`)
    else if (datePreset === 'thisMonth') parts.push(`Date: This month (${fromLabel} to ${toLabel})`)
    else if (datePreset === 'lastMonth') parts.push(`Date: Last month (${fromLabel} to ${toLabel})`)
    else if (datePreset === 'last30') parts.push(`Date: Last 30 days (${fromLabel} to ${toLabel})`)
    else if (datePreset === 'thisYear') parts.push(`Date: This year (${fromLabel} to ${toLabel})`)
    else parts.push(`Date: ${fromLabel} to ${toLabel}`)
  }
  if (sortBy === 'oldest') parts.push('Sort: Oldest first')
  if (sortBy === 'highest') parts.push('Sort: Highest amount')
  if (sortBy === 'lowest') parts.push('Sort: Lowest amount')

  const filterLine = parts.length ? parts.join(', ') : 'No filters'

  const nameParts = ['vaulto']
  if (hasType) nameParts.push(typeFilter)
  else nameParts.push('all')
  if (hasCategory) nameParts.push(slugify(categoryFilter))
  if (hasDate) {
    const from = bounds.from || 'start'
    const to = bounds.to || 'end'
    nameParts.push(`${from}_to_${to}`)
  }
  if (!hasType && !hasCategory && !hasDate && !hasSearch && !hasCustomInvalid) {
    // keep "vaulto-all" base when nothing specific; avoid empty extras
  } else if (hasSearch) {
    nameParts.push('search')
  }

  const baseName = (nameParts.length === 2 && nameParts[1] === 'all' && !hasSearch && !hasCustomInvalid)
    ? 'vaulto-all'
    : nameParts.join('-')

  const headerLabel = isFiltered
    ? `Export ${filteredCount} filtered transaction${filteredCount === 1 ? '' : 's'}`
    : `Export all ${filteredCount} transaction${filteredCount === 1 ? '' : 's'}`

  return {
    isFiltered,
    filterLine,
    baseName,
    headerLabel,
    bounds,
  }
}

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'item'

const sanitizeTextCell = (value) => {
  const text = value == null ? '' : String(value)
  if (/^[=+\-@]/.test(text)) return `'${text}`
  return text
}

const toDay = (dateValue) => {
  const text = String(dateValue || '')
  const day = text.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : text
}

const buildRows = (transactions) => transactions.map((t) => ({
  date: toDay(t.date),
  type: t.type === 'income' ? 'Income' : 'Expense',
  category: t.category || '',
  description: t.description || '',
  amount: Number(t.amount) || 0,
}))

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const escapeCsv = (value) => {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export const exportToCSV = (transactions, meta) => {
  const rows = buildRows(transactions)
  const header = ['Date', 'Type', 'Category', 'Description', 'Amount']
  const lines = [header.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push([
      escapeCsv(sanitizeTextCell(row.date)),
      escapeCsv(sanitizeTextCell(row.type)),
      escapeCsv(sanitizeTextCell(row.category)),
      escapeCsv(sanitizeTextCell(row.description)),
      escapeCsv(row.amount),
    ].join(','))
  }
  const csv = CSV_BOM + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${meta.baseName}.csv`)
}

export const exportToExcel = async (transactions, meta) => {
  const rows = buildRows(transactions)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Vaulto'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Transactions', { views: [{ state: 'frozen', ySplit: 1 }] })

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Description', key: 'description', width: 36 },
    { header: 'Amount', key: 'amount', width: 14 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  headerRow.alignment = { vertical: 'middle' }

  rows.forEach((row) => {
    const added = sheet.addRow({
      date: sanitizeTextCell(row.date),
      type: sanitizeTextCell(row.type),
      category: sanitizeTextCell(row.category),
      description: sanitizeTextCell(row.description),
      amount: row.amount,
    })
    added.getCell('amount').numFmt = '0.00'
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  triggerDownload(blob, `${meta.baseName}.xlsx`)
}

export const exportToPDF = (transactions, meta) => {
  const rows = buildRows(transactions)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const marginX = 40
  let y = 40

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(17, 24, 39)
  doc.text('Vaulto transactions', marginX, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  const filterLines = doc.splitTextToSize(meta.filterLine || 'No filters', 515)
  doc.text(filterLines, marginX, y)
  y += filterLines.length * 14 + 4
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, marginX, y)
  y += 14

  const body = rows.map((r) => [r.date, r.type, r.category, r.description, r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })])
  autoTable(doc, {
    startY: y + 6,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body,
    styles: { fontSize: 9, cellPadding: 6, textColor: [31, 41, 55] },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: marginX, right: marginX },
  })

  const income = rows.filter((r) => r.type === 'Income').reduce((sum, r) => sum + r.amount, 0)
  const expenses = rows.filter((r) => r.type === 'Expense').reduce((sum, r) => sum + r.amount, 0)
  const net = income - expenses

  let totalsY = (doc.lastAutoTable?.finalY || y) + 24
  const pageHeight = doc.internal.pageSize.getHeight()
  if (totalsY > pageHeight - 80) {
    doc.addPage()
    totalsY = 50
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text('Totals', marginX, totalsY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  doc.text(`Income: Rs. ${income.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX, totalsY + 18)
  doc.text(`Expenses: Rs. ${expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX, totalsY + 34)
  doc.text(`Net: Rs. ${net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, marginX, totalsY + 50)

  doc.save(`${meta.baseName}.pdf`)
}
