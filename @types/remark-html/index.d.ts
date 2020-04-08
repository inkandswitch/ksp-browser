import { RemarkPlugin } from 'remark'

declare module 'remark-html' {
  declare const rehtml: RemarkPlugin<{ allowDangerousHtml: boolean }>
  export default rehtml
}
