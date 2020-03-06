import freezeDry from 'freeze-dry'
import { resolveSelector, getRangeSelector } from './web-annotation'

// Selection that isn't empty
class DocumentSelection {
  document: Document
  selection: Selection
  static get(document: Document): null | DocumentSelection {
    const selection = document.getSelection()
    if (selection && selection.type != 'None') {
      return new DocumentSelection(document, selection)
    } else {
      return null
    }
  }
  *ranges() {
    const { selection } = this
    const count = selection.rangeCount
    let index = 0
    while (index < count) {
      yield selection.getRangeAt(index++)
    }
  }
  cloneContents() {
    let fragment = this.document.createDocumentFragment()
    for (const range of this.ranges()) {
      const content = range.cloneContents()
      fragment.append(content)
    }
    return fragment
  }
  *contents() {
    for (let range of this.ranges()) {
      const { startContainer, endContainer, commonAncestorContainer } = range

      let root = commonAncestorContainer
      let left = startContainer
      let right = endContainer

      // walk over all the nodes on the right of the
      // range while going up the parent chain until
      // the common ancestor is reached.
      while (left.parentNode !== root) {
        if (left.nextSibling != null) {
          left = left.nextSibling
          yield left
        } else if (left.parentNode != null) {
          left = left.parentNode
        } else {
          break
        }
      }

      // Collect all the nodes to the left of the
      // range end while gonig up the parent chain
      // until common ancestor. We'll have to yeald that
      // at the end.
      const trailers = []
      while (right.parentNode !== root) {
        if (right.previousSibling != null) {
          right = right.previousSibling
          if (right === left) {
            return
          } else {
            trailers.unshift(right)
          }
        } else if (right.parentNode != null) {
          right = right.parentNode
        } else {
          break
        }
      }

      let next = left.nextSibling
      while (next !== right && next != null) {
        yield next
        next = next.nextSibling
      }

      yield* trailers
    }
  }
  toText() {
    let text = ''
    for (const range of this.ranges()) {
      const prefix = text === '' ? '' : '\n\n'
      text += prefix + range.toString()
    }
    return text
  }
  constructor(document: Document, selection: Selection) {
    this.document = document
    this.selection = selection
  }
}

const onload = async () => {
  // Create copy for scraping
  const source = <Document>document.cloneNode(true)

  const dialog = html`
    <dialog ${{ style: style.dialog }}>
      <svg
        class="xcrpt-close-button"
        ${{ style: style.closeButton }}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 15.18 12 L 22.34 4.84 C 23.22 3.96 23.22 2.54 22.34 1.66 C 21.46 0.78 20.04 0.78 19.16 1.66 L 12 8.82 L 4.84 1.66 C 3.96 0.78 2.54 0.78 1.66 1.66 C 0.78 2.54 0.78 3.96 1.66 4.84 L 8.82 12 L 1.66 19.16 C 0.78 20.04 0.78 21.46 1.66 22.34 C 2.1 22.78 2.67 23 3.25 23 C 3.83 23 4.4 22.78 4.84 22.34 L 12 15.18 L 19.16 22.34 C 19.6 22.78 20.17 23 20.75 23 C 21.33 23 21.9 22.78 22.34 22.34 C 23.22 21.46 23.22 20.04 22.34 19.16 L 15.18 12 Z"
        />
      </svg>
    </dialog>
  `
  document.body.append(dialog)
  dialog.querySelector('svg')!.onclick = () => dialog.remove()

  const selection = DocumentSelection.get(document)
  const cardData = selection ? await service.clipSelection(selection) : await service.scrape(source)
  const card = viewCard(cardData)
  dialog.append(card)

  const content = await freezeDry(source, { addMetadata: true })
  const archiveURL = `data:text/html,${encodeURIComponent(content)}`
  const capturedAt = new Date().toISOString()
  const frame = viewFrame({ url: archiveURL, capturedAt })
  dialog.append(frame)
}

const viewCard = (data: ScrapeData) => html`
  <div ${{ style: style.card }}>
    <header ${{ style: style.header }}>${data.url.split('://').pop()}</header>
    <span
      ${{
        style: {
          ...style.icon,
          backgroundImage: `url(${new URL(data.icon || '/favicon.ico', data.url).href})`,
        },
      }}
    ></span>
    <div
      ${{
        style: {
          ...style.image,
          backgroundImage: `url(${new URL(data.hero[0], data.url).href})`,
        },
      }}
    ></div>
    <div ${{ style: style.title }}>${data.title}</div>
    <p ${{ style: style.description }}>${data.description}</p>
  </div>
`

