import type { Image, Link as LinkNode } from 'mdast'
import { memo, type ReactNode } from 'react'
import { safeHttpUrl } from '../../utils/url.js'

export const Link = memo(function Link({
  node,
  children,
}: {
  node: LinkNode
  children: ReactNode
}) {
  // 页内锚点显示链接文字。
  if (node.url.startsWith('#')) {
    return children
  }

  // 邮件地址显示链接文字。
  if (node.url.startsWith('mailto:')) {
    return children
  }

  // URL 解析失败时 href 为空，链接文字仍可显示。
  const href = safeHttpUrl(node.url, { assumeHttps: true })

  return (
    <a href={href} title={node.title || undefined} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
})

/** Markdown 图片显示为指向图片地址的链接 */
export function ImageAsLink({ node }: { node: Image }) {
  const url = safeHttpUrl(node.url, { assumeHttps: true })
  return (
    <a href={url} title={node.title ?? ''} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  )
}
