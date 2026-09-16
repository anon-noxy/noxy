import { setResponseHeader } from 'h3'
import { createServiceUnavailableError, setRetryAfter } from '../utils/resilience'

type AnimeNewsArticle = {
  title: string
  slug: string
  source: string
  excerpt?: string
  date?: string
  image?: string
  link?: string
  tags?: string[]
}

type AnimeNewsMeta = {
  total?: number
  returned?: number
  offset?: number
  limit?: number
  hasMore?: boolean
  source?: string
  sort?: string
  query?: string
  availableSources?: string[]
  responseTime?: string
  timestamp?: string
}

type AnimeNewsResponse = {
  success: boolean
  data?: AnimeNewsArticle[]
  meta?: AnimeNewsMeta
  error?: string
  message?: string
}

const toSafeLimit = (value: unknown) => {
  const limit = Number(value) || 20

  return Math.min(Math.max(limit, 1), 50)
}

const toSafeOffset = (value: unknown) => {
  const offset = Number(value) || 0

  return Math.max(offset, 0)
}

const handler = defineCachedEventHandler(
  async (event): Promise<AnimeNewsResponse> => {
    const config = useRuntimeConfig(event)
    const query = getQuery(event)
    const searchQuery = String(query.q || '').trim()
    const source = String(query.source || 'all')
      .trim()
      .toLowerCase()
    const limit = toSafeLimit(query.limit)
    const offset = toSafeOffset(query.offset)
    const sort = String(query.sort || 'latest').trim() || 'latest'
    const baseURL = config.animeNewsApiBaseUrl || 'https://aninews.vercel.app'
    const path = searchQuery.length >= 2 ? '/api/search' : '/api/news'

    try {
      return await $fetch<AnimeNewsResponse>(`${baseURL}${path}`, {
        query: {
          q: searchQuery.length >= 2 ? searchQuery : undefined,
          source: source === 'all' ? undefined : source,
          limit,
          offset,
          sort,
        },
        timeout: 8_000,
      })
    } catch {
      setRetryAfter(event, 30)
      setResponseHeader(event, 'X-Noxy-Upstream-Unavailable', 'anime-news')

      throw createServiceUnavailableError('Anime news is unavailable right now.')
    }
  },
  {
    maxAge: 60 * 10,
    name: 'anime-news',
    getKey: (event) => {
      const query = getQuery(event)
      const searchQuery = String(query.q || '')
        .trim()
        .toLowerCase()
      const source = String(query.source || 'all')
        .trim()
        .toLowerCase()
      const limit = toSafeLimit(query.limit)
      const offset = toSafeOffset(query.offset)
      const sort = String(query.sort || 'latest').trim() || 'latest'

      return `${searchQuery || 'latest'}:${source}:${sort}:${limit}:${offset}`
    },
  },
)

export default handler