const viewFrame = ({ url }: { url: string; capturedAt: string }) => html`
  <iframe ${{ style: style.frame, sandbox: true, src: url }}><iframe> </iframe></iframe>
`
const html = (strings: TemplateStringsArray, ...variables: any[]): Element => {
  const template = document.createElement(`template`)
  let html = ``
  let index = 0
  while (index < strings.length) {
    html += strings[index]
    if (index < variables.length) {
      const variable = variables[index]
      if (typeof variable === 'string') {
        html += variable
      } else {
        html += serailizeAttributes(variable)
      }
    }
    index++
  }

  while (index < variables.length) {
    html += variables[index].toString()
    index++
  }

  template.innerHTML = html
  return template.content.firstElementChild!
}

const serailizeAttributes = (attributes: { [key: string]: number | string | object }) => {
  let result = ''
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') {
      let style = ''
      for (const [key, rule] of Object.entries(value)) {
        style += `${normalizeName(key)}: ${rule};`
      }
      result += `style="${style}"`
    } else {
      result += `${normalizeName(name)}="${value}"`
    }
  }
  return result
}

const normalizeName = (key: string) => {
  const [first, ...rest] = key.split(/([A-Z])/)
  let name = first
  let index = 0
  while (index < rest.length) {
    let first = rest[index].toLowerCase()
    let second = (rest[index + 1] || '').toLowerCase()
    name += `-${first}${second}`
    index += 2
  }
  return name
}

const style = {
  closeButton: {
    height: '50px',
    width: '20px',
    marginRight: '10px',
    top: 0,
    zIndex: 2,
    opacity: 1,
    position: 'fixed',
    right: '5px',
    cursor: 'pointer',
    fillColor: 'black',
  },
  dialog: {
    padding: '20px',
    fontFamily: 'Helvetica, sans-serif',
    fontSize: '12px',
    top: 0,
    left: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    display: 'block',
    position: 'fixed',
    height: '100%',
    width: '100%',
    inset: '0px',
    margin: '0px',
    border: 'none',
    zIndex: 999999,
  },
  frame: {
    width: '600px',
    height: '600px',
    border: 'none',
    position: 'absolute',
    left: '300px',
    top: '20px',
    borderRadius: '4px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
    color: '#444',
    height: '300px',
    margin: '0 10px',
    overflow: 'hidden',
    position: 'relative',
    width: '240px',
  },
  header: {
    height: '24px',
    lineHeight: '24px',
    margin: '0px 24px 0px 10px',
    overflow: 'hidden',
    position: 'relative',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  title: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    lineHeight: '18px',
    margin: '0 10px 8px 10px',
    width: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon: {
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    borderRadius: '3px',
    position: 'absolute',
    right: '4px',
    top: '4px',
    width: '16px',
    height: '16px',
  },
  image: {
    backgroundColor: '#ddd',
    backgroundImage: 'none',
    backgroundPosition: 'center center',
    backgroundSize: 'cover',
    height: '150px',
    marginBottom: '14px',
    position: 'relative',
    width: '240px',
  },
  description: {
    fontSize: '12px',
    lineHeight: '18px',
    height: '72px',
    margin: '0px 10px',
    overflow: 'hidden',
    whiteSpace: 'normal',
  },
}

const scape = () => {
  if (document.querySelector('embed[type="application/pdf"]')) {
    const msg = {
      src: window.location.href,
      dataUrl: `data:text/plain,${window.location.href}`,
      capturedAt: new Date().toISOString(),
    }
    chrome.runtime.sendMessage(msg)
  } else {
    freezeDry(document, { addMetadata: true }).then((html: string) => {
      const msg = {
        src: window.location.href,
        dataUrl: `data:text/html,${encodeURIComponent(html)}`,
        capturedAt: new Date().toISOString(),
      }
      chrome.runtime.sendMessage(msg)
    })
  }
}

export type ScrapeData = {
  url: string
  icon: string | null
  hero: string[]
  title: string
  description: string
  name: string
}

export type ArchiveData = {
  url: string
  data: ArrayBuffer
}

const baseURL = (spec: string): string => {
  var url = new URL(spec)
  url.search = ''
  url.hash = ''
  var href = url.href
  return href.endsWith('/') ? href : href + '/'
}

const makeRelative = (url: string): string => './' + url.replace(/:\/\//g, '/')

export type HostMessage =
  | { type: 'scraped'; scraped: ScrapeData }
  | { type: 'archived'; archived: ArchiveData }

const service = {
  async scrape(document: Document = window.document): Promise<ScrapeData> {
    /*
        Pull structured content out of the DOM.
        - Hero images
        - Title
        - Summary
        - Site name
        - Article content
        Things we can use:
        - `<title>`
        - meta description
        - Twitter card meta tags
        - Facebook Open Graph tags
        - Win8 Tile meta tags
        - meta description
        - Search snippet things like schema.org
        - microformats
        https://github.com/mozilla/readability
        http://schema.org/CreativeWork
        https://dev.twitter.com/cards/markup
        https://developers.facebook.com/docs/sharing/webmasters#markup
        https://developer.apple.com/library/ios/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
        http://blogs.msdn.com/b/ie/archive/2014/05/21/support-a-live-tile-for-your-website-on-windows-and-windows-phone-8-1.aspx
        http://www.oembed.com/
        https://developer.chrome.com/multidevice/android/installtohomescreen
        */

    // Utils
    // -----------------------------------------------------------------------------

    // Scraping and content scoring helpers
    // -----------------------------------------------------------------------------

    // @TODO need some methods for scaling and cropping images.

    await service.loaded()

    return {
      url: document.URL,
      icon: scrapeIcon(document.documentElement),
      hero: <string[]>[...scrapeHeroImgUrls(document.documentElement)],
      title: scrapeTitle(document.documentElement, ''),
      description: scrapeDescription(document.documentElement, ''),
      name: scrapeSiteName(document.documentElement, ''),
    }
  },

  async clipSelection(selection: DocumentSelection): Promise<ScrapeData> {
    const { document } = selection
    const url = document.URL
    const icon = scrapeIcon(document.documentElement)
    const title = scrapeTitle(document.documentElement, '')
    const name = scrapeSiteName(document.documentElement, '')
    const [firstRange] = selection.ranges()

    // First try scraping images from content, then fall back to scraping from the document.
    // We just pick the first one.
    let imgs = [
      ...findHeroImgUrls(
        <Element>firstRange.commonAncestorContainer,
        (image) => selection.selection.containsNode(image) && isImgSizeAtLeast(image, 200, 100)
      ),
    ]
    const images = concat([imgs, scrapeHeroImgUrls(document.documentElement)])
    const hero = [...take(1, images)]
    const description = selection.toText()

    return { url, icon, hero, title, description, name }
  },

  async archive(document: Document = window.document): Promise<ArchiveData> {
    const base = baseURL(document.URL)
    const data = new FormData()
    const root = freezeDry(document, {
      signal: null,
      resolveURL: async (resource: { url: string; blob(): Promise<Blob> }) => {
        const blob = await resource.blob()
        const url = new URL(makeRelative(resource.url), base)
        data.set(url.href, blob)
        return url.href
      },
    })
    const blob = root.blob()

    data.set('/', blob)
    const bytes = await new Response(data).arrayBuffer()
    return { url: document.URL, data: bytes }
  },
  loaded() {
    return new window.Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        const listener = (_event: Event) => {
          window.removeEventListener('load', listener)
          resolve()
        }

        window.addEventListener('load', listener)
      }
    })
  },

  send(channel: MessageChannel, message: HostMessage, transfer: ArrayBuffer[] = []) {
    channel.port1.postMessage(message, transfer)
  },
}

