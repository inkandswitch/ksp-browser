import { TurndownPlugin } from 'turndown'

declare module 'turndown-plugin-gfm' {
  declare var strikethrough: TurndownPlugin
  declare var tables: TurndownPlugin
  declare var taskListItems: TurndownPlugin
  declare var gfm: TurndownPlugin

  export { strikethrough, tables, taskListItems, gfm }
}
