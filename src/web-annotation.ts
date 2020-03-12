type StringEncodedCSSSelector = string
type XPath = string
type Integer = number
type SerializedSVG = string

type FragmentSpecification =
  | 'http://tools.ietf.org/rfc/rfc3236'
  | 'http://tools.ietf.org/rfc/rfc3778'
  | 'http://tools.ietf.org/rfc/rfc5147'
  | 'http://tools.ietf.org/rfc/rfc3023'
  | 'http://tools.ietf.org/rfc/rfc3870'
  | 'http://tools.ietf.org/rfc/rfc7111'
  | 'http://www.w3.org/TR/media-frags/'
  | 'http://www.w3.org/TR/SVG/'
  | 'http://www.idpf.org/epub/linking/cfi/epub-cfi.html'

export type Selector =
  | { type: 'CssSelector'; value: StringEncodedCSSSelector; refinedBy: void | Selector }
  | { type: 'XPathSelector'; value: XPath; refinedBy: void | Selector }
  | {
      type: 'TextQuoteSelector'
      exact: string
      prefix: string
      suffix: string
      refinedBy: void | Selector
    }
  | { type: 'TextPositionSelector'; start: Integer; end: Integer; refinedBy: void | Selector }
  | { type: 'DataPositionSelector'; start: Integer; end: Integer; refinedBy: void | Selector }
  | { type: 'SvgSelector'; value: SerializedSVG; refinedBy: void | Selector }
  | {
      type: 'RangeSelector'
      startSelector: Selector
      endSelector: Selector
      refinedBy: void | Selector
    }
  | {
      type: 'FragmentSelector'
      conformsTo: FragmentSpecification
      value: string
      refinedBy: void | Selector
    }

const ELEMENT_NODE = 1
const TEXT_NODE = 3

type Indexed<item> = {
  length: number
  [index: number]: item
}

const indexOfChild = <item>(child: item, children: Indexed<item>): number => {
  const length = children.length
  let index = 0
  while (index < length) {
    if (children[index] === child) {
      return index
    } else {
      index++
    }
  }
  return -1
}

const selectorOf = (to: Element, from: Element | Document | null = null): string => {
  let target: null | Element = to
  let selector = ''
  while (from !== target && target != null && target.nodeType === ELEMENT_NODE) {
    if (target.id !== '' && target.id != null) {
      selector = `> #${target.id} ${selector}`
      break
    }

    const parent: null | Element = target.parentElement
    if (parent != null) {
      const n = indexOfChild(target, parent.children) + 1
      selector = `> ${target.localName}:nth-child(${n}) ${selector}`
    } else {
      selector = `> ${target.localName} ${selector}`
    }
    target = parent
  }

  return selector.substr(2)
}

class RangeSelector {
  type: 'RangeSelector' = 'RangeSelector'
  startSelector: Selector
  endSelector: Selector
  refinedBy: void | Selector
  constructor(start: Selector, end: Selector, refinedBy?: Selector) {
    this.startSelector = start
    this.endSelector = end
    this.refinedBy = refinedBy
  }
}

class CSSSelector {
  type: 'CssSelector' = 'CssSelector'
  value: StringEncodedCSSSelector
  refinedBy: void | Selector
  constructor(value: StringEncodedCSSSelector, refinedBy?: Selector) {
    this.value = value
    this.refinedBy = refinedBy
  }
}

class TextPositionSelector {
  type: 'TextPositionSelector' = 'TextPositionSelector'
  start: Integer
  end: Integer
  refinedBy: void | Selector
  constructor(start: Integer, end: Integer, refinedBy?: Selector) {
    this.start = start
    this.end = end
    this.refinedBy = refinedBy
  }
}

class CursorPositionSelector extends TextPositionSelector {
  constructor(offset: Integer) {
    super(offset, offset, undefined)
  }
}

const getCursorPositionSelector = (to: Node, offset: Integer, from: Node): Selector => {
  const document = to.ownerDocument!
  const range = document.createRange()
  range.setStart(from, 0)
  range.setEnd(to, offset)
  return new CursorPositionSelector(range.toString().length)
}

