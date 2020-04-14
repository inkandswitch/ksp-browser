declare module 'rehype-stringify' {
  import { RemarkPlugin } from 'remark'
  declare var stringify: RemarkPlugin<undefined>
  export default stringify
}
