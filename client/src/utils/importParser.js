// Pure helpers for the import flow: parse CSV / XLSX in the browser, detect
// columns, clean values, validate rows. No React in here so it is easy to test.

// pandas / spreadsheet exports write missing cells as "nan", "NaN", "null"...
const BLANKS = new Set(['', 'nan', 'null', 'none', 'n/a', 'na', 'undefined', 'nat', '-', '--'])

export const isBlank = (value) => value == null || BLANKS.has(String(value).trim().toLowerCase())

export const cleanText = (value) => (isBlank(value) ? '' : String(value).trim().replace(/\s+/g, ' '))

export const FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type (income / expense)' },
  { key: 'debit', label: 'Debit (money out)' },
  { key: 'credit', label: 'Credit (money in)' },
]

export const SAMPLE_CSV = [
  'Date,Description,Category,Type,Amount',
  '2025-01-03,Salary January,Salary,income,50000',
  '2025-01-04,Grocery store,Food,expense,1850.50',
  '2025-01-05,Metro card recharge,Transport,expense,500',
  '2025-01-07,Electricity bill,Bills,expense,2300',
  '2025-01-09,Movie night,Entertainment,expense,700',
].join('\n')

// ---------- parsing ----------

const detectDelimiter = (text) => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ''
  const counts = [',', ';', '\t', '|'].map((d) => [d, firstLine.split(d).length - 1])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

// RFC 4180-style parser: quoted fields, escaped quotes, newlines inside quotes.
export function parseCsv(text) {
  const src = String(text || '').replace(/^\uFEFF/, '')
  const delimiter = detectDelimiter(src)
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1 }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delimiter) { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const cellToValue = (cell) => {
  if (cell == null) return ''
  if (cell instanceof Date) return cell
  if (typeof cell === 'object') {
    if (Array.isArray(cell.richText)) return cell.richText.map((r) => r.text).join('')
    if ('result' in cell) return cellToValue(cell.result)
    if ('text' in cell) return cell.text
    if ('error' in cell) return ''
  }
  return cell
}

export async function parseSpreadsheet(buffer) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets.find((ws) => ws.rowCount > 0)
  if (!sheet) return []
  const rows = []
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values = []
    for (let c = 1; c <= sheet.columnCount; c += 1) values.push(cellToValue(row.getCell(c).value))
    rows.push(values)
  })
  return rows
}

// First row with at least two non-blank cells is the header.
export function splitHeader(matrix) {
  const idx = matrix.findIndex((r) => r.filter((c) => !isBlank(c)).length >= 2)
  if (idx === -1) return { headers: [], rows: [] }
  const headers = matrix[idx].map((h, i) => cleanText(h) || `Column ${i + 1}`)
  const rows = matrix.slice(idx + 1).filter((r) => r.some((c) => !isBlank(c)))
  return { headers, rows }
}

// ---------- column detection ----------

const PATTERNS = [
  ['date', /(^|\b)(date|posted|booking|value\s*date|txn\s*date|time)(\b|$)/i],
  ['type', /^(type|txn\s*type|transaction\s*type|dr\s*\/\s*cr|cr\s*\/\s*dr|direction)$/i],
  ['debit', /debit|withdraw|paid\s*out|money\s*out|spent|\bdr\b/i],
  ['credit', /credit|deposit|paid\s*in|money\s*in|received|\bcr\b/i],
  ['amount', /amount|\bamt\b|^value$|^sum$|^total$/i],
  ['category', /categor|^tag$|^label$|^head$/i],
  ['description', /desc|narration|particular|detail|memo|note|merchant|payee|remark|reference|name/i],
]

export function detectMapping(headers) {
  const mapping = {}
  const used = new Set()
  PATTERNS.forEach(([field, re]) => {
    const idx = headers.findIndex((h, i) => !used.has(i) && re.test(h))
    if (idx !== -1) { mapping[field] = idx; used.add(idx) }
  })
  return mapping
}

// ---------- value parsing ----------

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const pad = (n) => String(n).padStart(2, '0')

const validYmd = (y, m, d) => {
  if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1)) return ''
  const last = new Date(y, m, 0).getDate()
  return d <= last ? `${y}-${pad(m)}-${pad(d)}` : ''
}

export function parseDate(value, order = 'DMY') {
  if (isBlank(value)) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    const utcMidnight = value.getUTCHours() === 0 && value.getUTCMinutes() === 0
    return utcMidnight
      ? validYmd(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
      : validYmd(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }
  if (typeof value === 'number') {
    if (value > 20000 && value < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000)
      return validYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    }
    return ''
  }
  const text = String(value).trim()
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (m) return validYmd(+m[1], +m[2], +m[3])
  m = text.match(/^(\d{1,2})[-/.\s]([A-Za-z]{3,9})[-/.,\s]+(\d{2,4})/)
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
    return validYmd(y, MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1])
  }
  m = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})/)
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
    return validYmd(y, MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2])
  }
  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]
    return order === 'MDY' ? validYmd(y, +m[1], +m[2]) : validYmd(y, +m[2], +m[1])
  }
  return ''
}

