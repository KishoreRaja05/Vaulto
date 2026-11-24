const crypto = require('crypto')
const multer = require('multer')

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
// Debugging on Render involves several retries; allow more attempts per hour.
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
// Render free-tier cold start can take ~60s, plus Groq extraction for PDFs.
const AI_PARSE_TIMEOUT_MS = 180 * 1000
const MAX_DUPLICATE_QUERY_DAYS = 3660

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
}).single('file')

const parseRateLimitState = new Map()

const getRateLimitEntry = (userId) => {
  const now = Date.now()
  const entry = parseRateLimitState.get(userId)
  if (!entry || now >= entry.resetAt) {
    const fresh = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    parseRateLimitState.set(userId, fresh)
    return fresh
  }
  return entry
}

const checkUserRateLimit = (userId) => {
  const entry = getRateLimitEntry(userId)
  if (entry.count >= RATE_LIMIT_MAX) {
    const minutes = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 60000))
    return { allowed: false, message: `Import limit reached. You can try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.` }
  }
  entry.count += 1
  return { allowed: true }
}

const normalizeName = (name) => String(name || '').toLowerCase().trim()
const getExtension = (name) => {
  const lower = normalizeName(name)
  const idx = lower.lastIndexOf('.')
  return idx === -1 ? '' : lower.slice(idx)
}

const isPng = (buf) => buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
const isJpg = (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
const isPdf = (buf) => buf.length >= 4 && buf.slice(0, 4).toString('ascii') === '%PDF'
const isZip = (buf) => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)

const looksLikeXlsx = (buf) => {
  if (!isZip(buf)) return false
  const sample = buf.toString('latin1', 0, Math.min(buf.length, 65536))
  return sample.includes('[Content_Types].xml') && (sample.includes('xl/') || sample.includes('xl\\'))
}

const looksLikeCsv = (buf) => {
  const sample = buf.subarray(0, Math.min(buf.length, 4096))
  if (sample.includes(0)) return false
  let text = ''
  try {
    text = sample.toString('utf8')
  } catch {
    return false
  }
  if (!text.trim()) return false
  let printable = 0
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) printable += 1
  }
  if (printable / Math.max(text.length, 1) < 0.85) return false
  return /,|;|\t/.test(text) && /\n|\r/.test(text)
}

const detectAllowedType = (file) => {
  const ext = getExtension(file.originalname)
  const mime = String(file.mimetype || '').toLowerCase().trim()
  const buf = file.buffer || Buffer.alloc(0)

  if (ext === '.pdf' && (mime === 'application/pdf' || mime === '') && isPdf(buf)) return 'pdf'
  if (ext === '.png' && (mime === 'image/png' || mime === '') && isPng(buf)) return 'png'
  if ((ext === '.jpg' || ext === '.jpeg') && (mime === 'image/jpeg' || mime === 'image/jpg' || mime === '') && isJpg(buf)) return 'jpg'
  if (ext === '.xlsx' && (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/octet-stream' || mime === ''
  ) && looksLikeXlsx(buf)) return 'xlsx'
  if (ext === '.csv' && (
    mime === 'text/csv' || mime === 'application/vnd.ms-excel' ||
    mime === 'text/plain' || mime === 'application/csv' || mime === ''
  ) && looksLikeCsv(buf)) return 'csv'

  return null
}

const parseUpload = (req, res) => new Promise((resolve, reject) => {
  upload(req, res, (err) => {
    if (err) return reject(err)
    return resolve(req.file)
  })
})

