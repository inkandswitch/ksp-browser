type URLFields = {
  protocol?: string
  search?: string
  hash?: string
  host?: string
  hostname?: string
  username?: string
  password?: string
  pathname?: string
  port?: string
}

export const from = (source: string | URL, fields?: URLFields | void | null): URL => {
  const url = new URL(source.toString())
  if (fields != null) {
    Object.assign(url, fields)
  }
  return url
}

export const parse = (input: string | URL, base?: string | URL | null | void): URL =>
  new URL(input.toString(), base || undefined)
