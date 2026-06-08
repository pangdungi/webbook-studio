/* 브라우저/확장이 등록한 SW 요청 — 미들웨어·API 부하 방지용 no-op */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
