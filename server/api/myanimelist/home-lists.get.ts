import {
  fetchMalAnimeRanking,
  fetchMalSeasonalAnime,
  formatDisplayDate,
  getCompletionDate,
  type MalCardResult,
  type MalAnime,
  type MalListResponse,
  isCompletedTvSeriesInYear,
  parseMalList,
  toCardResult,
} from '../../utils/mal'
import { fetchAniListReleasedEpisodeCounts } from '../../utils/anilist'

type HomeListItem = Pick<MalCardResult, 'id' | 'title' | 'romajiTitle' | 'type'> & {
  date: string
  episodes: number
  sub: number
  dub: number
  image: string
  color?: string
  views: number
  favorites: number
}

type HomeListsResponse = {
  newAdded: HomeListItem[]
  upcoming: HomeListItem[]
  mostPopular: HomeListItem[]
  mostViewed: {
    day: HomeListItem[]
    week: HomeListItem[]
    month: HomeListItem[]
  }
  mostFavorite: HomeListItem[]
  completed: HomeListItem[]
}

const currentYearSeasons = ['winter', 'spring', 'summer', 'fall']

const getHomeListsYear = (event: Parameters<typeof getQuery>[0]) => {
  const currentYear = new Date().getUTCFullYear()
  const requestedYear = Number(getQuery(event).year)

  return Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= currentYear + 1
    ? requestedYear
    : currentYear
}

const toHomeListItem = (
  anime: MalAnime,
  dateValue: string | undefined,
  releasedEpisodeCounts: Map<number, number>,
): HomeListItem => {
  const card = toCardResult(anime)
  const availableEpisodes = releasedEpisodeCounts.has(anime.id)
    ? releasedEpisodeCounts.get(anime.id) || 0
    : anime.num_episodes || 0

  return {
    id: anime.id,
    title: card.title,
    romajiTitle: card.romajiTitle,
    type: card.type,
    date: formatDisplayDate(dateValue),
    episodes: availableEpisodes,
    sub: availableEpisodes,
    dub: availableEpisodes,
    image: anime.main_picture?.large || anime.main_picture?.medium || '',
    color: '',
    views: anime.num_list_users || anime.popularity || 0,
    favorites: anime.num_favorites || 0,
  }
}

const toHomeListItems = (
  animes: MalAnime[],
  dateValue: (anime: MalAnime) => string | undefined,
  releasedEpisodeCounts: Map<number, number>,
): HomeListItem[] => {
  return animes.map((anime) => toHomeListItem(anime, dateValue(anime), releasedEpisodeCounts))
}

const takeUniqueAnime = (animes: MalAnime[], limit: number, excludedIds = new Set<number>()): MalAnime[] => {
  const seenIds = new Set(excludedIds)
  const uniqueAnimes: MalAnime[] = []

  for (const anime of animes) {
    if (seenIds.has(anime.id)) continue

    seenIds.add(anime.id)
    uniqueAnimes.push(anime)

    if (uniqueAnimes.length >= limit) break
  }

  return uniqueAnimes
}

const compareCompletionDateDesc = (left: MalAnime, right: MalAnime) => {
  const leftDate = getCompletionDate(left) || ''
  const rightDate = getCompletionDate(right) || ''

  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate)

  return (right.mean || 0) - (left.mean || 0) || (right.num_list_users || 0) - (left.num_list_users || 0)
}

const getCompletedAnimeForYear = (
  responses: Array<MalListResponse | undefined>,
  year: number,
  fallbackAnimes: MalAnime[],
) => {
  const animes = [...responses.flatMap((response) => parseMalList(response)), ...fallbackAnimes]

  return takeUniqueAnime(
    animes.filter((anime) => isCompletedTvSeriesInYear(anime, year)).sort(compareCompletionDateDesc),
    5,
  )
}

