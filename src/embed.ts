type Data = {
  url: string
  title: string
  description: string
  image: string | void
}

// https://ogp.me/
// https://developers.facebook.com/docs/sharing/webmasters#markup
export const openGraphMarkup = (data: Data) => `
<meta property="og:url" content="${data.url}" />
<meta property="og:type" content="website" />
<meta property="og:article:section" content="web excerpt" />
<meta property="og:title" content=${JSON.stringify(data.title)} />
<meta property="og:description" content=${JSON.stringify(data.description)} />
${data.image ? `<meta property="og:image" content="${data.image}" />` : ``}
`

//https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/markup
// https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/summary-card-with-large-image
export const twitterCardMarkup = (data: Data) => `
<meta name="twitter:card" content="${data.image ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:description" content=${JSON.stringify(data.description)} />
`
