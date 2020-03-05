declare module 'freeze-dry' {
  type Options = {
    signal?: AbortSignal | undefined | null
    resolveURL?: any
    timeout?: number
    docUrl?: string
    addMetadata?: boolean
    keepOriginalAttributes?: boolean
    now?: Date
    fetchResource?: (
      input: RequestInfo,
      init?: RequestInit | undefined
    ) => Promise<Response> | Promise<{ blob: Blob; url: string }>
  }

  declare function freezeDry(document: Document, options: Options)

  export default freezeDry
}
