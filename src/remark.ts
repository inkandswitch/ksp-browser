import remark from 'remark'
import rehtml from 'remark-html'
import unlink from 'remark-unlink'
import { unsafeHTML } from '../node_modules/lit-html/directives/unsafe-html'

const transform = remark()
  .use(unlink)
  .use(new rehtml({ allowDangerousHtml: false }))

export const md = (content: string) => unsafeHTML(transform.processSync(content).toString())
