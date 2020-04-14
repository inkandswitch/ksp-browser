import remark from 'remark'
import unlink from 'remark-unlink'
import rehype from 'remark-rehype'
import raw from 'rehype-raw'
import stringify from 'rehype-stringify'
import { unsafeHTML } from '../node_modules/lit-html/directives/unsafe-html'

const transform = remark()
  .use(unlink)
  .use(rehype, { allowDangerousHtml: true })
  .use(raw)
  .use(stringify)

export const md = (content: string) => unsafeHTML(transform.processSync(content).toString())
