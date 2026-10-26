export interface FeedItem {
  title: string
  link: string
  description: string
  date: string | null
  image: string | null
  source: string
}

const USER_AGENT = 'Mozilla/5.0 (compatible; PortfolioMathieu/1.0)'

function decode(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? decode(match[1]) : ''
}

export async function fetchWithTimeout(url: string, timeoutMs = 8000, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { 'User-Agent': USER_AGENT, ...(init.headers || {}) },
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function fetchJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(url)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

// Lit un flux RSS et renvoie les articles triés du plus récent au plus ancien
export async function fetchFeed(url: string, source: string, limit = 10): Promise<FeedItem[]> {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return []
    const xml = await res.text()
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || []
    return items
      .map((block) => {
        const pubDate = tag(block, 'pubDate') || tag(block, 'dc:date')
        const parsed = pubDate ? new Date(pubDate) : null
        const image = block.match(/<(?:enclosure|media:content|media:thumbnail)[^>]*url="([^"]+)"/i)
        const description = tag(block, 'description')
        return {
          title: tag(block, 'title'),
          link: tag(block, 'link') || tag(block, 'guid'),
          description: description.length > 220 ? description.slice(0, 217) + '...' : description,
          date: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
          image: image ? image[1] : null,
          source,
        }
      })
      .filter((item) => item.title && item.link)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, limit)
  } catch {
    return []
  }
}

export function cachedJson(data: unknown, seconds: number): Response {
  return Response.json(data, {
    headers: {
      'Cache-Control': `public, max-age=${Math.min(seconds, 300)}`,
      'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${seconds}, stale-while-revalidate=${seconds}`,
    },
  })
}
