// ─── Tunable quota / cache settings ────────────────────────────────────────────
const CACHE_HOURS = 12
const SEARCH_CACHE_HOURS = 6
const SEARCH_CACHE_MAX_QUERIES = 100
const DAILY_UNIT_BUDGET = 8000
const SEARCH_UNIT_COST = 101 // search.list (100) + videos.list (1)
const USER_SEARCH_LIMIT = 5
const USER_SEARCH_WINDOW_HOURS = 1
// ───────────────────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000
const SEARCH_CACHE_TTL_MS = SEARCH_CACHE_HOURS * HOUR_MS
const USER_SEARCH_WINDOW_MS = USER_SEARCH_WINDOW_HOURS * HOUR_MS
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
const SEARCH_MAX_RESULTS = 25
const CATEGORY_VIDEO_LIMIT = 12
const SEARCH_VIDEO_LIMIT = 12

const FINANCE_TOPIC_RE = /\b(?:finance|financial|finances|money|budget(?:ing|s)?|sav(?:e|es|ing|ings)|invest(?:s|ing|ment|ments|or|ors)?|mutual\s+funds?|sip|stock(?:s)?|share(?:s)?|equit(?:y|ies)|etfs?|economics?|economist(?:s)?|(?:stock|share|global|financial|capital|forex|commodity|crypto)\s+markets?|trad(?:e|es|ing|er|ers)|forex|nifty|sensex|nasdaq|bitcoin|crypto(?:currency)?|wealth|portfolio|inflation|gdp|recession|tax(?:es)?|insurance|loans?|credit|debt|banking|interest\s*rates?)\b/i
const SEARCH_TOPIC_MESSAGE = 'Please search only finance-related topics.'

const isAllowedTopicText = (value = '') => FINANCE_TOPIC_RE.test(String(value))

const CATEGORIES = [
  { id: 'basics', label: 'Basics', query: 'personal finance basics for beginners' },
  { id: 'investing', label: 'Investing', query: 'investing for beginners explained' },
  { id: 'mutual', label: 'Mutual Funds', query: 'mutual funds SIP explained in English' },
  { id: 'saving', label: 'Saving', query: 'how to save money budgeting tips' },
  { id: 'stocks', label: 'Stocks', query: 'stock market basics for beginners' },
]

const pacificDate = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

let quota = { date: pacificDate(), unitsUsed: 0, exhausted: false }
let categoryCache = null
let categoryInFlight = null
const searchCache = new Map()
const userSearches = new Map()

const syncQuota = () => {
  const today = pacificDate()
  if (quota.date !== today) {
    quota = { date: today, unitsUsed: 0, exhausted: false }
  }
  return quota
}

const budgetAllows = (units) => {
  const state = syncQuota()
  return !state.exhausted && state.unitsUsed + units <= DAILY_UNIT_BUDGET
}

const createQuotaError = () => {
  const error = new Error('YouTube daily quota exhausted')
  error.code = 'QUOTA_EXHAUSTED'
  return error
}

const getApiKey = () => {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured. Add it to server/.env to enable the Learn page.')
  }
  return apiKey
}

const fetchYouTubeJson = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    let body = null
    try { body = await response.json() } catch { /* non-JSON error body */ }
    const reasons = (body?.error?.errors || []).map((error) => error.reason)
    if (response.status === 403 && reasons.includes('quotaExceeded')) {
      syncQuota().exhausted = true
    }
    throw new Error(body?.error?.message || `YouTube API request failed (${response.status})`)
  }
  return response.json()
}

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const NON_LATIN_RE = /[^\u0000-\u024F\u2000-\u206F\s]/
const LANGUAGE_MARKERS_RE = /\b(hindi|hinglish|telugu|tamil|malayalam|kannada|bengali|marathi|punjabi|gujarati|urdu|nepali|sinhala|arabic|spanish|french|german|portuguese|russian|chinese|japanese|korean|italian|turkish|vietnamese|thai|indonesian)\b/i

const isEnglishText = (text = '') => {
  const decoded = decodeEntities(text)
  return !NON_LATIN_RE.test(decoded) && !LANGUAGE_MARKERS_RE.test(decoded)
}

const normalizedLanguage = (value) => {
  const language = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return language && language !== 'und' ? language : ''
}

const isEnglishSnippet = (snippet = {}) => {
  // A Latin-script, English-looking title is not enough on its own: Hindi
  // uploads are often titled in English but tagged/marked as Hindi.
  if (!isEnglishText(snippet.title || '')) return false

  const audio = normalizedLanguage(snippet.defaultAudioLanguage)
  const language = normalizedLanguage(snippet.defaultLanguage)
  if (audio || language) {
    // Reject if ANY declared language is non-English, even if another is "en".
    return (!audio || audio.startsWith('en')) && (!language || language.startsWith('en'))
  }

  const descriptor = [
    (snippet.tags || []).join(' '),
    (snippet.description || '').slice(0, 300),
  ].join(' ')
  return isEnglishText(descriptor)
}

const onlyEnglish = (videos = []) => videos.filter((video) => isEnglishText(video.title || ''))

const onlyAllowedTopics = (videos = []) =>
  videos.filter((video) => isAllowedTopicText(`${video.title || ''} ${video.channel || ''}`))

const scrubCategories = (payload) => ({
  ...payload,
  categories: (payload.categories || []).map((category) => ({
    ...category,
    videos: onlyAllowedTopics(onlyEnglish(category.videos)),
  })),
})

