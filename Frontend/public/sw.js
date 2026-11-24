/* Cache the public app shell only. Never cache API responses, receipts, exports or profile data. */
const CACHE='fintrack-shell-v2';
const SHELL=['/index.html','/offline.html','/favicon.svg','/brand/finnet-logo-dark.svg','/brand/finnet-symbol.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/config.json'||url.pathname.includes('/receipt')||url.pathname.includes('/export'))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).catch(()=>caches.match('/index.html').then(response=>response||caches.match('/offline.html'))));return;
 }
 if(!/\.(?:js|css|woff2?|svg|png|ico)$/.test(url.pathname))return;
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));}return response;})));
});
