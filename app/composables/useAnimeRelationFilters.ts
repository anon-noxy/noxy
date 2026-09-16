type AnimeRelationIdentity = {
  id: number
}

export const useAnimeRelationFilters = () => {
  const excludeSeasonCollectionItems = <T extends AnimeRelationIdentity>(
    items: T[],
    seasonItems: AnimeRelationIdentity[],
  ) => {
    const seasonIds = new Set(seasonItems.map((item) => item.id))

    return items.filter((item) => !seasonIds.has(item.id))
  }

  return {
    excludeSeasonCollectionItems,
  }
}
