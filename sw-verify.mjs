import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));

// 1) SW se registra y cachea
await page.goto('http://localhost:8099/index.html', { waitUntil: 'load' });
await page.waitForTimeout(2500);
const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const keys = await caches.keys();
  const cache = keys.length ? await caches.open(keys[0]) : null;
  const cached = cache ? (await cache.keys()).length : 0;
  return { registered: !!reg, active: !!(reg && reg.active), caches: keys, cachedEntries: cached };
});
console.log('SW:', JSON.stringify(sw));

// 2) OFFLINE: la página debe seguir sirviendo desde caché
await page.goto('http://localhost:8099/azimut.html', { waitUntil: 'load' }); // visita para cachear
await page.waitForTimeout(800);
await ctx.setOffline(true);
const off = await page.goto('http://localhost:8099/azimut.html', { waitUntil: 'domcontentloaded', timeout: 15000 }).then(r => ({ ok: true, status: r ? r.status() : 'sw' })).catch(e => ({ ok: false, err: e.message.slice(0, 60) }));
const offTitle = off.ok ? await page.title() : null;
console.log('OFFLINE azimut:', JSON.stringify(off), '| title:', offTitle);
await ctx.setOffline(false);

// 3) Hero línea 2 + EN
await page.goto('http://localhost:8099/index.html', { waitUntil: 'load' });
await page.evaluate(() => { const l = document.getElementById('loader'); if (l) l.remove(); });
await page.waitForTimeout(600);
const hero = await page.evaluate(() => {
  const h = document.querySelector('.hsub2');
  return { text: h ? h.textContent.slice(0, 50) : null, visible: h ? getComputedStyle(h).opacity : null };
});
await page.evaluate(() => document.documentElement.setAttribute('lang', 'en'));
await page.waitForTimeout(300);
const heroEN = await page.evaluate(() => document.querySelector('.hsub2').textContent.slice(0, 45));
console.log('HERO2 ES:', JSON.stringify(hero), '| EN:', heroEN);
await page.evaluate(() => document.documentElement.setAttribute('lang', 'es'));

// 4) Mantenimiento nuevo
await page.click('#tadv-fab');
await page.waitForTimeout(1400);
await page.click('.tadv-opt:has-text("Tengo una pregunta")');
await page.waitForTimeout(1600);
const maint = await page.evaluate(() => {
  const msgs = [...document.querySelectorAll('.tadv-msg.bot')];
  const wa = document.querySelector('.tadv-wa-cta');
  return { msg: msgs[msgs.length - 1].textContent.slice(0, 70), waText: wa ? wa.textContent.trim() : null, waHref: wa ? decodeURIComponent(wa.href).slice(-60) : null };
});
console.log('MANTENIMIENTO:', JSON.stringify(maint));
console.log(errors.length ? 'ERRORES: ' + errors.filter(e => !/gsap|Lenis/i.test(e)).join(';') : 'sin errores');
await browser.close();
