/**
 * Represents non-empty Selection of `Range` type.
 */
export class RangeSelection {
  document: Document
  selection: Selection
  static get(document: Document): null | RangeSelection {
    const selection = document.getSelection()
    if (selection && selection.type == 'Range') {
      return new RangeSelection(document, selection)
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