const mapVideo = (item) => {
  const id = item?.id
  if (!id) return null
  const snippet = item.snippet || {}
  const thumbnails = snippet.thumbnails || {}

  return {
    id,
    title: decodeEntities(snippet.title),
    channel: decodeEntities(snippet.channelTitle),
    thumbnail:
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${id}`,
  }
}

const searchEnglishVideos = async (query, maxKeep) => {
  const apiKey = getApiKey()
  if (!budgetAllows(SEARCH_UNIT_COST)) throw createQuotaError()
  syncQuota().unitsUsed += SEARCH_UNIT_COST

  const searchParams = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: String(SEARCH_MAX_RESULTS),
    order: 'relevance',
    relevanceLanguage: 'en',
    safeSearch: 'strict',
    key: apiKey,
  })
  const searchData = await fetchYouTubeJson(`${YOUTUBE_SEARCH_URL}?${searchParams}`)
  const ids = (searchData.items || [])
    .map((item) => item.id?.videoId)
    .filter(Boolean)
    .slice(0, SEARCH_MAX_RESULTS)
  if (ids.length === 0) return []

  const videoParams = new URLSearchParams({ part: 'snippet', id: ids.join(','), key: apiKey })
  const videosData = await fetchYouTubeJson(`${YOUTUBE_VIDEOS_URL}?${videoParams}`)

  return (videosData.items || [])
    .filter((item) => isEnglishSnippet(item.snippet))
    .map(mapVideo)
    .filter(Boolean)
    .filter((video) => isEnglishText(video.title))
    .filter((video) => isAllowedTopicText(`${video.title} ${video.channel}`))
    .slice(0, maxKeep)
}

const refreshCategories = async () => {
  if (!budgetAllows(CATEGORIES.length * SEARCH_UNIT_COST)) throw createQuotaError()

  const categories = await Promise.all(
    CATEGORIES.map(async (category) => ({
      id: category.id,
      label: category.label,
      videos: await searchEnglishVideos(category.query, CATEGORY_VIDEO_LIMIT),
    }))
  )

  return { categories, updatedAt: new Date().toISOString() }
}

const getVideos = async (req, res) => {
  if (categoryCache && Date.now() - categoryCache.fetchedAt < CACHE_HOURS * HOUR_MS) {
    return res.json(scrubCategories(categoryCache.payload))
  }

  try {
    if (!categoryInFlight) {
      categoryInFlight = refreshCategories()
        .then((payload) => {
          categoryCache = { fetchedAt: Date.now(), payload }
          return payload
        })
        .finally(() => {
          categoryInFlight = null
        })
    }
    return res.json(scrubCategories(await categoryInFlight))
  } catch (err) {
    console.error('Could not refresh YouTube categories:', err.message)
    if (categoryCache) return res.json({ ...scrubCategories(categoryCache.payload), stale: true })
    return res.status(502).json({ message: 'Could not load videos right now' })
  }
}

const normalizeQuery = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ')

const canUserSearch = (userId) => {
  const now = Date.now()
  const recent = (userSearches.get(userId) || [])
    .filter((time) => now - time < USER_SEARCH_WINDOW_MS)
  userSearches.set(userId, recent)
  return recent.length < USER_SEARCH_LIMIT
}

const recordUserSearch = (userId) => {
  const recent = userSearches.get(userId) || []
  recent.push(Date.now())
  userSearches.set(userId, recent)
}

const cacheSearchResult = (key, videos) => {
  searchCache.delete(key)
  searchCache.set(key, { fetchedAt: Date.now(), videos })
  while (searchCache.size > SEARCH_CACHE_MAX_QUERIES) {
    const oldest = searchCache.keys().next().value
    if (oldest === undefined) break
    searchCache.delete(oldest)
  }
}

const searchVideos = async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (query.length < 2 || query.length > 60) {
    return res.status(400).json({ message: 'Search query must be between 2 and 60 characters.' })
  }
  if (!isAllowedTopicText(query)) {
    return res.status(400).json({ message: SEARCH_TOPIC_MESSAGE })
  }

  // Cached searches are free: no quota units and no per-user limit.
  const cacheKey = normalizeQuery(query)
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < SEARCH_CACHE_TTL_MS) {
    return res.json({ query, videos: onlyAllowedTopics(onlyEnglish(cached.videos)) })
  }
  if (cached) searchCache.delete(cacheKey)

  if (!canUserSearch(req.user.id)) {
    return res.status(429).json({ message: 'Search limit reached. Try again in a few minutes.' })
  }
  if (!budgetAllows(SEARCH_UNIT_COST)) {
    return res.status(429).json({ message: 'Daily search limit reached. Please try again tomorrow.' })
  }

  recordUserSearch(req.user.id)
  try {
    const videos = await searchEnglishVideos(query, SEARCH_VIDEO_LIMIT)
    cacheSearchResult(cacheKey, videos)
    return res.json({ query, videos })
  } catch (err) {
    if (err.code === 'QUOTA_EXHAUSTED') {
      return res.status(429).json({ message: 'Daily search limit reached. Please try again tomorrow.' })
    }
    console.error('Could not search YouTube videos:', err.message)
    return res.status(502).json({ message: 'Could not load videos right now' })
  }
}

module.exports = { getVideos, searchVideos }
