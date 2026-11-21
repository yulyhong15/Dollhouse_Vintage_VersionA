/* Offline support: keeps a copy of the app on the tablet so it opens without internet,
   including after the tablet is restarted. The cached copy is shown immediately and
   quietly refreshed in the background whenever the tablet is online.
   Transaction data is NOT stored here – it lives in IndexedDB and is never touched by this file. */
var CACHE = "dollhouse-A-202611211200";
var ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf("dollhouse-")===0 && k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method!=="GET") return;
  var url = new URL(req.url);
  if(url.origin!==self.location.origin) return;           /* backup uploads etc. go straight to the network */
  var key = req.mode==="navigate" ? "./index.html" : url.pathname;
  e.respondWith(caches.open(CACHE).then(function(cache){
    return cache.match(key, { ignoreSearch:true }).then(function(hit){
      var refresh = fetch(req).then(function(res){
        if(res && res.ok && res.type==="basic") cache.put(key, res.clone());
        return res;
      }).catch(function(){ return null; });
      if(hit){ e.waitUntil(refresh); return hit; }
      return refresh.then(function(res){ return res || new Response("Offline", { status:503 }); });
    });
  }));
});
