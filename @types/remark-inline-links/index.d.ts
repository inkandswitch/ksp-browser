import { RemarkPlugin } from 'remark'

declare module 'remark-inline-links' {
  declare var relink: RemarkPlugin<{ unlinkBrokenLinks: boolean }>
  export default relink
}
