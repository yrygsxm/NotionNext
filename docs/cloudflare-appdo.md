# APPDO Cloudflare Pages

The `deploy/cloudflare-appdo` branch starts from the former Vercel production
commit `ffa8fc50e338ca5501d87babdcee368caf53a2fa`. The Vercel main branch is
retained for rollback; it is not the source of this Pages deployment.

## Build settings

- Production branch: `deploy/cloudflare-appdo`
- Framework preset: None
- Build command: `yarn build:cloudflare`
- Output directory: `out`
- Build image: v3
- `NODE_VERSION=22`
- `YARN_VERSION=1.22.22`
- `VERCEL_ENV=production`
- `NEXT_PUBLIC_THEME=heo`
- `NEXT_PUBLIC_LINK=https://appdo.xyz`
- `NEXT_PUBLIC_STATIC_SEARCH=true`
- Preserve the original Notion page ID, ad slot IDs, Cusdis application ID,
  author details and other site variables in the Pages dashboard.

The build reads Notion sequentially to reduce upstream rate limiting. It fails
instead of publishing an empty site or missing article bodies. Search is a
browser-side index of public, published, unprotected articles; it does not invoke
a Worker or require an Algolia account. Invalid routes use a static 404 page.
The export explicitly excludes all paths from Pages Functions invocation. The
inherited, unconfigured AI API examples are inactive on this static deployment.

## Publish content changes

After editing Notion, open Cloudflare > Workers & Pages > appdo-blog > Deployments
and retry a production deployment. This rebuilds from the current Notion content.
Code commits to the production branch also trigger builds automatically. A failed
build does not replace the previous successful deployment.

## Sitemap index

The post-export step publishes `/sitemap.xml` as an index of three maps:
`https://appdo.xyz/sitemap-main.xml`, `https://saily.appdo.xyz/sitemap.xml`, and
`https://plasma.appdo.xyz/sitemap.xml`. The main-site map is deduplicated, URLs
are encoded and XML-escaped, and entries without an exported HTML page are
excluded. The child sites keep their own maps and modification dates, so their
future updates do not require rebuilding the blog. The root `robots.txt` also
advertises all three entry points.

Cross-site sitemap submission requires verified ownership of the referenced
sites. The existing `appdo.xyz` Search Console Domain property covers the root
and both subdomains. Submit the root index in that property and inspect actual
processing results; an HTTP 200 response alone is not proof of indexing.

Do not schedule whole-site builds every hour: that exceeds the Free plan's
500-build monthly allowance. No recurring rebuild schedule is configured here.

## Validation before switching domains

Check the preview home page, article bodies and images, search, categories/tags,
pagination, RSS, sitemap, canonical URLs, static 404 responses and ads.txt. Confirm
that the existing Google ad scripts and Cusdis application/page IDs are retained.
Do not test advertisements by clicking your own ads.

## Domain rollback

Before migration, appdo.xyz used A 76.76.21.21 (proxied, auto TTL), and
www.appdo.xyz used CNAME cname.vercel-dns.com (DNS only, auto TTL). If rollback is
needed, restore those records and verify the Vercel service is resumed. Rolling
DNS back alone does not undo Vercel's existing account pause.

Only appdo.xyz and www.appdo.xyz are migration targets. Other subdomains and all
mail records must retain their existing configuration.
