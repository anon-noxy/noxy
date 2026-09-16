export type EpisodeSourceItem = {
  title?: string
  url?: string
}

export type EpisodeSourceMedia = {
  status?: string
  episodes?: number
  nextAiringEpisode?: {
    episode?: number
  }
  streamingEpisodes?: EpisodeSourceItem[]
}

const parseEpisodeNumber = (title?: string) => {
  if (!title) {
    return 0
  }

  const match = title.match(/(?:episode|ep\.?|#)\s*0*(\d+)/i)
  const episode = Number(match?.[1] || 0)

  return Number.isInteger(episode) && episode > 0 ? episode : 0
}

const toEpisodeRange = (count: number) => {
  return Array.from({ length: count }, (_, index) => index + 1)
}

const isCompleteEpisodeList = (episodes: number[]) => {
  return Boolean(episodes.length && episodes[0] === 1 && episodes.every((episode, index) => episode === index + 1))
}

const getKnownEpisodeCount = (media: EpisodeSourceMedia) => {
  if (media.status === 'RELEASING' && media.nextAiringEpisode?.episode) {
    return Math.max(media.nextAiringEpisode.episode - 1, 0)
  }

  return media.episodes || 0
}

const shouldCapToKnownEpisodeCount = (media: EpisodeSourceMedia, knownEpisodeCount: number) => {
  if (!knownEpisodeCount) return false

  return (
    media.status === 'FINISHED' ||
    media.status === 'CANCELLED' ||
    (media.status === 'RELEASING' && Boolean(media.nextAiringEpisode?.episode))
  )
}

export const getAvailableEpisodeNumbers = (media?: EpisodeSourceMedia | null) => {
  if (!media || media.status === 'NOT_YET_RELEASED') {
    return []
  }

  const listedEpisodes = Array.from(
    new Set(
      media.streamingEpisodes
        ?.filter((item) => item.url)
        .map((item) => parseEpisodeNumber(item.title))
        .filter((episode) => episode > 0) || [],
    ),
  ).sort((left, right) => left - right)

  const knownEpisodeCount = getKnownEpisodeCount(media)

  if (media.status === 'RELEASING' && isCompleteEpisodeList(listedEpisodes)) {
    const nextAiringEpisode = media.nextAiringEpisode?.episode || 0

    return nextAiringEpisode ? listedEpisodes.filter((episode) => episode < nextAiringEpisode) : listedEpisodes
  }

  if (shouldCapToKnownEpisodeCount(media, knownEpisodeCount)) {
    return toEpisodeRange(knownEpisodeCount)
  }

  if (
    knownEpisodeCount > 0 &&
    media.status !== 'RELEASING' &&
    (!listedEpisodes.length || (listedEpisodes[0] || 0) > 1 || listedEpisodes.length < knownEpisodeCount)
  ) {
    return toEpisodeRange(knownEpisodeCount)
  }

  return listedEpisodes
}

export const getAvailableEpisodeCount = (media?: EpisodeSourceMedia | null) => {
  return getAvailableEpisodeNumbers(media).length
}
