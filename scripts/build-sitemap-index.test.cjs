const {test} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {writeSitemapIndex} = require('./build-sitemap-index.cjs')

function fixture(t, extra = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'appdo-sitemap-test-'))
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}))
  fs.mkdirSync(path.join(dir, 'article'))
  for (const name of ['index', 'archive', 'category', 'tag']) fs.writeFileSync(path.join(dir, name + '.html'), '<h1>Published</h1>')
  fs.writeFileSync(path.join(dir, 'article', ' space & test.html'), '<h1>Published</h1>')
  const urls = ['', '/archive', '/category', '/tag', '/article/ space &amp; test', '/', '/missing']
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(slug => `<url><loc>https://appdo.xyz${slug}</loc><lastmod>2026-10-24</lastmod></url>`).join('')}${extra}</urlset>`)
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /private/\nSitemap: https://appdo.xyz/sitemap.xml\n')
  return dir
}

test('indexes all three sites, deduplicates canonical URLs and excludes missing HTML', t => {
  const dir = fixture(t)
  const summary = writeSitemapIndex(dir)
  assert.equal(summary.mainURLs, 5)
  assert.equal(summary.duplicatesRemoved, 1)
  assert.deepEqual(summary.unexportedRemoved, ['https://appdo.xyz/missing'])
  const main = fs.readFileSync(path.join(dir, 'sitemap-main.xml'), 'utf8')
  assert.match(main, /article\/%20space%20&amp;%20test/)
  assert.doesNotMatch(main, /\/missing/)
  const index = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')
  assert.equal((index.match(/<sitemap>/g) || []).length, 3)
  for (const url of summary.sitemaps) assert.ok(index.includes(`<loc>${url}</loc>`))
  const robots = fs.readFileSync(path.join(dir, 'robots.txt'), 'utf8')
  assert.ok(robots.includes('Disallow: /private/'))
  assert.equal((robots.match(/^Sitemap:/gm) || []).length, 3)
})

test('rejects unexpected hosts instead of silently publishing an invalid cross-site URL list', t => {
  const dir = fixture(t, '<url><loc>https://other.example/page</loc></url>')
  assert.throws(() => writeSitemapIndex(dir), /Unexpected host/)
})

test('rejects missing homepage exports instead of publishing an incomplete map', t => {
  const dir = fixture(t)
  fs.unlinkSync(path.join(dir, 'index.html'))
  assert.throws(() => writeSitemapIndex(dir), /incomplete/)
})
