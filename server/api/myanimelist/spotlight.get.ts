import {
  fetchMalAnimeDetails,
  fetchMalAnimeRanking,
  fetchMalSeasonalAnime,
  getJapaneseOriginPriority,
  hasChineseOriginCue,
  parseDatePart,
  parseMalList,
  toCardResult,
  toFormat,
  toNextAiringEpisode,
  toPercentScore,
  toSafeGenres,
  toStatus,
  type MalAnime,
} from '../../utils/mal'
import { fetchAniListAnimeBanner } from '../../utils/anilist'
import { getAvailableEpisodeCount } from '../../../shared/utils/episodeAvailability'

const seasons = ['winter', 'spring', 'summer', 'fall']

const cleanDescription = (description?: string) => {
  return description
    ?.replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const spotlightLimit = 12
const spotlightFetchLimit = 100

const getSpotlightYear = () => new Date().getFullYear()

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

const getSpotlightSeasonOrder = (year: number) => {
  const latestSeason = getLatestSeasonForYear(year)
  const latestSeasonIndex = seasons.indexOf(latestSeason)
  const latestSeasonValue = seasons[latestSeasonIndex]

  if (!latestSeasonValue) {
    return seasons
  }

  return [latestSeasonValue, ...seasons.slice(0, latestSeasonIndex).reverse(), ...seasons.slice(latestSeasonIndex + 1)]
}

const getAnimeYear = (anime: MalAnime) => anime.start_season?.year || parseDatePart(anime.start_date, 0) || 0

const getAnimeEpisodeCount = (anime: MalAnime) => {
  return getAvailableEpisodeCount({
    status: toStatus(anime.status),
    episodes: anime.num_episodes || 0,
    nextAiringEpisode: toNextAiringEpisode(anime),
  })
}

const getAnimeScorePercent = (anime: MalAnime) => toPercentScore(anime.mean) || 0

const isSpotlightCandidate = (anime: MalAnime, spotlightYear: number) => {
  return (
    getAnimeYear(anime) === spotlightYear &&
    toFormat(anime.media_type) === 'TV' &&
    toStatus(anime.status) === 'RELEASING' &&
    !hasChineseOriginCue(anime) &&
    getAnimeEpisodeCount(anime) > 0
  )
}

const sortSpotlightAnime = (animes: MalAnime[], seasonOrder: string[]) => {
  const seasonPriority = new Map(seasonOrder.map((season, index) => [season, index]))

  return animes
    .map((anime, index) => ({
      anime,
      index,
      scorePercent: getAnimeScorePercent(anime),
      seasonIndex: seasonPriority.get(anime.start_season?.season || '') ?? seasonOrder.length,
      originPriority: getJapaneseOriginPriority(anime),
    }))
    .sort(
      (left, right) =>
        right.scorePercent - left.scorePercent ||
        right.originPriority - left.originPriority ||
        left.seasonIndex - right.seasonIndex ||
        left.index - right.index,
    )
    .map(({ anime }) => anime)
}

const takeSpotlightAnime = (animes: MalAnime[], spotlightYear: number, seasonOrder: string[]) => {
  const seenIds = new Set<number>()

  return sortSpotlightAnime(
    animes.filter((anime) => {
      if (seenIds.has(anime.id) || !isSpotlightCandidate(anime, spotlightYear)) {
        return false
      }

      seenIds.add(anime.id)
      return true
    }),
    seasonOrder,
  ).slice(0, spotlightLimit)
}

const finalizeSpotlightAnime = (animes: MalAnime[], spotlightYear: number, seasonOrder: string[]) => {
  return sortSpotlightAnime(
    animes.filter((anime) => {
      return isSpotlightCandidate(anime, spotlightYear)
    }),
    seasonOrder,
  ).slice(0, spotlightLimit)
}

const withMatchedDetailDescriptions = async (event: Parameters<typeof fetchMalAnimeDetails>[0], animes: MalAnime[]) => {
  return Promise.all(
    animes.map(async (anime) => {
      const details = await fetchMalAnimeDetails(event, anime.id).catch(() => null)

      if (!details) {
        return anime
      }

      return {
        ...anime,
        ...details,
        background: details.background || anime.background,
        synopsis: details.synopsis || anime.synopsis,
      }
    }),
  )
}

const toSpotlightAnime = (anime: MalAnime, fallbackYear: number, banner: string) => {
  const card = toCardResult(anime)
  const image = anime.main_picture?.large || anime.main_picture?.medium || ''
  const availableEpisodes = getAnimeEpisodeCount(anime)

  return {
    id: anime.id,
    title: card.title,
    japaneseTitle: card.romajiTitle,
    banner,
    image,
    color: '',
    type: card.type,
    genres: toSafeGenres(anime.genres),
    releaseDate: String(anime.start_season?.year || parseDatePart(anime.start_date, 0) || fallbackYear),
    quality: card.score ? `${card.score}%` : '',
    sub: availableEpisodes,
    dub: availableEpisodes,
    description: cleanDescription(anime.synopsis || anime.background) || 'No description is available yet.',
  }
}

const handler = defineCachedEventHandler(
  async (event) => {
    const spotlightYear = getSpotlightYear()
    const seasonOrder = getSpotlightSeasonOrder(spotlightYear)
    const seasonalResponses = await Promise.all(
      seasonOrder.map((season) =>
        fetchMalSeasonalAnime(event, spotlightYear, season, spotlightFetchLimit, 0, 'anime_score').catch(
          () => undefined,
        ),
      ),
    )
    const seasonalAnimes = takeSpotlightAnime(
      seasonalResponses.flatMap((response) => parseMalList(response)),
      spotlightYear,
      seasonOrder,
    )
    const animes = seasonalAnimes.length
      ? seasonalAnimes
      : takeSpotlightAnime(
          parseMalList(await fetchMalAnimeRanking(event, 'airing', spotlightFetchLimit, 0)),
          spotlightYear,
          seasonOrder,
        )
    const [matchedDetailAnimes, bannerEntries] = await Promise.all([
      withMatchedDetailDescriptions(event, animes),
      Promise.all(animes.map(async (anime) => [anime.id, await fetchAniListAnimeBanner(anime.id)] as const)),
    ])
    const animesWithDescriptions = finalizeSpotlightAnime(matchedDetailAnimes, spotlightYear, seasonOrder)
    const bannersById = new Map(bannerEntries)

    return animesWithDescriptions.map((anime) =>
      toSpotlightAnime(anime, spotlightYear, bannersById.get(anime.id) || ''),
    )
  },
  {
    maxAge: 60 * 10,
    name: 'mal-spotlight-current-year-releasing-tv-score-v11',
  },
)

export default handler
