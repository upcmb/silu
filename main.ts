Deno.serve({ port: 8080 }, async (request) => {
  const { pathname, search } = new URL(request.url)
  const url = new URL('.' + pathname, 'https://example.com')
  url.search = search

  const headers = new Headers(request.headers)
  headers.set('Host', url.hostname)
  headers.set('Authorization', Deno.env.get('PROXY_AUTHORIZATION'))

  return fetch(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual',
  })
})
