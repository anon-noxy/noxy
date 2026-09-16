import { fetchMalAnimeRanking, parseMalList, toCardResult, toNextAiringEpisode } from '../../utils/mal'

const handler = defineCachedEventHandler(
  async (event) => {
    const now = Math.floor(Date.now() / 1000)
    const sevenDaysFromNow = now + 60 * 60 * 24 * 7
    const response = await fetchMalAnimeRanking(event, 'airing', 100, 0)

    return parseMalList(response)
      .map((anime) => {
        const card = toCardResult(anime)
        const nextAiringEpisode = toNextAiringEpisode(anime, now * 1000)

        return {
          id: Number(`${anime.id}${nextAiringEpisode?.episode || 0}`),
          animeId: anime.id,
          title: card.title,
          romajiTitle: card.romajiTitle,
          episode: nextAiringEpisode?.episode || 0,
          airingAt: nextAiringEpisode?.airingAt || 0,
          type: card.type,
        }
      })
      .filter((item) => item.airingAt >= now && item.airingAt <= sevenDaysFromNow)
      .sort((left, right) => left.airingAt - right.airingAt)
  },
  {
    maxAge: 60 * 10,
    name: 'myanimelist-schedule-release-aware-v6',
  },
)

export default handler
