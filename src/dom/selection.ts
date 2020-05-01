/**
 * Return the best position to show the tooltip for the selection.
 */
export const getSelectionTooltipRect = (selection: Selection): null | DOMRect => {
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  // return range ? getTextBoundingBoxes(range).pop() || null : null
  if (range) {
    const node = selection.focusNode!
    const rects = range.getClientRects()
    const direction = isSelectionBackwards(selection, range) ? -1 : 1
    const rect = resolveRect(
      node.nodeType === Node.ELEMENT_NODE ? <HTMLElement>node : <HTMLElement>node.parentElement!,
      direction < 0 ? rects[0] : rects[rects.length - 1]
    )

    if (direction > 0) {
      return rect
    } else {
      return new DOMRect(rect.left + rect.width, rect.top, rect.width * -1, rect.height)
    }
  }
  return null
}

/**
 * Returns true if the start point of a selection occurs after the end point,
 * in document order.
 */
function isSelectionBackwards(selection: Selection, range: Range) {
  if (selection.focusNode === selection.anchorNode) {
    return selection.focusOffset < selection.anchorOffset
  }

  return range.startContainer === selection.focusNode
}

export const resolveRect = (element: HTMLElement, rect: DOMRect): DOMRect => {
  const window = element.ownerDocument && element.ownerDocument.defaultView
  const { scrollY, scrollX } = window || { scrollX: 0, scrollY: 0 }
  let node: HTMLElement | null = element
  let { top, left, width, height } = rect
  while (node) {
    top += node.scrollTop || 0
    left += node.scrollLeft || 0
    node = <HTMLElement | null>node.offsetParent
  }
  return new DOMRect(left + scrollX, top + scrollY, width, height)
}

/**
 * Returns the bounding rectangles of non-whitespace text nodes in `range`.
 *
 * @param {Range} range
 * @return {Array<Rect>} Array of bounding rects in viewport coordinates.
 */
export function getTextBoundingBoxes(range: Range): DOMRect[] {
  const whitespaceOnly = /^\s*$/
  const rects: DOMRect[] = []
  for (const node of nodesInRange(range)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent!.match(whitespaceOnly)) {
      const nodeRange = node.ownerDocument!.createRange()
      nodeRange.selectNodeContents(node)
      if (node === range.startContainer) {
        nodeRange.setStart(node, range.startOffset)
      }
      if (node === range.endContainer) {
        nodeRange.setEnd(node, range.endOffset)
      }
      // If the range ends at the start of this text node or starts at the end
      // of this node then do not include it.
      if (!nodeRange.collapsed) {
        // Measure the range and translate from viewport to document coordinates
        const viewportRects = Array.from(nodeRange.getClientRects())
        nodeRange.detach()
        rects.push(...viewportRects)
      }
    }
  }

  return rects
}

/**
 * Iterate over all Node(s) in `range` in document order.
 *
 * @param {Range} range
 */
export const nodesInRange = function* (range: Range) {
  const root = range.commonAncestorContainer

  // The `whatToShow`, `filter` and `expandEntityReferences` arguments are
  // mandatory in IE although optional according to the spec.
  const nodeIter = root.ownerDocument!.createNodeIterator(
    root,
    NodeFilter.SHOW_ALL,
    null /* filter */,
    // @ts-ignore
    false /* expandEntityReferences */
  )

  let currentNode
  while ((currentNode = nodeIter.nextNode())) {
    if (isNodeInRange(range, currentNode)) {
      yield currentNode
    }
  }
}

/**
 * Returns true if `node` lies within a range.
 *
 * This is a simplified version of `Range.isPointInRange()` for compatibility
 * with IE.
 *
 * @param {Range} range
 * @param {Node} node
 */
export function isNodeInRange(range: Range, node: Node) {
  if (node === range.startContainer || node === range.endContainer) {
    return true
  }

  const nodeRange = node.ownerDocument!.createRange()
  nodeRange.selectNode(node)
  const isAtOrBeforeStart = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0
  const isAtOrAfterEnd = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
  nodeRange.detach()
  return isAtOrBeforeStart && isAtOrAfterEnd
}
