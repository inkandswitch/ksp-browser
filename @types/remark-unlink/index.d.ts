import { RemarkPlugin } from 'remark'

declare module 'remark-unlink' {
  declare var unlink: RemarkPlugin<void>
  export default unlink
}