// Function

const identity = <a>(x: a): a => x

// Iterables

const filter = function*<a>(p: (item: a) => boolean, source: Iterable<a>): Iterable<a> {
  for (const item of source) {
    if (p(item)) {
      yield item
    }
  }
}

const map = function*<a, b>(f: (item: a) => b, source: Iterable<a>): Iterable<b> {
  for (const item of source) {
    yield f(item)
  }
}

const reduce = <a, b>(reducer: (item: a, state: b) => b, state: b, items: Iterable<a>): b => {
  let result = state
  for (const item of items) {
    result = reducer(item, state)
  }
  return result
}

const concat = function*<a>(iterables: Iterable<Iterable<a>>): Iterable<a> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item
    }
  }
}

const take = function*<a>(n: number, iterable: Iterable<a>): Iterable<a> {
  if (n > 0) {
    let count = 0
    for (const item of iterable) {
      yield item
      if (++count >= n) {
        break
      }
    }
  }
}

const first = <a>(iterable: Iterable<a>, fallback: a): a => {
  for (const item of iterable) {
    return item
  }
  return fallback
}

// DOM

const query = function*<a>(
  selector: string,
  decode: (el: Element) => null | a,
  root: Document | Element | DocumentFragment
): Iterable<a> {
  const elements = [...(<any>root.querySelectorAll(selector))]
  for (const element of elements) {
    const data = decode(element)
    if (data != null) {
      yield data
    }
  }
}

const getText = ({ textContent }: Element): string => textContent || ''

