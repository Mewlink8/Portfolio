import { cachedJson, fetchFeed, fetchJson } from '../lib/feeds.mts'

interface SteamItem {
  id: number
  name: string
  discounted: boolean
  discount_percent: number
  original_price: number | null
  final_price: number
  currency: string
  large_capsule_image: string
  header_image?: string
}

interface SteamCategory {
  items: SteamItem[]
}

interface Giveaway {
  title: string
  worth: string
  thumbnail: string
  platforms: string
  end_date: string
  open_giveaway_url: string
}

function steamGames(category: SteamCategory | undefined, limit: number) {
  const seen = new Set<number>()
  return (category?.items || [])
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .slice(0, limit)
    .map((item) => ({
      name: item.name,
      image: item.header_image || item.large_capsule_image,
      price: item.final_price ? `${(item.final_price / 100).toFixed(2).replace('.', ',')} €` : 'Gratuit',
      originalPrice: item.discounted && item.original_price ? `${(item.original_price / 100).toFixed(2).replace('.', ',')} €` : null,
      discount: item.discount_percent || 0,
      link: `https://store.steampowered.com/app/${item.id}`,
    }))
}

export default async () => {
  const [jvc, gamekult, steam, giveaways] = await Promise.all([
    fetchFeed('https://www.jeuxvideo.com/rss/rss.xml', 'Jeuxvideo.com', 10),
    fetchFeed('https://www.gamekult.com/feed.xml', 'Gamekult', 10),
    fetchJson<Record<string, SteamCategory>>('https://store.steampowered.com/api/featuredcategories?cc=fr&l=french'),
    fetchJson<Giveaway[]>('https://www.gamerpower.com/api/giveaways?type=game&sort-by=date'),
  ])

  return cachedJson(
    {
      updatedAt: new Date().toISOString(),
      news: [...jvc, ...gamekult].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15),
      topSellers: steamGames(steam?.top_sellers, 8),
      newReleases: steamGames(steam?.new_releases, 8),
      comingSoon: steamGames(steam?.coming_soon, 8),
      specials: steamGames(steam?.specials, 8),
      freeGames: (Array.isArray(giveaways) ? giveaways : []).slice(0, 8).map((g) => ({
        title: g.title,
        worth: g.worth,
        image: g.thumbnail,
        platforms: g.platforms,
        endDate: g.end_date,
        link: g.open_giveaway_url,
      })),
    },
    1800,
  )
}

export const config = { path: '/api/gaming' }
