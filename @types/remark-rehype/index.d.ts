declare module 'remark-rehype' {
  import { RemarkPlugin } from 'remark'
  declare var rehype: RemarkPlugin<{ allowDangerousHtml: boolean }>
  export default rehype
}
