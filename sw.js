// LeadKeeper: fa aprire l'app anche senza rete (i dati restano su Supabase).
// Strategia: prima la rete (sempre l'ultima versione), se manca si usa la copia salvata.
const CACHE = "leadkeeper-shell-v2";
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
