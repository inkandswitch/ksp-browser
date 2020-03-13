enum ReadAs {
  ArrayBuffer,
  BinaryString,
  DataURL,
  Text,
}

export class BlobReader<t extends ArrayBuffer | string> extends FileReader {
  onsucceed: null | ((value: t) => void)
  onfail: null | ((error: DOMException) => void)
  blob: Blob
  read: (blob: Blob) => void
  constructor(read: (blob: Blob) => void, blob: Blob) {
    super()
    this.blob = blob
    this.onsucceed = null
    this.onfail = null
    this.read = read
  }
  then(succeed: (value: t) => void, fail: (error: DOMException) => void) {
    this.onsucceed = succeed
    this.onfail = fail
    this.read(this.blob)
  }

  static onload(event: ProgressEvent<BlobReader<ArrayBuffer | string>>) {
    const { target: reader } = event
    reader!.onsucceed!(reader!.result!)
  }
  static onerror(event: ProgressEvent<BlobReader<ArrayBuffer | string>>) {
    const { target: reader } = event
    reader!.onfail!(reader!.error!)
  }

  static readAsArrayBuffer(blob: Blob): BlobReader<ArrayBuffer> {
    return new BlobReader(this.prototype.readAsArrayBuffer, blob)
  }
  static readAsBinaryString(blob: Blob): BlobReader<string> {
    return new BlobReader(this.prototype.readAsBinaryString, blob)
  }
  static readAsText(blob: Blob): BlobReader<string> {
    return new BlobReader(this.prototype.readAsText, blob)
  }
  static readAsDataURL(blob: Blob): BlobReader<string> {
    return new BlobReader(this.prototype.readAsDataURL, blob)
  }
}
