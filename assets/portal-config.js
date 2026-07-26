/* TIERRA — Configuración del portal.
   Pega aquí los 2 datos PÚBLICOS de tu proyecto Supabase
   (Supabase → Project Settings → API):
     - Project URL     → url
     - anon public key → anonKey
   Son claves públicas por diseño; la seguridad la da el RLS de la base de datos. */
window.TIERRA_SUPABASE = {
  url: 'REEMPLAZAR_PROJECT_URL',
  anonKey: 'REEMPLAZAR_ANON_KEY'
};
window.TIERRA_PORTAL_READY = function () {
  var c = window.TIERRA_SUPABASE;
  return c && c.url.indexOf('REEMPLAZAR') === -1 && c.anonKey.indexOf('REEMPLAZAR') === -1;
};
