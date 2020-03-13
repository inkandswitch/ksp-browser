import { html } from './html'
import { ScrapeData, Selector } from './scraper'
import { annotation } from './annotation'
import { openGraphMarkup, twitterCardMarkup } from './embed'
import { Program, Context } from './program'
import { UIInbox, ExtensionInbox, ArchiveData, ScriptInbox } from './mailbox'
import { BlobReader } from './blob-reader'
import * as Progress from './progress'

type ExcerptState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; excerpt: ScrapeData }

type ArchiveState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; archive: ArchiveData }
  | { status: 'loading'; archive: ArchiveData }
  | { status: 'loaded'; archive: ArchiveData; scrollHeight: number }

type SaveState =
  | { status: 'idle' }
  | { status: 'waiting'; comment: string }
  | { status: 'uploading'; comment: string }
  | { status: 'done'; url: string; cid: string }

type Model = {
  port: chrome.runtime.Port
  excerpt: ExcerptState
  archive: ArchiveState
  save: SaveState
}

type Message =
  | UIInbox
  | { type: 'CloseRequest' }
  | { type: 'DecodeArchive'; archive: ArchiveData }
  | { type: 'ArchiveLoaded'; scrollHeight: number }
  | { type: 'SaveRequest'; comment: string }
  | { type: 'SaveResponse'; cid: string; url: string }

const render = (context: Context<Model>) => {
  const closeButton = <HTMLElement>context.target.querySelector('#close-button')!
  const form = <HTMLFormElement>context.target.querySelector('form')
  const frame = <HTMLIFrameElement>context.target.querySelector('#archive')!
  const time = <HTMLTimeElement>context.target.querySelector('time')
  const comment = <HTMLTextAreaElement>form.querySelector('#comment')

  if (!comment.dataset.focus) {
    comment.dataset.focus = 'true'
    comment.focus()
  }

  if (!closeButton.dataset.onclick) {
    closeButton.dataset.onclick = 'true'
    closeButton.addEventListener('click', context)
  }

  if (!frame.dataset.onload) {
    frame.dataset.onload = 'true'
    frame.addEventListener('load', context)
  }

  if (!form.dataset.onsumbmit) {
    form.dataset.onsubmit = 'true'
    form.addEventListener('submit', context)
  }

  if (!context.target.dataset.onkeyup) {
    context.target.dataset.onkeyup = 'true'
    context.target.ownerDocument!.addEventListener('keyup', context)
  }

  if (time.dateTime == null || time.dateTime === '') {
    const date = new Date()
    time.dateTime = date.toUTCString()
    time.textContent = formatDate(date)
  }

  renderStatus(context)
  renderExcerpt(context)
  renderArchive(context)
}

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const formatDate = (date: Date) =>
  `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`

const renderStatus = (context: Context<Model>) => {
  const state = context.state.save
  const view = <HTMLButtonElement>context.target.querySelector('#submit-button')
  switch (state.status) {
    case 'idle': {
      view.dataset.status = 'idle'
      view.textContent = 'Excerpt'
      return null
    }
    case 'waiting': {
      view.dataset.status = 'busy'
      view.textContent = 'Archiving...'
      return null
    }
    case 'uploading': {
      view.dataset.status = 'busy'
      view.textContent = 'Publishing...'
      return null
    }
    case 'done': {
      view.dataset.status = 'done'
      view.textContent = `Copied URL`
      return null
    }
  }
}

const renderExcerpt = (context: Context<Model>) => {
  const state = context.state.excerpt

  switch (state.status) {
    case 'idle':
    case 'pending': {
      renderCard(context.target, state.status, '', '', '', '', '', '')
      return null
    }
    case 'ready': {
      const data = state.excerpt
      renderAnnotation(context.target, state.excerpt)
      renderCard(
        context.target,
        'ready',
        data.hero[0],
        data.url,
        data.name,
        data.title,
        data.description,
        data.icon || ''
      )
      return null
    }
  }
}

const renderCard = (
  target: HTMLElement,
  status: string,
  image: string,
  url: string,
  name: string,
  title: string,
  body: string,
  icon: string
) => {
  const view = <HTMLElement>target.querySelector('#card')!
  view.dataset.status = status

  const nameView = <HTMLHeadElement>target.querySelector('#name')
  nameView.textContent = name === '' ? title : name

  const imageView = <HTMLImageElement>view.querySelector('.image')
  imageView.style.backgroundImage = `url(${image})`

  const urlView = <HTMLAnchorElement>view.querySelector('.url')
  urlView.href = url
  urlView.textContent = url === '' ? '' : new URL(url).href.split('://').pop()!

  const titleView = <HTMLHeadElement>view.querySelector('.title')
  titleView.textContent = title

  const bodyView = <HTMLParagraphElement>view.querySelector('.body')
  bodyView.textContent = body

  const iconView = <HTMLImageElement>view.querySelector('.icon')
  iconView.style.backgroundImage = `url(${icon})`
}

