import {
  html,
  nothing as empty,
  Template,
  TemplateResult,
  render as renderView,
} from '../../node_modules/lit-html/lit-html'
type View = TemplateResult
const nothing = <View>empty
export { html, nothing, View, renderView }