// Returns a signed number, or NaN. "(1,200)" and trailing "Dr" mean negative.
export function parseAmount(value) {
  if (isBlank(value)) return NaN
  if (typeof value === 'number') return value
  let text = String(value).trim()
  let negative = false
  if (/^\(.*\)$/.test(text)) { negative = true; text = text.slice(1, -1) }
  const suffix = text.match(/(cr|dr)\.?$/i)
  if (suffix) { negative = negative || suffix[1].toLowerCase() === 'dr'; text = text.slice(0, suffix.index) }
  text = text.replace(/(inr|rs\.?|usd|eur|gbp)/gi, '').replace(/[₹$€£,\s]/g, '')
  if (text.startsWith('-')) { negative = !negative; text = text.slice(1) }
  if (!/^\d*\.?\d+$/.test(text)) return NaN
  const n = Number(text)
  return negative ? -n : n
}

export function parseType(value) {
  const t = cleanText(value).toLowerCase()
  if (!t) return ''
  if (/^(income|credit|cr|deposit|received|inflow|in|\+)$/.test(t)) return 'income'
  if (/^(expense|debit|dr|withdrawal|spent|outflow|out|payment|-)$/.test(t)) return 'expense'
  return ''
}

// Cheap keyword auto-categorisation, used only when the file gives no category.
const KEYWORDS = [
  ['Salary', /salary|payroll/i],
  ['Freelance', /freelance|invoice|client payment/i],
  ['Food', /swiggy|zomato|restaurant|cafe|coffee|grocery|supermarket|bigbasket|blinkit|dinner|lunch|pizza|food/i],
  ['Transport', /uber|ola\b|metro|fuel|petrol|diesel|taxi|cab|bus|train|irctc|flight|parking|toll/i],
  ['Shopping', /amazon|flipkart|myntra|mall|shopping|store|clothes/i],
  ['Bills', /electric|water bill|gas bill|internet|broadband|recharge|insurance|rent|bill|emi|loan/i],
  ['Entertainment', /netflix|spotify|prime video|hotstar|movie|cinema|game|concert/i],
]

export const autoCategory = (description) => {
  const hit = KEYWORDS.find(([, re]) => re.test(description || ''))
  return hit ? hit[0] : ''
}

// ---------- row building + validation ----------

export const dedupeKey = (date, amount, type, description) =>
  [date, String(Number(amount)), type, String(description || '').trim().toLowerCase()].join('|')

let rowSeq = 0

// Recomputes errors / warnings for a row from its current field values.
export function validateRow(row, ctx) {
  const errors = []
  const warnings = []
  const amount = Number(row.amount)
  if (row.amount === '' || row.amount == null) errors.push('Missing amount')
  else if (!Number.isFinite(amount) || amount <= 0) errors.push('Invalid amount')
  if (!row.date) errors.push('Missing or invalid date')
  if (!['income', 'expense'].includes(row.type)) errors.push('Missing type')
  if (row.category && ctx.knownCategories && !ctx.knownCategories.has(row.category.toLowerCase())) {
    warnings.push('Unknown category')
  }
  const key = errors.length ? null : dedupeKey(row.date, amount, row.type, row.description)
  const duplicate = Boolean(key && ctx.existingKeys?.has(key))
  return { ...row, errors, warnings, duplicate }
}

const finishRow = (draft, ctx) => {
  let { description, category } = draft
  description = cleanText(description)
  category = cleanText(category)
  if (category && ctx.canonicalCategories) category = ctx.canonicalCategories.get(category.toLowerCase()) || category
  if (!category || category.toLowerCase() === 'other') category = autoCategory(description) || 'Other'
  if (!description) description = category !== 'Other' ? category : `Imported ${draft.type || 'transaction'}`
  const row = validateRow({ ...draft, description: description.slice(0, 200), category: category.slice(0, 40) }, ctx)
  row.checked = row.errors.length === 0 && !row.duplicate
  return row
}

export function buildRowsFromMatrix(rows, mapping, options, ctx) {
  const get = (r, field) => (mapping[field] == null ? '' : r[mapping[field]])
  return rows.map((r, i) => {
    let amount = parseAmount(get(r, 'amount'))
    let type = parseType(get(r, 'type'))

    const debit = parseAmount(get(r, 'debit'))
    const credit = parseAmount(get(r, 'credit'))
    if (Number.isNaN(amount) && (Number.isFinite(debit) || Number.isFinite(credit))) {
      if (Number.isFinite(debit) && debit !== 0) { amount = Math.abs(debit); type = 'expense' }
      else if (Number.isFinite(credit) && credit !== 0) { amount = Math.abs(credit); type = 'income' }
    } else if (Number.isFinite(amount) && !type) {
      if (options.defaultType === 'sign') type = amount < 0 ? 'expense' : 'income'
      else type = options.defaultType
    }
    if (Number.isFinite(amount)) amount = Math.abs(amount)
    if (!type && options.defaultType !== 'sign') type = options.defaultType

    return finishRow({
      key: `r${(rowSeq += 1)}`,
      line: i + 1,
      date: parseDate(get(r, 'date'), options.dateOrder),
      amount: Number.isFinite(amount) ? String(amount) : '',
      type,
      category: get(r, 'category'),
      description: get(r, 'description'),
    }, ctx)
  })
}

// Rows from the server parser (PDF / image statements) are already structured.
export function buildRowsFromServer(list, ctx) {
  return list.map((r, i) => finishRow({
    key: `r${(rowSeq += 1)}`,
    line: i + 1,
    date: parseDate(r.date),
    amount: r.amount === '' || r.amount == null ? '' : String(r.amount),
    type: r.type === 'income' ? 'income' : 'expense',
    category: r.category,
    description: r.description,
  }, ctx))
}
