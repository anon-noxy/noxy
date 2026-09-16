import { setResponseHeader } from 'h3'
import { fetchMalAnimeRanking, parseMalList } from '../../utils/mal'
import { createServiceUnavailableError, setRetryAfter } from '../../utils/resilience'

const MAX_RANDOM_OFFSET = 500
const RANDOM_POOL_BATCHES = 3
const RANDOM_POOL_FETCH_LIMIT = 100
const RANDOM_POOL_TTL_MS = 10 * 60 * 1000
const RANDOM_POOL_CACHE_KEY = 'myanimelist:random-pool:v1'

type RandomPoolCache = {
  expiresAt: number
  ids: number[]
}

const getRandomPool = async (event: Parameters<typeof fetchMalAnimeRanking>[0]) => {
  const storage = useStorage('cache')
  const cachedPool = await storage.getItem<RandomPoolCache>(RANDOM_POOL_CACHE_KEY)

  if (cachedPool?.ids.length && cachedPool.expiresAt > Date.now()) {
    return cachedPool.ids
  }

  const responses = await Promise.all(
    Array.from({ length: RANDOM_POOL_BATCHES }, () => {
      const offset = Math.floor(Math.random() * MAX_RANDOM_OFFSET)

      return fetchMalAnimeRanking(event, 'all', RANDOM_POOL_FETCH_LIMIT, offset)
    }),
  )
  const ids = Array.from(new Set(responses.flatMap((response) => parseMalList(response).map((anime) => anime.id))))

  if (ids.length) {
    await storage.setItem<RandomPoolCache>(RANDOM_POOL_CACHE_KEY, {
      expiresAt: Date.now() + RANDOM_POOL_TTL_MS,
      ids,
    })
  }

  return ids
}

const handler = defineEventHandler(async (event) => {
  const ids = await getRandomPool(event)
  const randomId = ids[Math.floor(Math.random() * ids.length)]

  if (randomId) {
    return {
      id: randomId,
    }
  }

  setRetryAfter(event, 10)
  setResponseHeader(event, 'X-Noxy-Random-Pool', 'empty')

  throw createServiceUnavailableError('Random anime is temporarily unavailable.')
})

export default handler
