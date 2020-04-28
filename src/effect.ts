const debounce = <fn extends (...args: any[]) => void>(
  f: fn,
  delay: number = 0
): ((...args: Parameters<fn>) => void) => {
  let timer: null | NodeJS.Timeout = null
  return function (...args) {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(f, delay)
  }
}
