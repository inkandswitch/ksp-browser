import {
  html,
  nothing as empty,
  Template,
  TemplateResult,
  Part,
  directive,
  render as renderView,
} from '../../node_modules/lit-html/lit-html'
type View = TemplateResult
type ViewDriver = Part
const nothing = <View>empty
const Viewer = directive
export { html, nothing, View, ViewDriver, Viewer, renderView }
