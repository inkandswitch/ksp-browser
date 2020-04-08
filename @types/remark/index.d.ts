declare module 'remark' {
  export interface RemarkPlugin<a> {
    (options: a): RemarkPlugin<a>
    new (options: a): RemarkPlugin<a>
  }

  export interface VFile {
    toString(): string
  }

  interface Remark {
    use<a>(plugin: RemarkPlugin<a>, options: a): Remark
    use<a>(plugin: RemarkPlugin<a>): Remark

    process(content: string): Promise<VFile>
    processSync(content: string): VFile
  }
  declare function remark(): Remark

  export default remark
}
