export type AnimeFuzzyDate = {
  year?: number
  month?: number
  day?: number
}

export const useAnimeFormatters = () => {
  const formatAnimeText = (value?: string, fallback = 'N/A') => {
    if (!value) return fallback

    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  const formatAnimeDate = (date?: AnimeFuzzyDate, fallback = 'N/A') => {
    if (!date?.year) return fallback

    const month = date.month ? String(date.month).padStart(2, '0') : '??'
    const day = date.day ? String(date.day).padStart(2, '0') : '??'

    return `${date.year}-${month}-${day}`
  }

  const formatAnimeDisplayDate = (date?: AnimeFuzzyDate, fallback = '') => {
    if (!date?.year) return fallback

    const month = date.month
      ? new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(date.year, date.month - 1, 1))
      : ''
    const day = date.day ? `${date.day}, ` : ''

    return month ? `${month} ${day}${date.year}` : String(date.year)
  }

  const formatAnimeNumber = (value?: number, fallback = 'N/A') => {
    return value ? value.toLocaleString() : fallback
  }

  const cleanAnimeDescription = (description?: string, fallback = '') => {
    return (
      description
        ?.replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim() || fallback
    )
  }

  const cleanAnimeInlineDescription = (description?: string, fallback = '') => {
    return cleanAnimeDescription(description, fallback).replace(/\s+/g, ' ').trim()
  }

  return {
    cleanAnimeDescription,
    cleanAnimeInlineDescription,
    formatAnimeDate,
    formatAnimeDisplayDate,
    formatAnimeNumber,
    formatAnimeText,
  }
}
