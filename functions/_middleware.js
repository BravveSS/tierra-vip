/* Cloudflare Pages — un dominio por landing (equivalente a los redirects
   de netlify.toml). Cada dominio de proyecto muestra SU página en la raíz
   sin cambiar la URL de la barra; los assets pasan normales.
   tierra.vip = dominio principal (muestra el inicio, no necesita regla). */

const LANDING = {
  'centroazimut.com': '/azimut.html',
  'nabani.mx': '/nabani.html',
  'aldeatao.com': '/aldea-tao.html',
  'proyectoserena.com': '/serena.html',
  'depaskora.com': '/depas-kora.html',
  'grupo-tierra.com': '/nosotros.html',
  'grupotierra.net': '/construccion.html',
};

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const host = url.hostname.replace(/^www\./, '');

  // www.tierra.vip → tierra.vip (concentra el SEO en el dominio principal)
  if (url.hostname === 'www.tierra.vip') {
    url.hostname = 'tierra.vip';
    return Response.redirect(url.toString(), 301);
  }

  // Dominio de proyecto: la raíz sirve su landing (rewrite, no redirect)
  const landing = LANDING[host];
  if (landing && (url.pathname === '/' || url.pathname === '/index.html')) {
    return ctx.env.ASSETS.fetch(new URL(landing, url).toString(), ctx.request);
  }

  return ctx.next();
}