const renderAnnotation = (target: HTMLElement, data: ScrapeData) => {
  const annotationView = <HTMLScriptElement>target.ownerDocument!.querySelector('#web-annotation')!
  annotationView.textContent = JSON.stringify(
    annotation(data.url, new Date(), '', data.selector || [], './archive.html')
  )
}

const renderArchive = (context: Context<Model>) => {
  const state = context.state.archive
  const progress = <Progress.View>context.target.querySelector('progress')!
  const view = <HTMLIFrameElement>context.target.querySelector('#archive')!
  switch (state.status) {
    case 'idle': {
      view.dataset.status = 'init'
      view.style.height = '0'
      view.style.minHeight = '0'
      view.removeAttribute('src')
      Progress.renderIdle(progress)
      return
    }
    case 'pending': {
      view.dataset.status = 'pending'
      view.style.height = '0'
      view.style.minHeight = '0'
      Progress.renderLoadStart(progress, performance.now())
      return
    }
    case 'ready': {
      view.dataset.status = 'ready'
      view.style.height = '0'
      view.style.minHeight = '0'
      Progress.renderConnected(progress, performance.now())
      return
    }
    case 'loading': {
      view.src = state.archive.archiveURL
      view.style.height = '0'
      view.style.minHeight = '0'
      view.dataset.status = 'loading'
      return
    }
    case 'loaded': {
      view.dataset.status = 'loaded'
      view.style.height = `${state.scrollHeight}px`
      view.style.minHeight = `100vh`
      Progress.renderLoadEnded(progress, performance.now())
      return
    }
  }
}

const onEvent = (event: Event) => {
  const target = <HTMLElement>event.currentTarget
  if (!target) return null
  switch (event.type) {
    case 'keyup': {
      const { key, isComposing, shiftKey } = <KeyboardEvent>event
      if (isComposing) return null
      switch (key) {
        case 'Escape': {
          return { type: 'CloseRequest' }
        }
        case 'Enter': {
          if (shiftKey) {
            return null
          } else {
            const text = <HTMLTextAreaElement>target.querySelector('#comment')
            return { type: 'SaveRequest', comment: text.value.trim() }
          }
        }
        default: {
          return null
        }
      }
    }
    case 'click': {
      switch (target.id) {
        case 'close-button': {
          return { type: 'CloseRequest' }
        }
        default: {
          return null
        }
      }
    }
    case 'submit': {
      event.preventDefault()
      const text = <HTMLTextAreaElement>target.querySelector('#comment')
      return { type: 'SaveRequest', comment: text.value.trim() }
    }
    case 'load': {
      switch (target.id) {
        case 'archive': {
          const frame = <HTMLIFrameElement>target
          const { scrollHeight } = frame.contentWindow!.document.body
          return { type: 'ArchiveLoaded', scrollHeight }
        }
        default: {
          return null
        }
      }
    }
    default: {
      return null
    }
  }
}

const init = (port: chrome.runtime.Port): [Model, null | Promise<Message | null>] => {
  return [
    {
      port,
      excerpt: { status: 'idle' },
      archive: { status: 'idle' },
      save: { status: 'idle' },
    },
    send(port, { type: 'ExcerptRequest' }),
  ]
}

const update = (message: Message, state: Model): [Model, null | Promise<Message | null>] => {
  switch (message.type) {
    case 'ArchiveResponse': {
      return [
        { ...state, archive: { status: 'ready', archive: message.archive } },
        decodeArchive(message.archive),
      ]
    }
    case 'DecodeArchive': {
      return [{ ...state, archive: { status: 'loading', archive: message.archive } }, null]
    }
    case 'ExcerptResponse': {
      return [
        {
          ...state,
          excerpt: { status: 'ready', excerpt: message.excerpt },
          archive: { status: 'pending' },
        },
        send(state.port, { type: 'ArchiveRequest' }),
      ]
    }
    case 'CloseRequest': {
      return [state, close(state)]
    }
    case 'ArchiveLoaded': {
      const archive: ArchiveState = {
        status: 'loaded',
        // @ts-ignore I we can't have end without start
        archive: <ArchiveData>state.archive.archive,
        scrollHeight: message.scrollHeight,
      }

      if (state.save.status === 'waiting') {
        const next: Model = { ...state, archive, save: { ...state.save, status: 'uploading' } }
        return [next, save(next)]
      } else {
        const next: Model = { ...state, archive }
        return [next, null]
      }
    }
    case 'SaveRequest': {
      const status = state.archive.status === 'loaded' ? 'uploading' : 'waiting'
      const next: Model = {
        ...state,
        save: { status, comment: message.comment },
      }

      return [next, status === 'uploading' ? save(next) : null]
    }
    case 'SaveResponse': {
      return [
        { ...state, save: { status: 'done', url: message.url, cid: message.cid } },
        writeToClipboard(message.url),
      ]
    }
  }
}

