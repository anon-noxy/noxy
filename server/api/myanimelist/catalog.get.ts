import {
  collectMalResults,
  fetchMalAnimeRanking,
  fetchMalSeasonalAnime,
  formatDisplayDate,
  getCompletionDate,
  isCompletedTvSeriesInYear,
  type MalListResponse,
  toCardResult,
} from '../../utils/mal'

type CatalogCategory = {
  title: string
  description: string
  rankingType?: string
  mediaType?: string
  status?: string
  minMean?: number
  useCurrentSeason?: boolean
  useCurrentYearCompleted?: boolean
}

const seasons = ['winter', 'spring', 'summer', 'fall']

const getCurrentYear = () => new Date().getUTCFullYear()

const getCurrentSeason = () => {
  const now = new Date()
  const month = now.getUTCMonth() + 1
  const year = getCurrentYear()

  if (month <= 3) return { season: 'winter', year }
  if (month <= 6) return { season: 'spring', year }
  if (month <= 9) return { season: 'summer', year }

  return { season: 'fall', year }
}

const categories: Record<string, CatalogCategory> = {
  'you-may-also-watch': {
    title: 'You may also watch',
    description: 'High-rated anime selected from MyAnimeList.',
    rankingType: 'all',
    minMean: 7.4,
  },
  trending: {
    title: 'Trending',
    description: 'Popular anime trending with MyAnimeList users.',
    rankingType: 'bypopularity',
  },
  'latest-added': {
    title: 'Latest Added',
    description: 'Current season anime releases from MyAnimeList.',
    useCurrentSeason: true,
  },
  'most-popular': {
    title: 'Most Popular',
    description: 'Popular anime ranked by MyAnimeList users.',
    rankingType: 'bypopularity',
  },
  'most-favorite': {
    title: 'Most Favorite',
    description: 'Anime with the most favorites on MyAnimeList.',
    rankingType: 'favorite',
  },
  completed: {
    title: 'Completed',
    description: 'TV anime series that finished airing this year from MyAnimeList.',
    useCurrentYearCompleted: true,
  },
  'top-upcoming': {
    title: 'Top Upcoming',
    description: 'Upcoming anime with strong audience interest.',
    rankingType: 'upcoming',
  },
  'subbed-anime': {
    title: 'Subbed Anime',
    description: 'Popular anime entries. Subtitle availability depends on the player source.',
    rankingType: 'all',
  },
  'dubbed-anime': {
    title: 'Dubbed Anime',
    description: 'Popular anime entries. Dub availability depends on the player source.',
    rankingType: 'all',
  },
  movie: {
    title: 'Movie',
    description: 'Anime movies from MyAnimeList.',
    rankingType: 'movie',
    mediaType: 'movie',
  },
  ova: {
    title: 'OVA',
    description: 'Original video animation entries.',
    rankingType: 'ova',
    mediaType: 'ova',
  },
  specials: {
    title: 'Specials',
    description: 'Anime specials and bonus episodes.',
    rankingType: 'special',
    mediaType: 'special',
  },
}

const handler = defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event)
    const categorySlug = String(query.category || 'you-may-also-watch')
    const category = categories[categorySlug]
    const page = Number(query.page || 1)
    const perPage = Number(query.perPage || 24)
    const safePage = Number.isInteger(page) && page > 0 ? page : 1
    const safePerPage = Number.isInteger(perPage) && perPage > 0 ? Math.min(perPage, 50) : 24

    if (!category) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Category not found.',
      })
    }

    const currentYear = getCurrentYear()
    const loader = category.useCurrentYearCompleted
      ? async (offset: number, limit: number): Promise<MalListResponse> => {
          const seasonalResults = await Promise.allSettled(
            seasons.map((season) => fetchMalSeasonalAnime(event, currentYear, season, limit, offset)),
          )
          const responses = seasonalResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
          const seasonalData = responses.flatMap((response) => response.data || [])
          const hasCompletedAnime = seasonalData.some(
            (item) => item.node && isCompletedTvSeriesInYear(item.node, currentYear),
          )
          const fallbackResponse = hasCompletedAnime
            ? undefined
            : await fetchMalAnimeRanking(event, 'all', limit, offset)
          const data = [...seasonalData, ...(fallbackResponse?.data || [])]
          const hasNextPage =
            responses.some((response) => response.paging?.next) || Boolean(fallbackResponse?.paging?.next)

          return {
            data,
            paging: {
              next: hasNextPage ? 'next' : undefined,
            },
          }
        }
      : category.useCurrentSeason
        ? (() => {
            const { season, year } = getCurrentSeason()

            return (offset: number, limit: number) => fetchMalSeasonalAnime(event, year, season, limit, offset)
          })()
        : (offset: number, limit: number) => fetchMalAnimeRanking(event, category.rankingType || 'all', limit, offset)

    const response = await collectMalResults(loader, {
      page: safePage,
      perPage: safePerPage,
      predicate: (anime) => {
        if (category.mediaType && anime.media_type !== category.mediaType) {
          return false
        }

        if (category.useCurrentYearCompleted && !isCompletedTvSeriesInYear(anime, currentYear)) {
          return false
        }

        if (category.status && anime.status !== category.status) {
          return false
        }

        if (category.minMean && (anime.mean || 0) < category.minMean) {
          return false
        }

        return true
      },
    })

    return {
      slug: categorySlug,
      title: category.useCurrentYearCompleted ? `Completed in ${currentYear}` : category.title,
      description: category.description,
      pageInfo: response.pageInfo,
      results: response.items.map((anime) => {
        const card = toCardResult(anime)

        return {
          ...card,
          date: formatDisplayDate(categorySlug === 'completed' ? getCompletionDate(anime) : anime.start_date),
        }
      }),
    }
  },
  {
    maxAge: 60 * 15,
    name: 'myanimelist-catalog-safe-genres-v8',
    getKey: (event) => getRequestURL(event).searchParams.toString(),
  },
)

export default handler
