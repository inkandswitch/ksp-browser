import { resolveSelector } from './web-annotation'
import { Annotation } from './annotation'

const onload = () => {
  const button = document.querySelector('#unfurl-button')!
  button.addEventListener('click', onclick)
}

const onclick = (event: Event) => {
  event.preventDefault()
  const frame = <HTMLIFrameElement>document.querySelector('#archive')
  const annotation = readAnnotation()
  const selector = annotation ? annotation.target.selector[0] : null
  if (!selector) {
    frame.scrollIntoView()
  } else {
    frame.focus()
    const contentWindow = frame.contentWindow!
    const selection = contentWindow.getSelection()!
    selection.removeAllRanges()
    const range = resolveSelector(selector, contentWindow.document.documentElement)
    if (!(range instanceof Error)) {
      selection.addRange(range)
      const node = range.startContainer
      const target = node.nodeType === Node.ELEMENT_NODE ? <Element>node : node.parentElement!

      const top = target.getBoundingClientRect().top + frame.getBoundingClientRect().top
      window.scrollTo({ top })
    }
  }
}

const readAnnotation = (): Annotation | null => {
  try {
    const annotation = document.querySelector('script#web-annotation')
    return JSON.parse(annotation!.textContent!)
  } catch (error) {
    return null
  }
}

window.onload = onload
