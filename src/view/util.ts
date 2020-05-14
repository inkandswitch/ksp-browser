import { View, html, nothing } from './html'

type Rect = { top: number; left: number; height: number; width: number }

export const debug = ({ top, left, height, width }: Rect): View =>
  html`<div
    class="debug"
    style="top:${top}px;left:${left}px;height:${height}px;width:${Math.abs(width)}px"
  ></div>`
