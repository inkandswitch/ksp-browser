import { RemarkPlugin } from 'remark'

declare module 'remark-unlink' {
  declare const unlink: RemarkPlugin<void>
  export default unlink
}
