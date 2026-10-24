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

const PRIVADO = /^\/(portal-backend|\.github|\.claude|netlify|functions|node_modules)(\/|$)|^\/(server\.js|package(-lock)?\.json|README\.md|netlify\.toml|sw-verify\.mjs|\.gitignore|\.env.*)$/i;

export async function onRequest(ctx) {
  const url = new URL(ctx.request.url);
  const host = url.hostname.replace(/^www\./, '');

  // www.tierra.vip → tierra.vip (concentra el SEO en el dominio principal)
  if (url.hostname === 'www.tierra.vip') {
    url.hostname = 'tierra.vip';
    return Response.redirect(url.toString(), 301);
  }

  // El hosting publica la raíz del repo entera. El código del backend, los
  // esquemas SQL (con los correos de los superadmins) y la configuración no
  // son parte de la web: se responden como si no existieran.
  if (PRIVADO.test(url.pathname)) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  // Nombres alternativos que circulan en enlaces viejos o en material de redes.
  // Conserva ?utm_… para no perder el origen de la visita.
  const ALIAS = {
    '/privacidad': '/aviso-de-privacidad',
    '/privacidad.html': '/aviso-de-privacidad',
    '/redes': '/links',
  };
  const destino = ALIAS[url.pathname];
  if (destino) {
    url.pathname = destino;
    return Response.redirect(url.toString(), 301);
  }

  // Dominio de proyecto: la raíz sirve su landing (rewrite, no redirect)
  const landing = LANDING[host];
  if (landing && (url.pathname === '/' || url.pathname === '/index.html')) {
    return ctx.env.ASSETS.fetch(new URL(landing, url).toString(), ctx.request);
  }

  return ctx.next();
}