const createRangeSelector = (
  root: Element | Document,
  commonAncestor: null | Element,
  startContainer: Node,
  endContainer: Node,
  startOffset: Integer,
  endOffset: Integer
) => {
  const anchor = commonAncestor == null ? root : commonAncestor

  const startSelector = getCursorPositionSelector(startContainer, startOffset, anchor)
  const endSelector = getCursorPositionSelector(endContainer, endOffset, anchor)

  const rangeSelector = new RangeSelector(startSelector, endSelector)

  if (anchor !== root && commonAncestor != null) {
    const commonAncestorSelector = selectorOf(commonAncestor, root)
    return new CSSSelector(commonAncestorSelector, rangeSelector)
  } else {
    return rangeSelector
  }
}

const toElement = (node: Node): null | Element => {
  const element = node.nodeType === Node.ELEMENT_NODE ? <Element>node : null
  return element
}

const toText = (node: Node): null | Text => {
  const text = node.nodeType === Node.TEXT_NODE ? <Text>node : null
  return text
}

export const getRangeSelector = (range: Range): Selector => {
  const {
    collapsed,
    commonAncestorContainer,
    startContainer,
    startOffset,
    endContainer,
    endOffset,
  } = range

  const root =
    commonAncestorContainer.ownerDocument!.documentElement || commonAncestorContainer.ownerDocument
  switch (commonAncestorContainer.nodeType) {
    case TEXT_NODE: {
      const selector = createRangeSelector(
        root,
        commonAncestorContainer.parentElement,
        startContainer,
        endContainer,
        startOffset,
        endOffset
      )
      return selector
    }
    case ELEMENT_NODE: {
      const selector = createRangeSelector(
        root,
        toElement(commonAncestorContainer),
        startContainer,
        endContainer,
        startOffset,
        endOffset
      )
      return selector
    }
    default: {
      const selector = createRangeSelector(
        root,
        null,
        startContainer,
        endContainer,
        startOffset,
        endOffset
      )
      return selector
    }
  }
}

class Break<state> {
  value: state
  constructor(value: state) {
    this.value = value
  }
}

type Step<state> = Break<state> | state

type Reducer<state, item> = (result: state, input: item) => Step<state>

const reduceTextNodes = <state>(
  reducer: Reducer<state, Text>,
  root: Element,
  seed: state
): state => {
  let element: Element = root
  let result: state = seed
  let instruction: Step<state> = result
  let stack: Array<number> = []
  let index = 0
  while (true) {
    const { childNodes } = element
    const { length } = childNodes
    let nodeType = Node.TEXT_NODE
    while (index < length) {
      const child = childNodes[index]
      nodeType = child.nodeType
      index = index + 1

      if (nodeType === Node.TEXT_NODE) {
        // status = 1
        instruction = reducer(result, <Text>child)
        if (instruction instanceof Break) {
          return instruction.value
        } else {
          result = instruction
        }
      }

      if (nodeType === Node.ELEMENT_NODE) {
        stack.push(index)
        element = <Element>child
        index = 0
        // status = 2
        break
      }
    }

    // If loop exited because element node was reach or
    // if loop exited because element had no children
    // resume traversal from the stack.
    if (nodeType === Node.TEXT_NODE || length === 0) {
      const { parentElement } = element
      if (parentElement != null && stack.length > 0) {
        element = parentElement
        index = stack.pop()!
      } else {
        break
      }
    }
  }

  return result
}

type Anchor = {
  node: Node
  offset: number
}

type Anchors = Map<number, Anchor>

const getAnchorsByOffsets = (node: Element, offsets: Array<number>): Map<number, Anchor> =>
  reduceTextNodes(
    (state, text) => {
      if (state.offsets.length === 0) {
        return new Break(state)
      } else {
        const offset = state.offsets[0]
        const position = state.position + text.length
        if (position > offset) {
          state.offsets.shift()
          state.map.set(offset, { node: text, offset: offset - state.position })
          state.position = position

          if (state.offsets.length > 0) {
            return state
          } else {
            return new Break(state)
          }
        } else {
          state.position = position
          return state
        }
      }
    },
    node,
    { map: new Map(), offsets: offsets.sort(), position: 0 }
  ).map

