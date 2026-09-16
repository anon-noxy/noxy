import { compareAzAnime, getAzSearchQueries, isAzMatch, toAzCardResult, type AzCardResult } from '../../utils/az'
import {
  buildPageInfo,
  collectMalResults,
  fetchMalAnimeRanking,
  fetchMalAnimeSearch,
  type MalAnime,
  parseMalList,
} from '../../utils/mal'

const toSafeLetter = (value: string) => {
  const letter = value.toLowerCase()

  if (letter === 'all' || letter === 'number' || letter === 'symbol' || /^[a-z]$/.test(letter)) {
    return letter
  }

  return 'all'
}

const mergeUniqueAnime = (groups: MalAnime[][]) => {
  const animeById = new Map<number, MalAnime>()

  for (const group of groups) {
    for (const anime of group) {
      if (!animeById.has(anime.id)) {
        animeById.set(anime.id, anime)
      }
    }
  }

  return Array.from(animeById.values())
}

const fetchSeededLetterResults = async (event: Parameters<typeof fetchMalAnimeSearch>[0], letter: string) => {
  const searches = getAzSearchQueries(letter)

  if (!searches.length) {
    return []
  }

  const responses = await Promise.all(
    searches.map((search) => fetchMalAnimeSearch(event, search, 50, 0).catch(() => undefined)),
  )

  return mergeUniqueAnime(responses.map((response) => parseMalList(response))).filter((anime) =>
    isAzMatch(anime, letter),
  )
}

const handler = defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event)
    const letter = toSafeLetter(String(query.letter || 'all'))
    const page = Number(query.page || 1)
    const perPage = Number(query.perPage || 24)
    const safePage = Number.isInteger(page) && page > 0 ? page : 1
    const safePerPage = Number.isInteger(perPage) && perPage > 0 ? Math.min(perPage, 50) : 24
    const maxBatches = 16
    const targetCount = (safePage + 1) * safePerPage

    if (letter === 'all') {
      const response = await collectMalResults((offset, limit) => fetchMalAnimeRanking(event, 'all', limit, offset), {
        page: 1,
        perPage: targetCount,
        batchSize: 50,
        maxBatches,
      })
      const sortedResults = response.items.sort(compareAzAnime(letter))
      const start = Math.max(0, (safePage - 1) * safePerPage)
      const pageItems = sortedResults.slice(start, start + safePerPage)

      return {
        letter,
        pageInfo: buildPageInfo(
          safePage,
          safePerPage,
          sortedResults.length > start + safePerPage || response.pageInfo.hasNextPage,
          sortedResults.length,
        ),
        results: pageItems.map((anime) => toAzCardResult(anime, letter)),
      }
    }

    const searchResults = await fetchSeededLetterResults(event, letter)
    const needsRankingFallback = searchResults.length < targetCount + safePerPage
    const rankingResponse = needsRankingFallback
      ? await collectMalResults((offset, limit) => fetchMalAnimeRanking(event, 'all', limit, offset), {
          page: 1,
          perPage: targetCount,
          batchSize: 50,
          maxBatches: letter === 'number' || letter === 'symbol' ? 4 : maxBatches,
          predicate: (anime) => isAzMatch(anime, letter),
        })
      : undefined

    const mergedResults = mergeUniqueAnime([searchResults, rankingResponse?.items || []]).sort(compareAzAnime(letter))
    const start = Math.max(0, (safePage - 1) * safePerPage)
    const pageItems = mergedResults.slice(start, start + safePerPage)
    const results: AzCardResult[] = pageItems.map((anime) => toAzCardResult(anime, letter))

    return {
      letter,
      pageInfo: buildPageInfo(
        safePage,
        safePerPage,
        mergedResults.length > start + safePerPage || Boolean(rankingResponse?.pageInfo.hasNextPage),
        mergedResults.length,
      ),
      results,
    }
  },
  {
    maxAge: 60 * 15,
    name: 'myanimelist-az-safe-genres-v6',
    getKey: (event) => getRequestURL(event).searchParams.toString(),
  },
)

export default handler
