export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const target = 'https://snapit-full-stack-production.up.railway.app'
    const newUrl = target + url.pathname + url.search

    const newRequest = new Request(newUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    })

    return fetch(newRequest)
  }
}