const getAnchorByOffset = (node: Element, offset: number): Anchor | null =>
  reduceTextNodes(
    (state: { position: number; anchor: Anchor | null }, text) => {
      const position = state.position + text.length
      if (position >= offset) {
        state.anchor = { node: text, offset: offset - state.position }
        return new Break(state)
      } else {
        state.position = position
        return state
      }
    },
    node,
    { position: 0, anchor: null }
  ).anchor

type RefinedCssSelector<selector> = {
  type: 'CssSelector'
  value: string
  refinedBy: selector
}

type RangedSelector<start, end> = {
  type: 'RangeSelector'
  startSelector: start
  endSelector: end
}

type TextPosition = {
  type: 'TextPositionSelector'
  start: Integer
  end: Integer
}

const resolveMarkerSelector = (markerSelector: Selector, target: Element): Anchor | Error => {
  let selector: Selector = markerSelector
  while (selector) {
    switch (selector.type) {
      case 'TextPositionSelector': {
        const anchor = getAnchorByOffset(target, selector.start)
        if (anchor != null) {
          return anchor
        } else {
          return new Error(`No text node found matching ${selector.start} offset`)
        }
      }
      case 'CssSelector': {
        const { refinedBy, value } = selector
        const node = target.querySelector(value)
        if (node != null && refinedBy != null) {
          target = node
          selector = refinedBy
          continue
        } else {
          return new Error(`No element found matching ${value} query`)
        }
      }
    }
  }
  return new Error(`Unsupported ${(<Selector>selector).type} selector`)
}

const createRange = (
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number
): Range | Error => {
  try {
    const range = document.createRange()
    range.setStart(startContainer, startOffset)
    range.setEnd(endContainer, endOffset)
    return range
  } catch (error) {
    return error
  }
}

const resloveRange = (
  startSelector: Selector,
  endSelector: Selector,
  commonAncestor: Element
): Range | Error => {
  const start = resolveMarkerSelector(startSelector, commonAncestor)
  const end = resolveMarkerSelector(endSelector, commonAncestor)

  if (start instanceof Error) {
    return start
  } else if (end instanceof Error) {
    return end
  } else {
    return createRange(start.node, start.offset, end.node, end.offset)
  }
}

export const resolveSelector = (selector: Selector, target: Element): Range | Error => {
  while (true) {
    switch (selector.type) {
      case 'CssSelector': {
        const commonAncestor = target.querySelector(selector.value)
        if (commonAncestor == null) {
          return new Error(`Node node matching ${selector.value} is found`)
        } else {
          const refinement = selector.refinedBy
          if (!refinement) {
            const range = document.createRange()
            range.selectNode(commonAncestor)
            return range
          }
          switch (refinement.type) {
            case 'TextPositionSelector': {
              const { start, end } = refinement
              const anchors = getAnchorsByOffsets(commonAncestor, [start, end])
              const startAnchor = anchors.get(start)
              const endAnchor = anchors.get(end)
              if (startAnchor == null) {
                return Error(`No text node found matching ${start} offset`)
              } else if (endAnchor == null) {
                return Error(`No text node found matching ${end} offset`)
              } else {
                return createRange(
                  startAnchor.node,
                  startAnchor.offset,
                  endAnchor.node,
                  endAnchor.offset
                )
              }
            }
            case 'RangeSelector': {
              const { startSelector, endSelector } = refinement
              return resloveRange(startSelector, endSelector, commonAncestor)
            }
            case 'CssSelector': {
              selector = <Selector>refinement
              target = commonAncestor
              continue
            }
            default: {
              return new Error(`Unsupported ${selector.type} selector`)
            }
          }
        }
      }
      case 'RangeSelector': {
        const { startSelector, endSelector } = selector
        return resloveRange(startSelector, endSelector, target)
      }
      default: {
        return new Error(`Unsupported ${selector.type} selector`)
      }
    }
  }
}
