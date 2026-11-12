/* XEPLR PUSH — the service worker that shows a push notification, whether
 * the app is open or not, and opens the app on a tap.
 *
 * Served by the app at its ROOT (/xeplr-push-sw.js — see @xeplr/ui-account's
 * vite.js), so it covers every page. It does nothing else: no caching, no
 * offline pages. What a notification says is @xeplr/push's payload:
 * { title, body, url, tag }. An icon can be given in its address:
 * /xeplr-push-sw.js?icon=/icons/icon-192.png
 */
var params = new URL(self.location.href).searchParams;
var ICON = params.get('icon') || undefined;

self.addEventListener('install', function() { self.skipWaiting(); });
self.addEventListener('activate', function(event) { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: event.data ? event.data.text() : '' }; }
  var title = data.title || 'Notification';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: ICON,
    badge: ICON,
    data: { url: typeof data.url === 'string' && data.url.charAt(0) === '/' && data.url.charAt(1) !== '/' ? data.url : '/' }
  }));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
    for (var i = 0; i < list.length; i++) {
      var client = list[i];
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        return client.focus().then(function(focused) {
          var c = focused || client;
          return 'navigate' in c ? c.navigate(target) : null;
        });
      }
    }
    return self.clients.openWindow(target);
  }));
});
