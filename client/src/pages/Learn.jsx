import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import AppNav from '../components/AppNav'
import PageWrapper from '../components/PageWrapper'
import { useTheme } from '../context/ThemeContext'

const SKELETON_COUNT = 8
const CARD_WIDTH = 280
const CARD_GAP = 16
const CARD_SCROLL_STEP = CARD_WIDTH + CARD_GAP

function VideoCard({ video, dark, className = '' }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block overflow-hidden rounded-xl border transition-all duration-200 hover:-translate-y-1 ${
        dark
          ? 'border-gray-800 bg-gray-900 hover:border-indigo-700'
          : 'border-gray-200 bg-white hover:border-indigo-300'
      } ${className}`}
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-3">
        <h3 className={`line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
          {video.title}
        </h3>
        <p className={`mt-2 truncate text-xs ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
          {video.channel}
        </p>
      </div>
    </a>
  )
}

function VideoSkeleton({ dark, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} ${className}`}>
      <div className={`aspect-video animate-pulse ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
      <div className="space-y-2 p-3">
        <div className={`h-4 w-full animate-pulse rounded ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
        <div className={`h-4 w-2/3 animate-pulse rounded ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
        <div className={`mt-3 h-3 w-1/2 animate-pulse rounded ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
      </div>
    </div>
  )
}

function EmptyState({ dark }) {
  return (
    <div className={`rounded-xl border px-6 py-14 text-center ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
      <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${dark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 6l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
      <p className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
        No English videos found. Try a different search.
      </p>
    </div>
  )
}

function ErrorState({ dark, message, onRetry }) {
  return (
    <div className={`rounded-xl border px-6 py-12 text-center ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`} role="alert">
      <p className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export default function Learn() {
  const { dark } = useTheme()
  const d = dark

  const [categories, setCategories] = useState([])
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [categoryError, setCategoryError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [slowLoad, setSlowLoad] = useState(false)
  const rowRefs = useRef({})

  const busy = categoryLoading || searchLoading

  useEffect(() => {
    let isActive = true

    const loadCategories = async () => {
      setCategoryLoading(true)
      setCategoryError('')
      setSlowLoad(false)
      try {
        const res = await api.get('/videos')
        if (!isActive) return
        setCategories(res.data?.categories || [])
      } catch (err) {
        console.error(err)
        if (isActive) {
          setCategoryError(err.response?.data?.message || 'Could not load videos right now.')
        }
      } finally {
        if (isActive) setCategoryLoading(false)
      }
    }

    loadCategories()
    return () => { isActive = false }
  }, [reloadKey])

  useEffect(() => {
    if (!busy) return undefined
    const timer = setTimeout(() => setSlowLoad(true), 5000)
    return () => clearTimeout(timer)
  }, [busy])

  const runSearch = async () => {
    const value = searchInput.trim()
    if (!value || searchLoading) return

    setActiveQuery(value)
    setResults([])
    setSearchError('')
    setSearchLoading(true)
    setSlowLoad(false)

    try {
      const res = await api.get('/videos/search', { params: { q: value } })
      setResults(res.data?.videos || [])
    } catch (err) {
      console.error(err)
      setSearchError(err.response?.data?.message || 'Could not load videos right now.')
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchInput('')
    setActiveQuery('')
    setResults([])
    setSearchError('')
    setSearchLoading(false)
    setSlowLoad(false)
  }

  const scrollRow = (id, direction) => {
    rowRefs.current[id]?.scrollBy({ left: direction * CARD_SCROLL_STEP, behavior: 'smooth' })
  }

  const arrowClasses = `absolute top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border transition-colors md:flex ${
    d
      ? 'border-gray-700 bg-gray-900 text-gray-300 hover:border-indigo-700 hover:text-indigo-300'
      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
  }`

  return (
    <PageWrapper>
      <style>{`
        .learn-row { scroll-snap-type: x proximity; }
        .learn-row::-webkit-scrollbar { height: 6px; }
        .learn-row::-webkit-scrollbar-track { background: transparent; }
        .learn-row::-webkit-scrollbar-thumb { background-color: #c7d2fe; border-radius: 9999px; }
        .dark .learn-row::-webkit-scrollbar-thumb { background-color: #4338ca; }
      `}</style>

      <div className={`min-h-screen transition-colors duration-300 ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <main className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <header>
            <h1 className={`text-2xl font-bold sm:text-3xl ${d ? 'text-white' : 'text-gray-900'}`}>Learn</h1>
            <p className={`mt-1 text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`}>
              Explore short finance videos by topic, or search for something specific.
            </p>

            <div className={`mt-5 flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
              d ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
            }`}>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    runSearch()
                  }
                }}
                placeholder="Search finance videos..."
                aria-label="Search finance videos"
                className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                  d ? 'text-gray-100 placeholder:text-gray-600' : 'text-gray-900 placeholder:text-gray-400'
                }`}
              />
              {(activeQuery || searchInput) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  title="Clear search"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                    d ? 'text-gray-500 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={runSearch}
                disabled={searchLoading}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-4.35-4.35m2.35-5.4a7.75 7.75 0 11-15.5 0 7.75 7.75 0 0115.5 0z" />
                </svg>
                Search
              </button>
            </div>
          </header>

          {slowLoad && busy && (
            <p className={`mt-4 text-xs ${d ? 'text-gray-500' : 'text-gray-500'}`}>
              Server is waking up. This takes about 30 seconds on first load.
            </p>
          )}

          {activeQuery ? (
            <section className="mt-7">
              <h2 className={`text-lg font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>
                Results for <span className="text-indigo-600 dark:text-indigo-400">{activeQuery}</span>
              </h2>

              {searchError ? (
                <div className="mt-4"><ErrorState dark={d} message={searchError} /></div>
              ) : searchLoading ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: SKELETON_COUNT }, (_, i) => <VideoSkeleton key={i} dark={d} />)}
                </div>
              ) : results.length === 0 ? (
                <div className="mt-4"><EmptyState dark={d} /></div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {results.map((video) => <VideoCard key={video.id} video={video} dark={d} />)}
                </div>
              )}
            </section>
          ) : (
            <section className="mt-7 space-y-7">
              {categoryError ? (
                <ErrorState
                  dark={d}
                  message={categoryError}
                  onRetry={() => setReloadKey((key) => key + 1)}
                />
              ) : categoryLoading ? (
                [0, 1, 2].map((row) => (
                  <div key={row}>
                    <div className={`h-5 w-40 animate-pulse rounded ${d ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    <div className="mt-3 flex gap-4 overflow-hidden">
                      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                        <VideoSkeleton key={i} dark={d} className="w-[280px] shrink-0" />
                      ))}
                    </div>
                  </div>
                ))
              ) : categories.length === 0 ? (
                <EmptyState dark={d} />
              ) : (
                categories.map((category) => (
                  <div key={category.id}>
                    <h2 className={`text-lg font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>
                      {category.label}
                    </h2>

                    {category.videos?.length ? (
                      <div className="relative mt-3">
                        <div
                          ref={(element) => { rowRefs.current[category.id] = element }}
                          className="learn-row flex snap-x gap-4 overflow-x-auto pb-3"
                          style={{ scrollbarWidth: 'thin', scrollbarColor: d ? '#4338ca transparent' : '#c7d2fe transparent' }}
                        >
                          {category.videos.map((video) => (
                            <VideoCard
                              key={video.id}
                              video={video}
                              dark={d}
                              className="w-[280px] shrink-0 snap-start"
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => scrollRow(category.id, -1)}
                          aria-label={`Scroll ${category.label} left`}
                          className={`${arrowClasses} -left-3`}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollRow(category.id, 1)}
                          aria-label={`Scroll ${category.label} right`}
                          className={`${arrowClasses} -right-3`}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <p className={`mt-2 text-sm ${d ? 'text-gray-500' : 'text-gray-500'}`}>
                        No English videos found. Try a different search.
                      </p>
                    )}
                  </div>
                ))
              )}
            </section>
          )}
        </main>
      </div>
    </PageWrapper>
  )
}
