import { fetchMalAnimeSearch, parseMalList, toCardResult } from '../../utils/mal'

const handler = defineCachedEventHandler(
  async (event) => {
    const query = String(getQuery(event).q || '').trim()

    if (query.length < 2) {
      return []
    }

    const response = await fetchMalAnimeSearch(event, query, 5, 0)

    return parseMalList(response)
      .slice(0, 5)
      .map((anime) => ({
        ...toCardResult(anime),
        image: anime.main_picture?.large || anime.main_picture?.medium || '',
      }))
  },
  {
    maxAge: 60 * 5,
    name: 'myanimelist-search-safe-genres-v5',
    getKey: (event) => getRequestURL(event).searchParams.toString(),
  },
)

export default handler
