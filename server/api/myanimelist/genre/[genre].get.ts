import { collectMalResults, fetchMalAnimeRanking, toCardResult, toSafeGenres } from '../../../utils/mal'

const handler = defineCachedEventHandler(
  async (event) => {
    const genre = decodeURIComponent(getRouterParam(event, 'genre') || '').trim()
    const query = getQuery(event)
    const page = Number(query.page || 1)
    const perPage = Number(query.perPage || 24)
    const safePage = Number.isInteger(page) && page > 0 ? page : 1
    const safePerPage = Number.isInteger(perPage) && perPage > 0 ? Math.min(perPage, 50) : 24

    if (!genre) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A genre is required.',
      })
    }

    const response = await collectMalResults(
      (offset, limit) => fetchMalAnimeRanking(event, 'bypopularity', limit, offset),
      {
        page: safePage,
        perPage: safePerPage,
        predicate: (anime) => toSafeGenres(anime.genres).some((item) => item.toLowerCase() === genre.toLowerCase()),
      },
    )

    return {
      genre,
      pageInfo: response.pageInfo,
      results: response.items.map((anime) => toCardResult(anime)),
    }
  },
  {
    maxAge: 60 * 15,
    name: 'myanimelist-genre-safe-genres-v5',
    getKey: (event) => `${getRouterParam(event, 'genre') || ''}:${getRequestURL(event).searchParams.toString()}`,
  },
)

export default handler
