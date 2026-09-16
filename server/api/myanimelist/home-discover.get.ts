import {
  fetchMalAnimeDetails,
  fetchMalAnimeRanking,
  parseMalList,
  formatDisplayDate,
  type MalAnime,
  type MalCardResult,
  toCardResult,
  toSafeGenres,
} from '../../utils/mal'

const genrePriority = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
]

const getAnimeGenres = (anime: MalAnime) => toSafeGenres(anime.genres)

type HomeDiscoverItem = Pick<MalCardResult, 'id' | 'title' | 'romajiTitle' | 'type'> & {
  date: string
  episodes: number
  image: string
}

type HomeDiscoverResponse = {
  youMayAlsoWatch: HomeDiscoverItem[]
  genres: string[]
}

const toHomeDiscoverItem = (anime: MalAnime): HomeDiscoverItem => {
  const card = toCardResult(anime)

  return {
    id: anime.id,
    title: card.title,
    romajiTitle: card.romajiTitle,
    type: card.type,
    date: formatDisplayDate(anime.start_date),
    episodes: anime.num_episodes || 0,
    image: anime.main_picture?.large || anime.main_picture?.medium || '',
  }
}

const parsePreferenceIds = (value: unknown) => {
  return String(value || '')
    .split(',')
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 16)
}

const uniqueById = (animes: MalAnime[]) => {
  const seenIds = new Set<number>()

  return animes.filter((anime) => {
    if (seenIds.has(anime.id)) return false

    seenIds.add(anime.id)

    return true
  })
}

const scoreAnimeForPreferences = (anime: MalAnime, preferredGenres: Map<string, number>) => {
  const genres = getAnimeGenres(anime)
  const genreScore = genres.reduce((score, genre) => score + (preferredGenres.get(genre) || 0), 0)
  const qualityScore = anime.mean || 0
  const popularityScore = Math.log10((anime.num_list_users || 0) + 1)
  const favoriteScore = Math.log10((anime.num_favorites || 0) + 1)

  return genreScore * 10 + qualityScore + popularityScore + favoriteScore
}

const handler = defineCachedEventHandler(
  async (event): Promise<HomeDiscoverResponse> => {
    const preferenceIds = parsePreferenceIds(getQuery(event).preferenceIds)
    const excludedPreferenceIds = new Set(preferenceIds)

    const [discoverResponse, popularResponse, airingResponse, genresResponse, preferenceAnimes] = await Promise.all([
      fetchMalAnimeRanking(event, 'all', 24, 0),
      fetchMalAnimeRanking(event, 'bypopularity', 50, 0),
      fetchMalAnimeRanking(event, 'airing', 50, 0),
      fetchMalAnimeRanking(event, 'bypopularity', 50, 0),
      Promise.all(
        Array.from(new Set(preferenceIds))
          .slice(0, 8)
          .map((id) => fetchMalAnimeDetails(event, id).catch(() => null)),
      ),
    ])

    const validPreferenceAnimes = preferenceAnimes.filter(Boolean) as MalAnime[]
    const preferredGenres = validPreferenceAnimes.reduce((genreCounts, anime) => {
      getAnimeGenres(anime).forEach((genre) => {
        const occurrenceWeight = preferenceIds.filter((id) => id === anime.id).length || 1

        genreCounts.set(genre, (genreCounts.get(genre) || 0) + occurrenceWeight)
      })

      return genreCounts
    }, new Map<string, number>())

    const discoverCandidates = uniqueById([
      ...parseMalList(discoverResponse),
      ...parseMalList(popularResponse),
      ...parseMalList(airingResponse),
    ]).filter((anime) => !excludedPreferenceIds.has(anime.id) && (anime.mean || 0) >= 7)

    const rankedDiscoverCandidates = discoverCandidates.sort((left, right) => {
      if (!preferredGenres.size) {
        return (right.mean || 0) - (left.mean || 0)
      }

      return scoreAnimeForPreferences(right, preferredGenres) - scoreAnimeForPreferences(left, preferredGenres)
    })

    const youMayAlsoWatch = rankedDiscoverCandidates.slice(0, 12).map(toHomeDiscoverItem)

    const genres = Array.from(new Set(parseMalList(genresResponse).flatMap((anime) => getAnimeGenres(anime)))).sort(
      (left, right) => {
        const leftPriority = genrePriority.indexOf(left)
        const rightPriority = genrePriority.indexOf(right)

        if (leftPriority !== -1 || rightPriority !== -1) {
          return (leftPriority === -1 ? 999 : leftPriority) - (rightPriority === -1 ? 999 : rightPriority)
        }

        return left.localeCompare(right)
      },
    )

    return {
      youMayAlsoWatch,
      genres,
    }
  },
  {
    maxAge: 60 * 10,
    name: 'myanimelist-home-discover-safe-genres-v2',
    getKey: (event) => parsePreferenceIds(getQuery(event).preferenceIds).join(',') || 'default',
  },
)

export default handler
