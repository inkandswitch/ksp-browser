declare module 'remark-html' {
  import { RemarkPlugin } from 'remark'
  declare var rehtml: RemarkPlugin<{ allowDangerousHtml: boolean }>
  export default rehtml
}
