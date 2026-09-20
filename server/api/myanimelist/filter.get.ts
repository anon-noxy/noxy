import {
  collectMalResults,
  fetchMalAnimeRanking,
  fetchMalAnimeSearch,
  formatDisplayDate,
  type MalCardResult,
  type MalPageInfo,
  type MalAnime,
  toCardResult,
  toSafeGenres,
} from '../../utils/mal'
import { getSearchTitleMatch } from '../../utils/search-match'

type FilterResult = MalCardResult & {
  date: string
  matchedTitle?: string
  sortTitle?: string
}

type FilterResponse = {
  pageInfo: MalPageInfo
  results: FilterResult[]
}

const sortMap: Record<string, string> = {
  default: 'all',
  trending: 'airing',
  popular: 'bypopularity',
  score: 'all',
  newest: 'upcoming',
  updated: 'all',
}

const statusMap: Record<string, string> = {
  RELEASING: 'currently_airing',
  FINISHED: 'finished_airing',
  NOT_YET_RELEASED: 'not_yet_aired',
  HIATUS: 'currently_airing',
  CANCELLED: 'finished_airing',
}

const typeMap: Record<string, string> = {
  TV: 'tv',
  TV_SHORT: 'tv',
  MOVIE: 'movie',
  SPECIAL: 'special',
  OVA: 'ova',
}

const hasGenre = (anime: MalAnime, genre: string) => {
  return toSafeGenres(anime.genres).some((item) => item.toLowerCase() === genre.toLowerCase())
}

const handler = defineCachedEventHandler(
  async (event): Promise<FilterResponse> => {
    const query = getQuery(event)
    const page = Number(query.page || 1)
    const perPage = Number(query.perPage || 24)
    const rating = Number(query.rating || 0)
    const year = Number(query.year || 0)
    const sort = String(query.sort || 'default')
    const search = String(query.search || '').trim()
    const genre = String(query.genre || '').trim()
    const season = String(query.season || '')
      .trim()
      .toLowerCase()
    const type = String(query.type || '').trim()
    const selectedMediaType = type ? typeMap[type.toUpperCase()] : ''
    const status = String(query.status || '').trim()
    const safePage = Number.isInteger(page) && page > 0 ? page : 1
    const safePerPage = Number.isInteger(perPage) && perPage > 0 ? Math.min(perPage, 50) : 24
    const rankingType: string = sortMap[sort] ?? 'all'

    const loader = search
      ? (offset: number, limit: number) => fetchMalAnimeSearch(event, search, limit, offset)
      : (offset: number, limit: number) => fetchMalAnimeRanking(event, rankingType, limit, offset)

    const response = await collectMalResults(loader, {
      page: safePage,
      perPage: safePerPage,
      predicate: (anime) => {
        if (search && !getSearchTitleMatch(anime, search)) {
          return false
        }

        if (genre && !hasGenre(anime, genre)) {
          return false
        }

        if (season && anime.start_season?.season?.toLowerCase() !== season) {
          return false
        }

        if (year && anime.start_season?.year !== year) {
          return false
        }

        if (type && (!selectedMediaType || anime.media_type !== selectedMediaType)) {
          return false
        }

        if (status && anime.status !== (statusMap[status] || status.toLowerCase())) {
          return false
        }

        if (rating > 0 && (anime.mean || 0) * 10 < rating) {
          return false
        }

        return true
      },
    })

    return {
      pageInfo: response.pageInfo,
      results: response.items.map((anime) => {
        const card = toCardResult(anime)
        const match = search ? getSearchTitleMatch(anime, search) : null

        return {
          ...card,
          date: formatDisplayDate(anime.start_date),
          ...(match ? match : {}),
        }
      }),
    }
  },
  {
    maxAge: 60 * 10,
    name: 'myanimelist-filter-safe-genres-v9',
    getKey: (event) => getRequestURL(event).searchParams.toString(),
  },
)

export default handler
