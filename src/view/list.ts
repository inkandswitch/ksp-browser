import { View, html, nothing } from './html'
import { map } from '../iterable'

export const viewList = <a>(
  data: Iterable<a>,
  view: (data: a) => View,
  classNames: string[]
): View =>
  html`<ul class="${classNames.join(' ')}">
    ${map((a) => html`<li class="${classNames.join(' ')}">${view(a)}</li>`, data)}
  </ul>`
