// 우리 가계부 Service Worker
const CACHE_NAME = 'booboo-v1'

// 설치: 핵심 정적 파일 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/expenses', '/stats', '/manifest.json'])
    )
  )
  self.skipWaiting()
})

// 활성화: 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// fetch: 네트워크 우선, 실패 시 캐시 fallback
self.addEventListener('fetch', (event) => {
  // API 요청이나 Supabase 요청은 캐싱하지 않음
  const url = new URL(event.request.url)
  if (
    url.hostname.includes('supabase.co') ||
    event.request.method !== 'GET'
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 정상 응답은 캐시에 저장
        if (response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