const close = async (state: Model): Promise<null> => {
  try {
    await send(state.port, { type: 'CloseRequest' })
  } catch (error) {
    // Add-on was unloaded and there is no other way to communicate with
    // contents script.
    window.parent.postMessage({ type: 'unload' }, '*')
  }
  return null
}

const decodeArchive = async (archive: ArchiveData): Promise<Message> => {
  const response = await fetch(archive.archiveURL)
  const blob = await response.blob()
  const archiveURL = URL.createObjectURL(blob)

  return { type: 'DecodeArchive', archive: { archiveURL, capturedAt: archive.capturedAt } }
}

const writeToClipboard = async (text: string): Promise<null> => {
  await navigator.clipboard.writeText(text)
  return null
}

const save = async ({ archive, excerpt, save }: Model): Promise<null | Message> => {
  if (archive.status === 'loaded' && excerpt.status === 'ready' && save.status === 'uploading') {
    return upload(excerpt.excerpt, archive.archive, save.comment, archive.scrollHeight)
  }
  return null
}

const extension = (url: string): string =>
  new URL(url).pathname
    .split('/')
    .pop()!
    .split('.')
    .pop()!

const upload = async (
  excerpt: ScrapeData,
  archive: ArchiveData,
  comment: string,
  scrollHeight: number
): Promise<Message> => {
  const data = new FormData()
  const imageURL = excerpt.hero[0]
  if (imageURL) {
    const image = await fetch(imageURL)
    const name = `image.${extension(imageURL)}`
    const blob = await image.blob()
    data.append('file', new File([blob], name, { type: blob.type }), `base/${name}`)
  }

  const iconURL = excerpt.icon
  if (iconURL) {
    const icon = await fetch(iconURL)
    const name = `icon.${extension(iconURL)}`
    const blob = await icon.blob()
    data.append('file', new File([blob], name, { type: blob.type }), `base/${name}`)
  }

  const content = {
    imageURL,
    image: imageURL ? `image.${extension(imageURL)}` : undefined,
    icon: iconURL ? `icon.${extension(iconURL)}` : undefined,
    url: excerpt.url,
    body: excerpt.description,
    description: excerpt.description,
    title: comment === '' ? excerpt.title : comment,
    name: excerpt.name,
    selector: excerpt.selector,
    time: new Date(archive.capturedAt),
    comment,
  }

  data.append(
    'file',
    new File([JSON.stringify(content)], 'excerpt.json', { type: 'application/json' }),
    'base/excerpt.json'
  )

  const tachyons = await fetch('tachyons.min.css')
  data.append(
    'file',
    new File([await tachyons.blob()], 'tachyons.min.css'),
    'base/tachyons.min.css'
  )

  const uistyle = await fetch('ui.css')
  data.append('file', new File([await uistyle.blob()], 'ui.css'), 'base/ui.css')

  const script = await fetch('xcrpt.js')
  data.append('file', new File([await script.blob()], 'xcrpt.js'), 'base/xcrpt.js')

  data.append(
    'file',

    //@ts-ignore
    new File([excerptHTML(content, scrollHeight)], 'excerpt.html', { type: 'text/html' }),
    'base/index.html'
  )

  const page = await fetch(archive.archiveURL)
  const blob = await page.blob()
  data.append('file', new File([blob], 'archive.html', { type: 'text/html' }), 'base/archive.html')

  const request = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    body: data,
    headers: {
      pinata_api_key: 'e73a3e08728eaac850c1',
      pinata_secret_api_key: 'ad48f903212a95feb32a2571441fde978ce2f13f429531cea59295f3d4a84669',
    },
  })

  const { IpfsHash: cid } = await request.json()
  const url = `https://ipfs.io/ipfs/${cid}`

  return { type: 'SaveResponse', cid, url }
}

