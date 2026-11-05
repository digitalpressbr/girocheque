// Service worker do GiroCheque: só recebe os avisos de vencimento e abre o app no toque.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch {
    dados = { body: event.data ? event.data.text() : "" };
  }
  const titulo = dados.title || "GiroCheque";
  const base = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.body || "Você tem cheque vencendo.",
      icon: base + "icon-192.png",
      badge: base + "icon-192.png",
      tag: dados.tag || "girocheque-vencimento",
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 300],
      data: { url: dados.url || base + "vencimentos" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (j.url.startsWith(self.registration.scope) && "focus" in j) {
          j.navigate(url).catch(() => {});
          return j.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
