import { gfm } from 'turndown-plugin-gfm'
import Turndown from 'turndown'

const service = new Turndown({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'referenced',
  linkReferenceStyle: 'collapsed',
})
service.use(gfm)

export const turndown = (input: string | HTMLElement): string => service.turndown(input)
