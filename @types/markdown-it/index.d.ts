// import { LinkifyIt } from 'linkify-it'

// import State from './rules_core/state_core'
// import StateBlock from './rules_block/state_block'
// import StateInline from './rules_inline/state_inline'

// import Core from './parser_core'
// import ParserBlock from './parser_block'
// import ParserInline from './parser_inline'

// import Renderer from './renderer'
// import Ruler from './ruler'
// import Token from './token'

declare module 'markdown-it' {
  export interface Options {
    html?: boolean
    xhtmlOut?: boolean
    breaks?: boolean
    langPrefix?: string
    linkify?: boolean
    typographer?: boolean
    quotes?: string
    highlight?: (str: string, lang: string) => void
  }

  export interface Rule<S extends State = State> {
    (state: S, silent?: boolean): boolean | void
  }

  export interface RuleInline extends Rule<StateInline> {}
  export interface RuleBlock extends Rule<StateBlock> {}

  export interface RulerInline extends Ruler<StateInline> {}
  export interface RulerBlock extends Ruler<StateBlock> {}

  export type TokenRender = (
    tokens: Token[],
    index: number,
    options: any,
    env: any,
    self: Renderer
  ) => string

  export interface Delimiter {
    close: boolean
    end: number
    jump: number
    length: number
    level: number
    marker: number
    open: boolean
    token: number
  }

  declare class MarkdownIt {
    constructor()
    constructor(presetName: 'commonmark' | 'zero' | 'default', options?: Options)
    constructor(options: Options)

    render(md: string, env?: any): string
    renderInline(md: string, env?: any): string
    parse(src: string, env: any): Token[]
    parseInline(src: string, env: any): Token[]

    /*
    // The following only works in 3.0
    // Since it's still not allowed to target 3.0, i'll leave the code commented out

    use<T extends Array<any> = any[]>(
        plugin: (md: MarkdownIt, ...params: T) => void,
        ...params: T
    ): MarkdownIt;
    */

    use(plugin: (md: MarkdownIt, ...params: any[]) => void, ...params: any[]): MarkdownIt

    utils: {
      assign(obj: any): any
      isString(obj: any): boolean
      has(object: any, key: string): boolean
      unescapeMd(str: string): string
      unescapeAll(str: string): string
      isValidEntityCode(str: any): boolean
      fromCodePoint(str: string): string
      escapeHtml(str: string): string
      arrayReplaceAt(src: any[], pos: number, newElements: any[]): any[]
      isSpace(str: any): boolean
      isWhiteSpace(str: any): boolean
      isMdAsciiPunct(str: any): boolean
      isPunctChar(str: any): boolean
      escapeRE(str: string): string
      normalizeReference(str: string): string
    }

    disable(rules: string[] | string, ignoreInvalid?: boolean): MarkdownIt
    enable(rules: string[] | string, ignoreInvalid?: boolean): MarkdownIt
    set(options: MarkdownIt.Options): MarkdownIt
    normalizeLink(url: string): string
    normalizeLinkText(url: string): string
    validateLink(url: string): boolean
    block: ParserBlock
    core: Core
    helpers: any
    inline: ParserInline
    linkify: LinkifyIt
    renderer: Renderer
  }

  export default MarkdownIt
}
