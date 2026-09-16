export type AnimeTitle = {
  english?: string
  romaji?: string
  native?: string
  userPreferred?: string
}

export const useAnimeTitle = (selectedLanguage: Ref<string> = ref('EN')) => {
  const getAnimeTitle = (title?: AnimeTitle, fallback = 'Anime') => {
    if (selectedLanguage.value === 'RO') {
      return title?.romaji || title?.userPreferred || title?.english || title?.native || fallback
    }

    return title?.english || title?.userPreferred || title?.romaji || title?.native || fallback
  }

  const getAlternateAnimeTitle = (title?: AnimeTitle) => {
    if (selectedLanguage.value === 'RO') {
      return title?.english || title?.native || ''
    }

    return title?.romaji || title?.native || ''
  }

  return {
    getAnimeTitle,
    getAlternateAnimeTitle,
  }
}
