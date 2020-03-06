import freezeDry from 'freeze-dry'

import { service, ScrapeData } from './scraper'

const onload = async () => {
  // Create copy for scraping
  const source = <Document>document.cloneNode(true)

  const dialog = html`
    <dialog ${{ style: style.dialog }}></dialog>
  `
  document.body.append(dialog)

  const cardData = await service.scrape(source)
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

onload()
