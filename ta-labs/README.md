# TA Labs — landing

Landing de la agencia. Carpeta autocontenida: se despliega como **proyecto
independiente de Cloudflare Pages**, sin tocar ni depender de tierra.vip.
Cuando TA Labs tenga su propio repositorio, basta con mover esta carpeta tal cual.

## Qué lleva

| Pieza | Dónde |
|---|---|
| Página | `index.html` |
| Estilos | `assets/ta.css` |
| Interacción | `assets/ta.js` |
| GSAP + Lenis | `assets/vendor/` (auto-alojados) |
| Tipografía Inter | `assets/fonts/` (auto-alojada) |
| Capturas del caso | `assets/img/` |
| API | `functions/api/` |
| Esquema de base de datos | `supabase.sql` |

Sin build ni dependencias: son archivos estáticos más tres funciones serverless.

## Desplegar

1. **Supabase** — crea un proyecto y ejecuta `supabase.sql` en el SQL Editor.
   Crea `ta_leads` y `ta_reuniones` con RLS activo.
2. **Resend** — verifica tu dominio y crea una API key.
3. **Anthropic** — crea una API key en console.anthropic.com.
4. **Cloudflare Pages** — nuevo proyecto conectado a este repositorio:
   - Build command: *(vacío)*
   - Build output directory: `ta-labs`
5. Añade las variables de entorno (Settings → Environment variables). Todas
   como **Secret**, nunca en el código:

```
SUPABASE_URL          https://xxxx.supabase.co
SUPABASE_SERVICE_KEY  (service_role key — NUNCA la pongas en el front)
RESEND_API_KEY        re_xxxx
ANTHROPIC_API_KEY     sk-ant-xxxx
MAIL_FROM             TA Labs <hola@tudominio.com>
MAIL_TO               tu@correo.com
```

La web funciona sin ninguna de ellas: los formularios avisan del fallo y el
chat muestra un mensaje de respaldo invitando a agendar. Se degrada, no se rompe.

## API

| Ruta | Qué hace |
|---|---|
| `POST /api/lead` | Guarda el lead de la calculadora y envía propuesta + aviso |
| `POST /api/booking` | Reserva la reunión y envía confirmación + aviso |
| `POST /api/chat` | Asistente con Claude, acotado a TA Labs |

Las tres validan la entrada, limitan por IP y devuelven 405 en métodos que no
sean POST. `booking` revalida fecha y hora en el servidor: solo días laborables
futuros y horas de la lista, porque el cliente puede enviar cualquier cosa.

## Antes de publicar

- [ ] Cambiar `talabs.dev` por el dominio real en `index.html` (canonical, OG,
      JSON-LD), `robots.txt` y `sitemap.xml`.
- [ ] Poner el correo real de contacto en `MAIL_TO`.
- [ ] Revisar los precios de `index.html` y del `SYSTEM` de `functions/api/chat.js`
      — **están en dos sitios y deben coincidir**, o el asistente citará cifras
      distintas a las de la web.
- [ ] Crear una imagen `og-image` (1200×630) y enlazarla en `og:image`.

## Notas de implementación

- **Sin CDN de terceros.** GSAP, Lenis y la tipografía van auto-alojados: una
  conexión menos que abrir antes de pintar, y ningún dominio ajeno recibe las
  IPs de los visitantes.
- **Todo degrada.** Si el JavaScript no carga, el contenido se ve igual: el
  estado inicial de las animaciones solo se aplica cuando la página confirma
  que el JS está vivo.
- **`prefers-reduced-motion` se respeta de verdad**: se apaga la red de nodos,
  el marquee y los reveals, no solo se acortan.
- Las capturas de `assets/img/` se regeneran sirviendo tierra.vip en local y
  disparando con Playwright; el aviso de cookies y los botones flotantes se
  retiran antes de capturar.