const getContent = (metaEl: Element): string | null =>
  !(metaEl instanceof HTMLMetaElement) ? null : metaEl.content == '' ? null : metaEl.content

const getSrc = (imgEl: HTMLImageElement): string => imgEl.src

const getHref = (linkEl: Element): string | null =>
  linkEl instanceof HTMLLinkElement ? linkEl.href : null

// Does element match a particular tag name?
const matchesTag = (el: Element, pattern: RegExp) => el.tagName.search(pattern) !== -1

const matchesClass = (el: Element, pattern: RegExp) => el.className.search(pattern) !== -1

// Scraper

// Score the content-y-ness of a string. Note that this is an imperfect score
// and you'll be better off if you combine it with other heuristics like
// element classname, etc.
const scoreContentyness = (text: string) => {
  // If paragraph is less than 25 characters, don't count it.
  if (text.length < 25) return 0

  // Ok, we've weeded out the no-good cases. Start score at one.
  var score = 1

  // Add points for any commas within.
  score = score + text.split(',').length

  // For every 100 characters in this paragraph, add another point.
  // Up to 3 points.
  score = score + Math.min(Math.floor(text.length / 100), 3)

  return score
}

// Score a child element to find out how "content-y" it is.
// A score is determined by things like number of commas, etc.
// Maybe eventually link density.
const scoreElContentyness = (el: Element) => scoreContentyness(getText(el))
const isSufficientlyContenty = (el: Element, base = 3) => scoreElContentyness(el) > base

const UNLIKELY_CONTENT_CLASSNAMES = /date|social|community|remark|discuss|disqus|e[\-]?mail|rss|print|extra|share|login|sign|reply|combx|comment|com-|contact|header|menu|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|shoutbox|sidebar|sponsor|shopping|tags|tool|widget|sidebar|sponsor|ad-break|agegate|pagination|pager|popup|tweet|twitter/i

const isUnlikelyCandidate = (el: Element) => matchesClass(el, UNLIKELY_CONTENT_CLASSNAMES)

const countWords = (text: string) => text.split(/\s/).length

// Is text long enough to be content?
const isSufficientlyLong = (text: string) => text.length > 25
const isTextSufficientlyLong = (el: Element) => isSufficientlyLong(getText(el))
const isntEmpty = (text: string) => text != ''

const getElTextLength = (el: Element) => getText(el).length
const sum = (a: number, b: number) => a + b

// Calculat the density of links in content.
const calcLinkDensity = (el: Element) => {
  const linkSizes = query('a', getElTextLength, el)
  const linkSize = reduce(sum, 0, linkSizes)
  const textSize = getElTextLength(el)

  return linkSize / textSize
}

// Is the link density of this element high?
const isHighLinkDensity = (el: Element) => calcLinkDensity(el) > 0.5

// Extract a clean title from text that has been littered with separator
// garbage.
const cleanTitle = (text: string): string => {
  var title = text
  if (text.match(/\s[\|\-:]\s/)) {
    title = text.replace(/(.*)[\|\-:] .*/gi, '$1')

    if (countWords(title) < 3) {
      title = text.replace(/[^\|\-]*[\|\-](.*)/gi, '$1')
    }

    // Fall back to title if word count is too short.
    if (countWords(title) < 5) {
      title = text
    }
  }

  // Trim spaces.
  return title.trim()
}

const getCleanText = (el: Element) => cleanTitle(getText(el))

// Content scrapers
// -----------------------------------------------------------------------------

// Find a good title within page.
// Usage: `scrapeTitle(htmlEl, 'Untitled')`.
const scrapeTitle = (el: Element, fallback = 'Untitled'): string => {
  const candidates = concat([
    query('meta[property="og:title"], meta[name="twitter:title"]', getContent, el),

    // Query hentry Microformats. Note that we just grab the blog title,
    // even on a blog listing page. You're going to associate the first title
    // with the identity of the page because it's the first thing you see on
    // the page when it loads.
    query('.entry-title, .h-entry .p-name', getText, el),
    // @TODO look at http://schema.org/Article `[itemprop=headline]`
    query('title', getCleanText, el),
    // If worst comes to worst, fall back on headings.
    query('h1, h2, h3', getText, el),
    [fallback],
  ])

  return first(candidates, fallback)
}

const scrapeDescriptionFromContent = (pageEl: Element, fallback: string) => {
  // Query for all paragraphs on the page.
  // Trim down paragraphs to the ones we deem likely to be content.
  // Then map to `textContent`.

  const paragraphs = query('p', identity, pageEl)

  const isQualified = (p: Element) => {
    const qualified =
      !isUnlikelyCandidate(p) &&
      isTextSufficientlyLong(p) &&
      !isHighLinkDensity(p) &&
      isSufficientlyContenty(p)

    return qualified
  }

  const qualified = filter(isQualified, paragraphs)
  return map(getText, qualified)
}

