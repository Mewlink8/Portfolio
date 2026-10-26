import { cachedJson, fetchFeed, fetchJson } from '../lib/feeds.mts'

interface KevCatalog {
  vulnerabilities: {
    cveID: string
    vendorProject: string
    product: string
    vulnerabilityName: string
    dateAdded: string
    shortDescription: string
    knownRansomwareCampaignUse: string
  }[]
}

export default async () => {
  const [alertes, avis, actualites, hackerNews, kev] = await Promise.all([
    fetchFeed('https://www.cert.ssi.gouv.fr/alerte/feed/', 'CERT-FR Alerte', 8),
    fetchFeed('https://www.cert.ssi.gouv.fr/avis/feed/', 'CERT-FR Avis', 12),
    fetchFeed('https://www.cert.ssi.gouv.fr/actualite/feed/', 'CERT-FR Actualité', 6),
    fetchFeed('https://feeds.feedburner.com/TheHackersNews', 'The Hacker News', 12),
    fetchJson<KevCatalog>('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'),
  ])

  const exploited = (kev?.vulnerabilities || [])
    .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    .slice(0, 15)
    .map((v) => ({
      id: v.cveID,
      vendor: v.vendorProject,
      product: v.product,
      name: v.vulnerabilityName,
      dateAdded: v.dateAdded,
      description: v.shortDescription,
      ransomware: v.knownRansomwareCampaignUse === 'Known',
      link: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
    }))

  return cachedJson(
    {
      updatedAt: new Date().toISOString(),
      alertes,
      avis,
      actualites: [...hackerNews, ...actualites].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      exploited,
    },
    1800,
  )
}

export const config = { path: '/api/cyberveille' }
