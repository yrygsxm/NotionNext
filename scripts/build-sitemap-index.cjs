const fs = require('node:fs')
const path = require('node:path')

const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const relatedSitemaps = [
  'https://saily.appdo.xyz/sitemap.xml',
  'https://plasma.appdo.xyz/sitemap.xml',
  'https://appdo.xyz/sitemap-about.xml'
]
const escapeXml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
const unescapeXml = value => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

function hasExportedPage(output, url) {
  const names = [url.pathname, decodeURIComponent(url.pathname)]
  return names.some(name => {
    const base = path.resolve(output, '.' + name)
    if (base !== output && !base.startsWith(output + path.sep)) return false
    return [path.join(base, 'index.html'), base + '.html'].some(file => fs.existsSync(file) && fs.statSync(file).isFile())
  })
}

function writeSitemapIndex(directory) {
  const output = path.resolve(directory)
  const source = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8')
  if (!source.includes('<urlset')) throw new Error('Expected the generated main-site URL sitemap before indexing.')
  const entries = new Map()
  const removed = []
  let duplicates = 0
  for (const match of source.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)) {
    const raw = match[1].match(/<loc>([\s\S]*?)<\/loc>/)?.[1]
    if (!raw) throw new Error('Sitemap entry has no location.')
    const url = new URL(unescapeXml(raw.trim()))
    if (url.origin !== 'https://appdo.xyz') throw new Error('Unexpected host in main-site sitemap.')
    if (url.search || url.hash || !hasExportedPage(output, url)) {
      removed.push(url.href)
      continue
    }
    const lastmod = match[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1]
    if (lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error('Invalid sitemap modification date.')
    const previous = entries.get(url.href)
    if (previous) duplicates++
    if (!previous || (lastmod || '') > (previous.lastmod || '')) entries.set(url.href, {lastmod})
  }
  if (!entries.has('https://appdo.xyz/') || entries.size < 5) throw new Error('Refusing to publish an incomplete main-site sitemap.')
  const urls = [...entries].map(([url, {lastmod}]) => `  <url><loc>${escapeXml(url)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n')
  const main = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${namespace}">\n${urls}\n</urlset>\n`
  fs.writeFileSync(path.join(output, 'sitemap-main.xml'), main)
  // About is a single public page; its language switch does not create URLs.
  // Central hosting is covered by the verified appdo.xyz Domain property.
  const about = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${namespace}">\n  <url><loc>https://about.appdo.xyz/</loc></url>\n</urlset>\n`
  fs.writeFileSync(path.join(output, 'sitemap-about.xml'), about)
  const sitemaps = ['https://appdo.xyz/sitemap-main.xml', ...relatedSitemaps]
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${namespace}">\n${sitemaps.map(url => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`
  fs.writeFileSync(path.join(output, 'sitemap.xml'), index)
  const robotsFile = path.join(output, 'robots.txt')
  const robots = fs.readFileSync(robotsFile, 'utf8').replace(/^\s*Sitemap:.*$/gim, '').trimEnd()
  fs.writeFileSync(robotsFile, `${robots}\n\nSitemap: https://appdo.xyz/sitemap.xml\n${relatedSitemaps.map(url => `Sitemap: ${url}`).join('\n')}\n`)
  return {mainURLs:entries.size, duplicatesRemoved:duplicates, unexportedRemoved:removed, sitemaps}
}

module.exports = {writeSitemapIndex}
