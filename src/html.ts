export const html = (strings: TemplateStringsArray, ...variables: any[]): Element => {
  const template = document.createElement(`template`)
  let html = ``
  let index = 0
  while (index < strings.length) {
    html += strings[index]
    if (index < variables.length) {
      const variable = variables[index]
      if (typeof variable === 'string') {
        html += variable
      } else {
        html += serailizeAttributes(variable)
      }
    }
    index++
  }

  while (index < variables.length) {
    html += variables[index].toString()
    index++
  }

  template.innerHTML = html
  return template.content.firstElementChild!
}

const serailizeAttributes = (attributes: { [key: string]: number | string | object }) => {
  let result = ''
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'style') {
      let style = ''
      for (const [key, rule] of Object.entries(value)) {
        style += `${normalizeName(key)}: ${rule};`
      }
      result += `style="${style}"`
    } else {
      result += `${normalizeName(name)}="${value}"`
    }
  }
  return result
}

const normalizeName = (key: string) => {
  const [first, ...rest] = key.split(/([A-Z])/)
  let name = first
  let index = 0
  while (index < rest.length) {
    let first = rest[index].toLowerCase()
    let second = (rest[index + 1] || '').toLowerCase()
    name += `-${first}${second}`
    index += 2
  }
  return name
}
