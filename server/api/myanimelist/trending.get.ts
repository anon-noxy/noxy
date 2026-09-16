import {
  fetchMalAnimeRanking,
  fetchMalSeasonalAnime,
  getJapaneseOriginPriority,
  hasChineseOriginCue,
  parseDatePart,
  parseMalList,
  toCardResult,
  type MalAnime,
} from '../../utils/mal'

type TrendingAnime = {
  id: number
  title: string
  romajiTitle: string
  image: string
  color?: string
}

const TRENDING_LIMIT = 12
const TRENDING_FETCH_LIMIT = 50
const seasons = ['winter', 'spring', 'summer', 'fall']

const getTrendingYear = () => new Date().getFullYear()

const getLatestSeasonForYear = (year: number) => {
  const now = new Date()

  if (now.getFullYear() !== year) {
    return 'winter'
  }

  const month = now.getMonth() + 1

  if (month >= 10) return 'fall'
  if (month >= 7) return 'summer'
  if (month >= 4) return 'spring'

  return 'winter'
}

const getTrendingSeasonOrder = (year: number) => {
  const latestSeason = getLatestSeasonForYear(year)
  const latestSeasonIndex = seasons.indexOf(latestSeason)
  const latestSeasonValue = seasons[latestSeasonIndex]

  if (!latestSeasonValue) {
    return seasons
  }

  return [latestSeasonValue, ...seasons.slice(0, latestSeasonIndex).reverse(), ...seasons.slice(latestSeasonIndex + 1)]
}

const appendUniqueTrending = (target: TrendingAnime[], source: TrendingAnime[]) => {
  const existingIds = new Set(target.map((anime) => anime.id))

  for (const anime of source) {
    if (existingIds.has(anime.id)) continue

    existingIds.add(anime.id)
    target.push(anime)

    if (target.length >= TRENDING_LIMIT) break
  }
}

const prioritizeJapaneseAnime = (animes: MalAnime[]) => {
  return animes
    .map((anime, index) => ({
      anime,
      index,
      priority: getJapaneseOriginPriority(anime),
    }))
    .sort((left, right) => right.priority - left.priority || left.index - right.index)
    .map(({ anime }) => anime)
}

const getAnimeYear = (anime: MalAnime) => anime.start_season?.year || parseDatePart(anime.start_date, 0) || 0

const takeCurrentYearTrending = (animes: MalAnime[], year: number, seasonOrder: string[]) => {
  const seenIds = new Set<number>()
  const seasonPriority = new Map(seasonOrder.map((season, index) => [season, index]))

  return prioritizeJapaneseAnime(
    animes.filter((anime) => {
      if (seenIds.has(anime.id) || getAnimeYear(anime) !== year || hasChineseOriginCue(anime)) {
        return false
      }

      seenIds.add(anime.id)
      return true
    }),
  ).sort(
    (left, right) =>
      (seasonPriority.get(left.start_season?.season || '') ?? seasonOrder.length) -
      (seasonPriority.get(right.start_season?.season || '') ?? seasonOrder.length),
  )
}

const handler = defineCachedEventHandler(
  async (event) => {
    const trendingYear = getTrendingYear()
    const seasonOrder = getTrendingSeasonOrder(trendingYear)
    const seasonalResponses = await Promise.all(
      seasonOrder.map((season) =>
        fetchMalSeasonalAnime(event, trendingYear, season, TRENDING_FETCH_LIMIT, 0, 'anime_num_list_users').catch(
          () => undefined,
        ),
      ),
    )
    const seasonalTrending = takeCurrentYearTrending(
      seasonalResponses.flatMap((response) => parseMalList(response)),
      trendingYear,
      seasonOrder,
    )
    const fallbackTrending = seasonalTrending.length
      ? []
      : takeCurrentYearTrending(
          parseMalList(await fetchMalAnimeRanking(event, 'airing', TRENDING_FETCH_LIMIT, 0)),
          trendingYear,
          seasonOrder,
        )

    const sourceTrending = seasonalTrending.length ? seasonalTrending : fallbackTrending
    const spotlightIds = new Set(sourceTrending.slice(0, TRENDING_LIMIT).map((anime) => anime.id))
    const malTrending = sourceTrending.map((anime) => {
      const card = toCardResult(anime)

      return {
        id: anime.id,
        title: card.title,
        romajiTitle: card.romajiTitle,
        image: anime.main_picture?.large || anime.main_picture?.medium || '',
        color: '',
      }
    })

    const trending: TrendingAnime[] = []

    appendUniqueTrending(
      trending,
      malTrending.filter((anime) => !spotlightIds.has(anime.id)),
    )
    appendUniqueTrending(trending, malTrending)

    return trending.slice(0, TRENDING_LIMIT)
  },
  {
    maxAge: 60 * 30,
    name: 'mal-trending-current-year-japanese-v7',
  },
)

export default handler