const handler = defineCachedEventHandler(
  async (event): Promise<HomeListsResponse> => {
    const currentYear = getHomeListsYear(event)
    const [
      upcomingResponse,
      recommendedResponse,
      mostPopularResponse,
      mostViewedDayResponse,
      mostViewedWeekResponse,
      mostViewedMonthResponse,
      mostFavoriteResponse,
      currentYearSeasonResponses,
    ] = await Promise.all([
      fetchMalAnimeRanking(event, 'upcoming', 16, 0),
      fetchMalAnimeRanking(event, 'all', 50, 0),
      fetchMalAnimeRanking(event, 'bypopularity', 5, 0),
      fetchMalAnimeRanking(event, 'airing', 7, 0),
      fetchMalAnimeRanking(event, 'bypopularity', 7, 0),
      fetchMalAnimeRanking(event, 'all', 7, 0),
      fetchMalAnimeRanking(event, 'favorite', 5, 0),
      Promise.all(
        currentYearSeasons.map((season) =>
          fetchMalSeasonalAnime(event, currentYear, season, 50, 0).catch(() => undefined),
        ),
      ),
    ])

    const upcomingAnime = takeUniqueAnime(parseMalList(upcomingResponse), 16)
    const mostPopularAnime = takeUniqueAnime(parseMalList(mostPopularResponse), 5)
    const mostFavoriteAnime = takeUniqueAnime(parseMalList(mostFavoriteResponse), 5)
    const mostViewedDayAnime = takeUniqueAnime(parseMalList(mostViewedDayResponse), 7)
    const mostViewedWeekAnime = takeUniqueAnime(parseMalList(mostViewedWeekResponse), 7)
    const mostViewedMonthAnime = takeUniqueAnime(parseMalList(mostViewedMonthResponse), 7)
    const completedAnime = getCompletedAnimeForYear(
      currentYearSeasonResponses,
      currentYear,
      parseMalList(recommendedResponse),
    )
    const usedHomeListIds = new Set([
      ...upcomingAnime.map((anime) => anime.id),
      ...mostPopularAnime.map((anime) => anime.id),
      ...mostFavoriteAnime.map((anime) => anime.id),
      ...completedAnime.map((anime) => anime.id),
    ])
    const recommendedAnime = takeUniqueAnime(parseMalList(recommendedResponse), 5, usedHomeListIds)
    const releasedEpisodeCounts = await fetchAniListReleasedEpisodeCounts(
      [
        ...upcomingAnime,
        ...recommendedAnime,
        ...mostPopularAnime,
        ...mostViewedDayAnime,
        ...mostViewedWeekAnime,
        ...mostViewedMonthAnime,
        ...mostFavoriteAnime,
        ...completedAnime,
      ].map((anime) => anime.id),
    )

    return {
      newAdded: toHomeListItems(recommendedAnime, (anime) => anime.start_date, releasedEpisodeCounts),
      upcoming: toHomeListItems(upcomingAnime, (anime) => anime.start_date, releasedEpisodeCounts),
      mostPopular: toHomeListItems(mostPopularAnime, (anime) => anime.start_date, releasedEpisodeCounts),
      mostViewed: {
        day: toHomeListItems(mostViewedDayAnime, (anime) => anime.start_date, releasedEpisodeCounts),
        week: toHomeListItems(mostViewedWeekAnime, (anime) => anime.start_date, releasedEpisodeCounts),
        month: toHomeListItems(mostViewedMonthAnime, (anime) => anime.start_date, releasedEpisodeCounts),
      },
      mostFavorite: toHomeListItems(mostFavoriteAnime, (anime) => anime.start_date, releasedEpisodeCounts),
      completed: toHomeListItems(completedAnime, getCompletionDate, releasedEpisodeCounts),
    }
  },
  {
    getKey: (event) => `year-${getHomeListsYear(event)}`,
    maxAge: 60 * 30,
    name: 'mal-home-lists-completed-tv-v8',
  },
)

export default handler
