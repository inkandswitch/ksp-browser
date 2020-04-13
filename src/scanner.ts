import { clipSummary } from './scraper'
import * as protocol from './protocol'

const readURL = (href: string, base?: URL): URL => {
  const url = new URL(href, base)
  url.search = ''
  url.hash = ''
  return url
}

export const read = (target: HTMLDocument): protocol.InputResource => {
  const url = readURL(document.URL)
  const { title, description } = clipSummary(document)

  return {
    url: url.href,
    links: readLinks(document),
    cid: null,
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

// Twitter web card metadata for description is limited to 200 characters, which is why
// we aim to capture summary in 150 - 200 character range.
const readLinkContext = (link: HTMLAnchorElement): string => {
  const max = 200
  const min = 150
  let summary = link.text
  // If link content itself is larger shorten by cutting number of sentences.
  if (summary.length > max) {
    return limitSentences(summary, 1, min, max)
  }
  // If too short then get some content from siblings.
  else {
    let pre = iterateSentences(link, -1)
    let post = iterateSentences(link, 1)
    let preDone = false
    let postDone = false

    while ((!preDone || !postDone) && summary.length < min) {
      if (!preDone) {
        let { value, done } = pre.next()
        if (done) {
          preDone = true
        } else {
          if (summary.length + value.length < max) {
            summary = `${value}${summary}`
          } else {
            preDone = true
          }
        }
      }

      if (!postDone) {
        let { value, done } = post.next()
        if (done) {
          postDone = true
        } else {
          if (summary.length + value.length < max) {
            summary = `${summary}${value}`
          } else {
            postDone = true
          }
        }
      }
    }

    return summary
  }
}

const previousSibling = (node: Node) => node.previousSibling
const nextSibling = (node: Node) => node.nextSibling

let iterateNodes = function* (node: Node, next: (node: Node) => Node | null): Iterable<Node> {
  let target: Node | null = node
  while (target) {
    let sibling = next(target)
    while (sibling) {
      yield sibling
      sibling = next(sibling)
    }
    target = target.parentElement
  }
}

let iterateSentences = function* (node: Node, direction: -1 | 1): Iterator<string> {
  const nodes =
    direction > 0 ? iterateNodes(node, nextSibling) : iterateNodes(node, previousSibling)
  for (const node of nodes) {
    const content = node.textContent || ''
    let text = content.trim()
    if (text[0] != content[0]) {
      text = `${content[0]}${text}`
    }
    if (text[text.length - 1] != content[content.length - 1]) {
      text = `${text}${content[content.length - 1]}`
    }

    const sentences = text.split('.')
    const count = sentences.length
    if (count === 1) {
      yield text
    } else {
      let index = direction > 0 ? 0 : sentences.length - 1
      while (index >= 0 && index < count) {
        yield `${sentences[index]}.`
        index += direction
      }
    }
  }
}

const limitSentences = (input: string, direction: 1 | -1, min: number, max: number): string => {
  const sentences = input.split('.')
  let index = direction > 0 ? 0 : sentences.length - 1
  let text = sentences[index]
  index += direction
  while (text.length < min && index < sentences.length && index > 0) {
    const sentence = sentences[index]
    text = direction > 0 ? `${text}.${sentence}` : `${sentence}.${text}`
    index += 1
  }

  while (text.length < max && index < sentences.length && index > 0) {
    const sentence = sentences[index]
    if (text.length + sentence.length + 1 > max) {
      return text
    } else {
      text = direction > 0 ? `${text}.${sentence}` : `${sentence}.${text}`
    }
    index += 1
  }

  if (text.length > max) {
    return `${text.slice(0, max - 1)}…`
  } else {
    return text
  }
}
