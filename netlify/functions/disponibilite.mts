import { cachedJson, fetchJson, fetchWithTimeout } from '../lib/feeds.mts'

// Sites surveillés : ajoutez ou retirez des entrées ici
const SITES = [
  { name: 'Mon portfolio', url: 'https://portfolio-mathieu.netlify.app' },
  { name: 'Mon GitHub', url: 'https://github.com/Mewlink8' },
  { name: 'Root-Me', url: 'https://www.root-me.org' },
  { name: 'TryHackMe', url: 'https://tryhackme.com' },
  { name: 'API Open-Meteo', url: 'https://api.open-meteo.com/v1/forecast?latitude=48.58&longitude=7.75&current=temperature_2m' },
  { name: 'Google', url: 'https://www.google.com' },
]

// Pages de statut officielles (format Atlassian Statuspage)
const STATUS_PAGES = [
  { name: 'GitHub', url: 'https://www.githubstatus.com' },
  { name: 'Netlify', url: 'https://www.netlifystatus.com' },
  { name: 'Cloudflare', url: 'https://www.cloudflarestatus.com' },
  { name: 'Discord', url: 'https://discordstatus.com' },
  { name: 'Epic Games', url: 'https://status.epicgames.com' },
  { name: 'Reddit', url: 'https://www.redditstatus.com' },
  { name: 'OpenAI', url: 'https://status.openai.com' },
]

interface StatusSummary {
  status: { indicator: string; description: string }
  components?: { name: string; status: string; group_id: string | null; group?: boolean }[]
  incidents?: { name: string; status: string; impact: string; shortlink: string; updated_at: string }[]
}

async function checkSite(site: { name: string; url: string }) {
  const start = Date.now()
  try {
    const res = await fetchWithTimeout(site.url, 10000, { redirect: 'follow' })
    await res.body?.cancel()
    return { ...site, up: res.status < 500, status: res.status, latency: Date.now() - start }
  } catch {
    return { ...site, up: false, status: null, latency: null }
  }
}

async function checkStatusPage(page: { name: string; url: string }) {
  const data = await fetchJson<StatusSummary>(`${page.url}/api/v2/summary.json`)
  if (!data) {
    return { ...page, indicator: 'unknown', description: 'Statut indisponible', degraded: [], incidents: [] }
  }
  return {
    ...page,
    indicator: data.status.indicator,
    description: data.status.description,
    degraded: (data.components || [])
      .filter((c) => !c.group && c.status !== 'operational')
      .map((c) => ({ name: c.name, status: c.status }))
      .slice(0, 6),
    incidents: (data.incidents || []).slice(0, 3).map((i) => ({
      name: i.name,
      status: i.status,
      impact: i.impact,
      link: i.shortlink,
      updatedAt: i.updated_at,
    })),
  }
}

export default async () => {
  const [sites, services] = await Promise.all([
    Promise.all(SITES.map(checkSite)),
    Promise.all(STATUS_PAGES.map(checkStatusPage)),
  ])
  return cachedJson({ updatedAt: new Date().toISOString(), sites, services }, 60)
}

export const config = { path: '/api/disponibilite' }
