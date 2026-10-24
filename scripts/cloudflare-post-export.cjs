const fs = require('node:fs')
const path = require('node:path')
const { writeSitemapIndex } = require('./build-sitemap-index.cjs')

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

const output = path.resolve('out')
const files = walk(output)
const documents = files.filter(
  file =>
    file.endsWith('.json') &&
    file.includes(`${path.sep}_next${path.sep}data${path.sep}`)
)
const exportedPosts = new Map()
let expectedPosts
for (const file of documents) {
  const props = JSON.parse(fs.readFileSync(file, 'utf8')).pageProps
  if (!props) continue
  if (file.endsWith(`${path.sep}search.json`)) expectedPosts = props.posts
  if (props.post?.slug) exportedPosts.set(props.post.slug, props.post)
}
if (!Array.isArray(expectedPosts) || expectedPosts.length === 0) {
  throw new Error(
    'No published articles found; refusing to publish an empty export.'
  )
}

function plainText(value) {
  if (!Array.isArray(value)) return typeof value === 'string' ? value : ''
  return value
    .map(item => (Array.isArray(item) ? plainText(item[0]) : plainText(item)))
    .join('')
}

const index = Object.create(null)
const missing = []
for (const expected of expectedPosts) {
  if (expected.password) continue
  const post = exportedPosts.get(expected.slug)
  if (!post?.blockMap?.block || Object.keys(post.blockMap.block).length === 0) {
    missing.push(expected.slug)
    continue
  }
  const content = Object.values(post.blockMap.block)
    .map(record => {
      const block = record?.value
      const properties = block?.properties || {}
      return Object.values(properties).map(plainText).join(' ')
    })
    .join(' ')
  index[expected.id] = [
    expected.title,
    expected.summary,
    expected.tags,
    expected.category,
    content
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .normalize('NFKC')
    .toLocaleLowerCase()
}
if (missing.length)
  throw new Error(`Article bodies missing: ${missing.join(', ')}`)

fs.writeFileSync(path.join(output, 'search-index.json'), JSON.stringify(index))
// This blog uses static assets only. Keep inherited AI API stubs from invoking
// Pages Functions, including when an automated client probes those endpoints.
fs.writeFileSync(
  path.join(output, '_routes.json'),
  JSON.stringify({ version: 1, include: ['/*'], exclude: ['/*'] })
)
fs.writeFileSync(
  path.join(output, '_redirects'),
  [
    '/feed /rss/feed.xml 301',
    '/search/:keyword/page/:page /search?s=:keyword 302',
    '/search/:keyword /search?s=:keyword 302',
    ...[
      ['必看精选', '推荐'],
      ['热门文章', '新闻'],
      ['实用教程', '教程']
    ].map(
      ([from, to]) =>
        `/tag/${encodeURIComponent(from)} /tag/${encodeURIComponent(to)} 301`
    ),
    ''
  ].join('\n')
)
fs.writeFileSync(
  path.join(output, '_headers'),
  [
    '/_next/static/*',
    '  Cache-Control: public, max-age=31536000, immutable',
    '/search-index.json',
    '  Cache-Control: public, max-age=300',
    '/ads.txt',
    '  Content-Type: text/plain; charset=utf-8',
    ''
  ].join('\n')
)

for (const name of [
  'index.html',
  '404.html',
  'ads.txt',
  'robots.txt',
  'sitemap.xml',
  'rss/feed.xml'
]) {
  if (!fs.existsSync(path.join(output, name)))
    throw new Error(`Missing required static asset: ${name}`)
}
const sitemapSummary = writeSitemapIndex(output)
const finalFiles = walk(output)
if (finalFiles.length > 20000)
  throw new Error(`Pages Free file limit exceeded: ${finalFiles.length}`)
for (const file of finalFiles) {
  if (fs.statSync(file).size > 25 * 1024 * 1024)
    throw new Error(`Pages file size limit exceeded: ${file}`)
}
console.log(
  JSON.stringify({
    staticSearchArticles: Object.keys(index).length,
    validatedArticles: expectedPosts.length,
    sitemap: sitemapSummary,
    files: finalFiles.length
  })
)