type Data = {
  title: string
  name: string
  imageURL: string | undefined
  image: string | undefined
  body: string
  description: string
  url: string
  icon: string | undefined
  time: Date
  comment: string
  selector: null | Selector[]
}
const excerptHTML = (data: Data, scrollHeight: number) => {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <title>${data.title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="utf-8" />
    <link rel="stylesheet" href="tachyons.min.css" />
    <link rel="stylesheet" href="ui.css" />
    ${data.icon ? `<link rel="icon" href="${data.icon}" />` : ``}
    <script src="xcrpt.js"></script>
    <script id="web-annotation" type='application/ld+json;profile="http://www.w3.org/ns/anno.jsonld"'>
    ${JSON.stringify(
      annotation(data.url, data.time, data.comment, data.selector || [], './archive.html'),
      null,
      2
    )}
    </script>
    ${openGraphMarkup({ ...data, image: data.imageURL })}
    ${twitterCardMarkup({ ...data, image: data.imageURL })}
    </head>
  <body class="w-100 flex flex-column sans-serif">
    <header
      class="relative bg-gold sans-serif min-vh-100 overflow-hidden bg-white flex flex-wrap items-center justify-around">
      <article
            id="card"
            class="fl flex flex-column overflow-hidden mv3 br2 bn dark-gray bg-white b-none w-100 w-70-m w-40-l mw6 mh4"
          >
            <img src="" class="image h5 db w-100 br2 br--top" alt="" style="background-image: url(./${
              data.image
            });" />
            <div class="overflow-hidden pa2 ph2-ns">
              <div class="pa1 dt w-100 mt1">
                <div class="dtc">
                  <h1 class="title f5 f4-ns mv0">${data.title}</h1>
                </div>
              </div>
              <p class="body h4 pa1 f6 lh-copy measure-wide mt2 mid-gray">${data.body}</p>
            </div>
            <div class="pa2 f7 h2 bg-near-white flex justify-between">
              <a class="url link underline-hover gray mw6 truncate" href="${data.url}">${
    data.url === '' ? '' : new URL(data.url).href.split('://').pop()!
  }</a>
              <a class="link icon dim pl2 fr br1 w1 h1 mw1" href="#" title="Home" style="background-image: url(./${
                data.icon
              });"></a>
            </div>
          </article>
    <div id="form" class="fl pr4 mb4 black-80 w-100 w-40-l w-70-m">
        <div class="">
          <time class="f7 mv2 dib ttu tracked" datetime="${data.time.toUTCString()}">${formatDate(
    data.time
  )}</time>
          <h3 class="f2 f1-m f-headline-m measure-narrow lh-title mv0">
            <span class="bg-black-90 lh-copy white pa1 tracked-tight">${
              data.name === '' ? data.title : data.name
            }</span>
          </h3>
        </div>
        <div>
          <div
            id="comment"
            name="comment"
            class="outline-0 db f5 border-box hover-black h4 w-100 b--black pa3 bw1 bl br-0 bt-0 bb-0 mv4 bg-transparent"
            aria-describedby="comment-desc"
          >${data.comment}</div>
        </div>
        <a
          id="unfurl-button"
          href="#archive"
          class="b ph3 pv2 input-reset ba b--black pointer f4 no-underline near-white bg-animate bg-near-black hover-bg-transparent hover-near-black inline-flex items-center tc br2 pa2 outline-0">
          Unfurl
        </a>
      </div>
      <progress class="absolute bottom-0 left-0 w-100 ma0 pa0" min="0" max="100" value="0" />
    </header>
    <iframe
      id="archive"
      sandbox="allow-same-origin"
      class="w-100 bn"
      seamless=""
      scrolling="no"
      style="height: ${scrollHeight}px; min-height: 100vh;"
      src="./archive.html"
    ></iframe>
  </body>
</html>
`
}

const send = async (port: chrome.runtime.Port, message: ScriptInbox) => {
  port.postMessage(message)
  return null
}

const getTab = (): Promise<null | chrome.tabs.Tab> =>
  new Promise((resolve) => chrome.tabs.getCurrent(resolve))

const connect = async (): Promise<chrome.runtime.Port> => {
  const tab = await getTab()
  return chrome.tabs.connect(tab!.id!)
}

const onload = async () => {
  const port = await connect()
  const program = Program.ui(
    {
      init,
      onEvent,
      update,
      render,
    },
    port,
    document.body
  )

  port.onMessage.addListener((message: UIInbox) => program.send(message))
}
onload()