const toDay = (value) => {
  const text = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

const normalizeDescription = (value) => String(value || '').trim().toLowerCase()

const buildDuplicateSet = async (userId, parsedTransactions) => {
  const days = [...new Set(parsedTransactions.map((row) => toDay(row.date)).filter(Boolean))].sort()
  if (!days.length) return new Set()
  const minDay = days[0]
  const maxDay = days[days.length - 1]

  // Guard against pathological ranges.
  const minDate = new Date(`${minDay}T00:00:00Z`)
  const maxDate = new Date(`${maxDay}T00:00:00Z`)
  if (Number.isNaN(minDate.getTime()) || Number.isNaN(maxDate.getTime())) return new Set()
  const diffDays = Math.round((maxDate - minDate) / 86400000)
  if (diffDays < 0 || diffDays > MAX_DUPLICATE_QUERY_DAYS) return new Set()

  const supabase = require('../utils/supabase')
  const from = minDay
  const to = `${maxDay}T23:59:59.999Z`
  const { data, error } = await supabase
    .from('Transaction')
    .select('date, amount, type, description')
    .eq('userId', userId)
    .gte('date', from)
    .lte('date', to)
  if (error) throw error

  const set = new Set()
  for (const row of data || []) {
    const day = toDay(row.date)
    if (!day) continue
    const key = [day, String(Number(row.amount)), String(row.type || ''), normalizeDescription(row.description)].join('|')
    set.add(key)
  }
  return set
}

const getAiParseUrl = () => {
  const override = String(process.env.AI_PARSE_URL || '').trim()
  if (override) return override
  const raw = String(process.env.AI_SERVICE_URL || '').trim()
  if (!raw) return ''
  try {
    return `${new URL(raw).origin}/parse`
  } catch {
    return ''
  }
}

const forwardToAiService = async (file) => {
  const aiUrl = getAiParseUrl()
  const internalKey = String(process.env.INTERNAL_API_KEY || '').trim()
  if (!aiUrl || !internalKey) {
    const err = new Error('IMPORT_CONFIG_MISSING')
    err.statusCode = 500
    err.clientMessage = 'Import service is not configured.'
    throw err
  }

  const form = new FormData()
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' })
  form.append('file', blob, file.originalname || 'upload')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_PARSE_TIMEOUT_MS)
  try {
    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: { 'X-Internal-Key': internalKey },
      body: form,
      signal: controller.signal,
    })

    let payload = null
    let text = ''
    try {
      payload = await response.json()
    } catch {
      try { text = await response.text() } catch { text = '' }
    }

    if (!response.ok) {
      console.error(`AI parse failed: ${response.status}`)
      if (response.status === 422) {
        const message = (payload && payload.detail) || (payload && payload.message) || text || 'Could not parse the uploaded file.'
        const err = new Error('AI_PARSE_422')
        err.statusCode = 422
        err.clientMessage = String(message)
        throw err
      }
      if (response.status === 429) {
        const err = new Error('AI_PARSE_429')
        err.statusCode = 429
        err.clientMessage = 'Daily import limit reached. Try again tomorrow.'
        throw err
      }
      if (response.status === 401 || response.status >= 500) {
        const detail = (payload && (payload.detail || payload.message)) || ''
        const err = new Error('AI_PARSE_UNAVAILABLE')
        err.statusCode = 503
        err.clientMessage = detail ? `Import service error: ${detail}` : 'Import service unavailable'
        throw err
      }
      const err = new Error('AI_PARSE_UNAVAILABLE')
      err.statusCode = 503
      err.clientMessage = 'Import service unavailable'
      throw err
    }
    return payload || { transactions: [], warnings: [] }
  } catch (err) {
    if (err.clientMessage) throw err
    const code = err?.cause?.code || err?.code || (err.name === 'AbortError' ? 'TIMEOUT' : 'REQUEST_FAILED')
    console.error(`AI parse failed: ${code}`)
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('AI_PARSE_TIMEOUT')
      timeoutErr.statusCode = 503
      timeoutErr.clientMessage = 'Import service unavailable'
      throw timeoutErr
    }
    const wrapped = new Error('AI_PARSE_REQUEST_FAILED')
    wrapped.statusCode = 503
    wrapped.clientMessage = 'Import service unavailable'
    throw wrapped
  } finally {
    clearTimeout(timeout)
  }
}

const parseImportFile = async (req, res) => {
  const aiUrl = getAiParseUrl()
  const internalKey = String(process.env.INTERNAL_API_KEY || '').trim()
  if (!aiUrl || !internalKey) {
    return res.status(500).json({ message: 'Import service is not configured.' })
  }

  const rate = checkUserRateLimit(req.user.id)
  if (!rate.allowed) {
    return res.status(429).json({ message: rate.message })
  }

  let file
  try {
    file = await parseUpload(req, res)
  } catch (err) {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File is too large. Maximum size is 5 MB.' })
    }
    if (err && err.message === 'Unexpected field') {
      return res.status(400).json({ message: 'Upload a file using the "file" field.' })
    }
    return res.status(400).json({ message: 'Could not read the uploaded file.' })
  }

  if (!file || !file.buffer || !file.buffer.length) {
    return res.status(400).json({ message: 'No file uploaded.' })
  }

  const detectedType = detectAllowedType(file)
  if (!detectedType) {
    return res.status(415).json({ message: 'Unsupported file type. Upload CSV, XLSX, PDF, PNG, or JPG/JPEG.' })
  }

  try {
    const aiResult = await forwardToAiService(file)
    const parsed = Array.isArray(aiResult?.transactions) ? aiResult.transactions : []
    const warnings = Array.isArray(aiResult?.warnings) ? aiResult.warnings.filter((w) => typeof w === 'string') : []

    let duplicateSet = new Set()
    try {
      duplicateSet = await buildDuplicateSet(req.user.id, parsed)
    } catch {
      // If duplicate lookup fails, continue without blocking import.
      warnings.push('Could not check for duplicates. Please review rows before importing.')
    }

    const transactions = parsed.map((row) => {
      const day = toDay(row?.date) || String(row?.date || '')
      const key = [day, String(Number(row?.amount)), String(row?.type || ''), normalizeDescription(row?.description)].join('|')
      return { ...row, duplicate: duplicateSet.has(key) }
    })

    return res.json({ transactions, warnings })
  } catch (err) {
    const status = err.statusCode || 503
    const message = err.clientMessage || 'Import service unavailable'
    if (status === 422) return res.status(422).json({ message })
    if (status === 429) return res.status(429).json({ message })
    if (status === 500) return res.status(500).json({ message })
    return res.status(503).json({ message })
  }
}

module.exports = { parseImportFile }
