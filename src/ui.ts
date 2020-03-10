import { html } from './html'
import { ScrapeData } from './scraper'
import { Program, Context } from './program'
import { UIInbox, ExtensionInbox, ArchiveData, ScriptInbox } from './mailbox'
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

  renderExcerpt(context)
  renderArchive(context)
}

const renderExcerpt = (context: Context<Model>) => {
  const state = context.state.excerpt

  switch (state.status) {
    case 'idle':
    case 'pending': {
      return renderCard(context.target, state.status, '', '', '', '', '')
    }
    case 'ready': {
      const data = state.excerpt
      const title = data.name == '' ? data.title : data.name
      return renderCard(
        context.target,
        'ready',
        data.hero[0],
        data.url,
        title,
        data.description,
        data.icon || ''
      )
    }
  }
}

const renderCard = (
  target: HTMLElement,
  status: string,
  image: string,
  url: string,
  title: string,
  body: string,
  icon: string
) => {
  const view = <HTMLElement>target.querySelector('#card')!
  view.dataset.status = status

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

const renderArchive = (context: Context<Model>) => {
  const state = context.state.archive
  const progress = <Progress.View>context.target.querySelector('progress')!
  const view = <HTMLIFrameElement>context.target.querySelector('#archive')!
  switch (state.status) {
    case 'idle': {
      view.dataset.status = 'init'
      view.style.height = '0'
      view.removeAttribute('src')
      Progress.renderIdle(progress)
      return
    }
    case 'pending': {
      view.dataset.status = 'pending'
      view.style.height = '0'
      Progress.renderLoadStart(progress, performance.now())
      return
    }
    case 'ready': {
      view.dataset.status = 'ready'
      view.style.height = '0'
      Progress.renderConnected(progress, performance.now())
      return
    }
    case 'loading': {
      view.src = state.archive.archiveURL
      view.style.height = '0'
      view.dataset.status = 'loading'
      return
    }
    case 'loaded': {
      view.dataset.status = 'loaded'
      view.style.height = `${state.scrollHeight}px`
      Progress.renderLoadEnded(progress, performance.now())
      return
    }
  }
}

const onEvent = (event: Event) => {
  const target = <HTMLElement>event.currentTarget
  if (!target) return null
  switch (target.id) {
    case 'close-button': {
      return { type: 'CloseRequest' }
    }
    case 'archive': {
      const frame = <HTMLIFrameElement>target
      const { scrollHeight } = frame.contentWindow!.document.body
      return { type: 'ArchiveLoaded', scrollHeight }
    }
    case 'form': {
      event.preventDefault()
      const form = <HTMLFormElement>target
      const text = <HTMLTextAreaElement>target.querySelector('#comment')
      return { type: 'SaveRequest', comment: text.value }
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
      console.log(state)
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
      return [state, send(state.port, message)]
    }
    case 'ArchiveLoaded': {
      const next: Model = {
        ...state,
        archive: {
          status: 'loaded',
          // @ts-ignore I we can't have end without start
          archive: <ArchiveData>state.archive.archive,
          scrollHeight: message.scrollHeight,
        },
      }

      return [next, save(next)]
    }
    case 'SaveRequest': {
      const next: Model = {
        ...state,
        save: { status: 'waiting', comment: message.comment },
      }

      return [next, save(next)]
    }
    case 'SaveResponse': {
      return [
        { ...state, save: { status: 'done', url: message.url, cid: message.cid } },
        writeToClipboard(message.url),
      ]
    }
  }
}

const decodeArchive = async (archive: ArchiveData): Promise<Message> => {
  const response = await fetch(archive.archiveURL)
  const blob = await response.blob()
  const archiveURL = URL.createObjectURL(blob)

  return { type: 'DecodeArchive', archive: { archiveURL, capturedAt: archive.capturedAt } }
}

const writeToClipboard = async (text: string): Promise<null> => {
  await navigator.clipboard.writeText(text)
  console.log(text)
  return null
}

const save = async ({ archive, excerpt, save }: Model): Promise<null | Message> => {
  if (archive.status === 'loaded' && excerpt.status === 'ready' && save.status === 'waiting') {
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
    image: imageURL ? `image.${extension(imageURL)}` : undefined,
    icon: iconURL ? `icon.${extension(iconURL)}` : undefined,
    url: excerpt.url,
    body: excerpt.description,
    title: excerpt.title,
    name: excerpt.name,
    selector: excerpt.selector,
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
  image: string | undefined
  body: string
  url: string
  icon: string | undefined
  time: string
  comment: string
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
    <script src="ui.js"></script>
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
                  <h1 class="title f5 f4-ns mv0">${data.name == '' ? data.title : data.name}</h1>
                </div>
              </div>
              <p class="body h4 pa1 f6 lh-copy measure-wide mt2 mid-gray">${data.body}</p>
            </div>
            <div class="pa2 h2 bg-near-white flex justify-between">
              <a class="url link underline-hover gray mw6 truncate" href="${data.url}">${
    data.url === '' ? '' : new URL(data.url).href.split('://').pop()!
  }</a>
              <a class="link icon dim pl2 fr br1 w1 h1 mw1" href="#" title="Home" style="background-image: url(./${
                data.icon
              });"></a>
            </div>
          </article>
    <form id="form" class="fl pr4 mb4 black-80 w-100 w-40-l w-70-m">
        <div class="">
          <time class="f6 mb2 dib ttu tracked"><small>${data.time}</small></time>
          <h3 class="f2 f1-m f-headline-l measure-narrow lh-title mv0">
            <span class="bg-black-90 lh-copy white pa1 tracked-tight">
              Web XCRPT
            </span>
          </h3>
        </div>
        <div>
          <label for="comment" class="f5 b db mb2"
            >Comments <span class="normal black-60">(optional)</span></label
          >
          <div
            id="comment"
            name="comment"
            class="outline-0 db f5 border-box hover-black h4 w-100 ba b--black pa2 br2 mv4 bg-transparent"
            aria-describedby="comment-desc"
            autofocus=""
          >${data.comment}</div>
        </div>
        <input
          class="b ph3 pv2 input-reset ba b--black pointer f4 no-underline near-white bg-animate bg-near-black hover-bg-transparent hover-near-black inline-flex items-center tc br2 pa2"
          type="submit"
          value="Excerpt"
        />
      </form>
      <progress class="absolute bottom-0 left-0 w-100 ma0 pa0" min="0" max="100" value="0" />
    </header>
    <iframe
      id="archive"
      data-status="idle"
      sandbox="allow-same-origin allow-top-navigation allow-scripts"
      class="w-100 bn"
      seamless=""
      style="height: ${scrollHeight}px;"
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
self.onload = onload
