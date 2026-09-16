import { fetchMalAnimeDetails, hasBlockedAnime, toMappedDetails } from '../../../utils/mal'

const handler = defineCachedEventHandler(
  async (event) => {
    const id = Number(getRouterParam(event, 'id'))

    if (!Number.isInteger(id) || id <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'A valid MAL id is required.',
      })
    }

    const response = await fetchMalAnimeDetails(event, id)

    if (!response?.id || hasBlockedAnime(response)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Anime not found.',
      })
    }

    const details = toMappedDetails(response)

    return {
      id: details.id,
      title: details.title,
      description: details.description,
      format: details.format,
      status: details.status,
      episodes: details.episodes,
      duration: details.duration,
      season: details.season,
      seasonYear: details.seasonYear,
      averageScore: details.averageScore,
      genres: details.genres,
      synonyms: details.synonyms,
      coverImage: details.coverImage,
      studios: details.studios,
    }
  },
  {
    maxAge: 60 * 60 * 6,
    name: 'mal-hover-details-safe-genres-v6',
    getKey: (event) => `v6:${getRouterParam(event, 'id')}`,
  },
)

export default handler
