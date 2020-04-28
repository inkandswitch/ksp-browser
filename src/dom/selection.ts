/**
 * Return the best position to show the tooltip for the selection.
 */
export const getSelectionTooltipRect = (selection: Selection) => {
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  return range ? getTextBoundingBoxes(range).pop() || null : null
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
