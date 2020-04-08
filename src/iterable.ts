export const filter = function* <a>(p: (item: a) => boolean, source: Iterable<a>): Iterable<a> {
  for (const item of source) {
    if (p(item)) {
      yield item
    }
  }
}

export const map = function* <a, b>(f: (item: a) => b, source: Iterable<a>): Iterable<b> {
  for (const item of source) {
    yield f(item)
  }
}

export const reduce = <a, b>(
  reducer: (item: a, state: b) => b,
  state: b,
  items: Iterable<a>
): b => {
  let result = state
  for (const item of items) {
    result = reducer(item, state)
  }
  return result
}

export const concat = function* <a>(iterables: Iterable<Iterable<a>>): Iterable<a> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item
    }
  }
}

export const take = function* <a>(n: number, iterable: Iterable<a>): Iterable<a> {
  if (n > 0) {
    let count = 0
    for (const item of iterable) {
      yield item
      if (++count >= n) {
        break
      }
    }
  }
}

export const first = <a>(iterable: Iterable<a>, fallback: a): a => {
  for (const item of iterable) {
    return item
  }
  return fallback
}
