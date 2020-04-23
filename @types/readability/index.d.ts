declare module 'readability/Readability' {
  export type Options = {
    documentElement?: HTMLElement
    debug?: boolean
    maxElemsToParse?: number
    nbTopCandidates?: number
    charThreshold?: number
    classesToPreserve?: string[]
    keepClasses?: boolean
  }

  export type Data = {
    title: string
    byline: string
    length: number
    content: string
    excerpt: string
    dir: { [string]: string }
  }

  declare class Readability {
    constructor(document: HTMLDocument, options?: Options)
    parse(): Data
  }

  export default Readability
}
