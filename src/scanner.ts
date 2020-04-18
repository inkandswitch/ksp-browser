import { clipSummary } from './scraper'
import * as protocol from './protocol'

const readURL = (href: string, base?: URL): URL => {
  const url = new URL(href, base)
  url.search = ''
  url.hash = ''
  return url
}

export const read = (target: HTMLDocument): protocol.InputResource => {
  const { title, description, icon, image } = clipSummary(document)

  return {
    url: document.URL,
    links: readLinks(document),
    cid: null,
    icon,
    image,
    title,
    description,
    tags: [],
  }
}

const readLinks = (document: HTMLDocument): protocol.InputLink[] => {
  const baseURL = readURL(document.URL)
  const elements: Iterable<HTMLAnchorElement> = <any>document.body.querySelectorAll('a[href]')
  const links = []

  for (const element of elements) {
    // Compare against the URL without query params & hash  but
    // capture actual URL as e.g. stack overflow search would not
    // land right without it.
    if (baseURL.href !== readURL(element.href, baseURL).href) {
      links.push({
        kind: protocol.LinkKind.INLINE,
        targetURL: new URL(element.href, baseURL).href,
        identifier: null,
        name: element.text.trim(),
        title: element.title,
        referrerFragment: readLinkContext(element),
        referrerLocation: null,
      })
    }
  }

  return links
}

const isSameDocumentURL = (target: URL, source: URL) =>
  target.origin === source.origin && target.pathname === source.pathname

const readLinkContext = (link: HTMLAnchorElement): string => {
  let text = `[${link.text}](${link.href} ${JSON.stringify(link.title)})`

  for (const element of iterateNodes(link, previousInlineSibling, getInlineParent)) {
    const textContent = element.textContent || ''
    text = `${content(element)}${text}`
  }

  for (const element of iterateNodes(link, nextInlineSibling, getInlineParent)) {
    text = `${text}${content(element)}`
  }

  // get rid duplicate whitespaces
  return text.trim().replace(/\s{2}/g, '')
}

const content = (node: Node) => {
  const text = node.textContent || ''
  return (<Element>node).tagName === 'CODE' && text.length > 0 ? `\`${text}\`` : text
}

const INLINE_ELEMENTS = new Set([
  'A',
  'ABBR',
  'ACRONYM',
  'AUDIO',
  'B',
  'BDI',
  'BDO',
  'BIG',
  'BR',
  'BUTTON',
  'CANVAS',
  'CITE',
  'CODE',
  'DATA',
  'DATALIST',
  'DEL',
  'DFN',
  'EM',
  'EMBED',
  'I',
  'IFRAME',
  'IMG',
  'INPUT',
  'INS',
  'KBD',
  'LABEL',
  'MAP',
  'MARK',
  'METER',
  'NOSCRIPT',
  'OBJECT',
  'OUTPUT',
  'PICTURE',
  'PROGRESS',
  'Q',
  'RUBY',
  'S',
  'SAMP',
  'SCRIPT',
  'SELECT',
  'SLOT',
  'SMALL',
  'SPAN',
  'STRONG',
  'SUB',
  'SUP',
  'SVG',
  'TEMPLATE',
  'TEXTAREA',
  'TIME',
  'U',
  'TT',
  'VAR',
  'VIDEO',
  'WBR',
])
const getInlineParent = (node: Node): Node | null => toInlineNode(node.parentElement)

const previousInlineSibling = (node: Node) => toInlineNode(node.previousSibling)
const nextInlineSibling = (node: Node) => toInlineNode(node.nextSibling)
const toInlineNode = (node: null | Node): Node | null => {
  if (node && (node.nodeType === Node.TEXT_NODE || INLINE_ELEMENTS.has((<Element>node).tagName))) {
    return node
  } else {
    return null
  }
}

let iterateNodes = function* (
  node: Node,
  next: (node: Node) => Node | null,
  parent: (node: Node) => Node | null
): Iterable<Node> {
  let target: Node | null = node
  while (target) {
    let sibling = next(target)
    while (sibling) {
      yield sibling
      sibling = next(sibling)
    }
    target = parent(target)
  }
}
