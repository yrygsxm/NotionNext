import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

/**
 * 搜索路由
 * @param {*} props
 * @returns
 */
const Search = props => {
  const { posts } = props

  const router = useRouter()
  const keyword =
    typeof router?.query?.s === 'string' ? router.query.s.trim() : ''
  const [searchIndex, setSearchIndex] = useState(null)
  const [searchPage, setSearchPage] = useState(1)
  const staticSearch = siteConfig('STATIC_SEARCH')

  useEffect(() => {
    setSearchPage(1)
    if (!staticSearch || !keyword) return
    const controller = new AbortController()
    fetch('/search-index.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Search index unavailable')
        return response.json()
      })
      .then(setSearchIndex)
      .catch(error => {
        if (error.name !== 'AbortError') console.warn(error.message)
      })
    return () => controller.abort()
  }, [keyword, staticSearch])

  let filteredPosts
  // 静态过滤
  if (keyword) {
    const terms = keyword
      .normalize('NFKC')
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    filteredPosts = (posts || []).filter(post => {
      const content = searchIndex?.[post.id]
      if (staticSearch && content !== undefined) {
        return terms.every(term => content.includes(term))
      }
      const tagContent = post?.tags ? post?.tags.join(' ') : ''
      const categoryContent = Array.isArray(post.category)
        ? post.category.join(' ')
        : post.category || ''
      const searchContent =
        post.title + post.summary + tagContent + categoryContent
      return searchContent.toLowerCase().includes(keyword.toLowerCase())
    })
  } else {
    filteredPosts = []
  }

  const totalResults = filteredPosts.length
  const pageSize = 12
  const totalPages = Math.ceil(totalResults / pageSize)
  if (staticSearch)
    filteredPosts = filteredPosts.slice(
      (searchPage - 1) * pageSize,
      searchPage * pageSize
    )
  props = {
    ...props,
    posts: filteredPosts,
    postCount: totalResults,
    page: 1,
    staticSearch
  }

  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <>
      <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
      {staticSearch && totalPages > 1 && (
        <nav
          aria-label='搜索结果分页'
          className='flex justify-center items-center gap-4 py-6'
        >
          <button
            disabled={searchPage === 1}
            onClick={() => setSearchPage(page => page - 1)}
            className='px-3 py-2 rounded disabled:opacity-40'
          >
            上一页
          </button>
          <span>
            {searchPage} / {totalPages}
          </span>
          <button
            disabled={searchPage === totalPages}
            onClick={() => setSearchPage(page => page + 1)}
            className='px-3 py-2 rounded disabled:opacity-40'
          >
            下一页
          </button>
        </nav>
      )}
    </>
  )
}

/**
 * 浏览器前端搜索
 */
export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    locale
  })
  const { allPages } = props
  props.posts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  delete props.allPages
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Search