// Find a good description for the page.
// Usage: `scrapeDescription(htmlEl, '')`.
const scrapeDescription = (el: Element, fallback: string) => {
  const candidates = concat([
    // Prefer social media descriptions to `meta[name=description]` because they
    // are curated for readers, not search bots.
    query('meta[name="twitter:description"]', getContent, el),
    query('meta[property="og:description"]', getContent, el),
    // Scrape hentry Microformat description.
    query('.entry-summary, .h-entry .p-summary', getText, el),
    // @TODO process description to remove garbage from descriptions.
    query('meta[name=description]', getContent, el),
    // @TODO look at http://schema.org/Article `[itemprop=description]`
    scrapeDescriptionFromContent(el, fallback),
  ])

  return first(candidates, fallback)
}

// You probably want to use the base URL as fallback.
const scrapeSiteName = (el: Element, fallback: string) => {
  const candidates = concat([
    // Prefer the standard meta tag.
    query('meta[name="application-name"]', getContent, el),
    query('meta[property="og:site_name"]', getContent, el),
    // Note that this one is an `@name`.
    query('meta[name="twitter:site"]', getContent, el),
    [fallback],
  ])

  return first(candidates, fallback)
}

const isImgSizeAtLeast = (imgEl: HTMLImageElement, w: number, h: number) =>
  imgEl.naturalWidth > w && imgEl.naturalHeight > h

const isImgHeroSize = (imgEl: HTMLImageElement) => isImgSizeAtLeast(imgEl, 480, 300)

// Collect Twitter image urls from meta tags.
// Returns an array of 1 or more Twitter img urls, or null.
// See https://dev.twitter.com/cards/markup.
const queryTwitterImgUrls = (pageEl: Document | Element | DocumentFragment) =>
  query(
    `
    meta[name="twitter:image"],
    meta[name="twitter:image:src"],
    meta[name="twitter:image0"],
    meta[name="twitter:image1"],
    meta[name="twitter:image2"],
    meta[name="twitter:image3"]
    `,
    getContent,
    pageEl
  )

// Collect Facebook Open Graph image meta tags.
// Returns an aray of 0 or more meta elements.
// These 2 meta tags are equivalent. If the first doesn't exist, look for
// the second.
// See https://developers.facebook.com/docs/sharing/webmasters#images.
const queryOpenGraphImgUrls = (el: Document | Element | DocumentFragment) =>
  query(
    `
    meta[property="og:image"],
    meta[property="og:image:url"]
    `,
    getContent,
    el
  )

const findHeroImgUrls = (
  pageEl: Document | Element | DocumentFragment,
  isQualified: (image: HTMLImageElement) => boolean = isImgHeroSize
) => {
  const candidates = [...(<Iterable<HTMLImageElement>>query('img', identity, pageEl))]
  console.log(candidates)
  const heroSized = [...filter(isQualified, candidates)]
  console.log(heroSized)
  const urls = [...map(getSrc, heroSized)]
  console.log(urls)

  console.log('------------------------------')
  // can be a lot of images we limit to 4
  return take(4, filter(isntEmpty, urls))
}

// Scrape up to 4 featured images.
// We favor meta tags like `twitter:image` and `og:image` because those are
// hand-curated. If we don't them, we'll dig through the content ourselves.
// Returns an array of image urls.
// @TODO it might be better just to grab everything, then de-dupe URLs.
const scrapeHeroImgUrls = (el: Document | Element | DocumentFragment) => {
  // Note that Facebook OpenGraph image queries are kept seperate from Twitter
  // image queries. This is to prevent duplicates when sites include both.
  // If we find Twitter first, we'll return it and never look for Facebook.
  // We'll favor Twitter image URLs, since there can be more than one.
  const all = concat([queryOpenGraphImgUrls(el), queryTwitterImgUrls(el), findHeroImgUrls(el)])

  return all
}

const scrapeIcon = (el: HTMLElement): string | null => {
  const candidates = query(
    `
    link[rel="shortcut icon"],
    link[rel="apple-touch-icon"],
    link[rel="mask-icon"],
    link[rel="icon"]
    `,
    getHref,
    el
  )
  return first(candidates, null)
}
// If we have 4 or more images, we show 4 images in combination.
// Otherwise, use the first featured image only.
const isImgCombo = (imgUrls: string[]) => imgUrls.length > 3

onload()
