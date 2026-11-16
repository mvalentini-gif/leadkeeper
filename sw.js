// LeadKeeper: fa aprire l'app anche senza rete (i dati restano su Supabase).
// Strategia: prima la rete (sempre l'ultima versione), se manca si usa la copia salvata.
const CACHE = "leadkeeper-shell-v3";
const SHELL = ["./", "index.html", "config.js", "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  const shell = e.request.method === "GET" && (u.origin === location.origin || u.hostname === "cdn.jsdelivr.net" || u.hostname === "cdnjs.cloudflare.com" || u.hostname.startsWith("fonts."));
  if (!shell) return; // le chiamate a Supabase non passano dalla cache
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html")))
  );
});

// Avvisi: mostra la notifica quando arriva e, se la tocchi, apre l'app su "Da fare".
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: "LeadKeeper", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "LeadKeeper", {
    body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag, data: { url: d.url || "./#/todo" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ("focus" in c) { if (c.navigate) c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
