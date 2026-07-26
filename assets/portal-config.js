/* TIERRA — Configuración del portal.
   Claves PÚBLICAS del proyecto Supabase (seguras por diseño; la seguridad
   real la da el RLS de la base de datos). */
window.TIERRA_SUPABASE = {
  url: 'https://hgdccmkpepjcmrrnpdms.supabase.co',
  anonKey: 'sb_publishable_qp0nJ5AWwCFgekGkG01cEg_XQ4sP66m'
};
window.TIERRA_PORTAL_READY = function () {
  var c = window.TIERRA_SUPABASE;
  return c && c.url.indexOf('REEMPLAZAR') === -1 && c.anonKey.indexOf('REEMPLAZAR') === -1;
};
