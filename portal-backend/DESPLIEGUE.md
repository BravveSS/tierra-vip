# Desplegar las Edge Functions

El código de las funciones vive en `portal-backend/functions/`. **Lo que se mergea
en `main` es lo que corre**: GitHub Actions las sube solo, con el workflow
`.github/workflows/desplegar-funciones.yml`.

## Configuración (una sola vez)

1. Entra a <https://supabase.com/dashboard/account/tokens> y genera un token
   (*Generate new token*). Cópialo — solo se muestra una vez.
2. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `SUPABASE_ACCESS_TOKEN`
   - Secret: el token del paso 1

El token no se pega nunca en un chat ni en un archivo del repo: vive solo ahí.

Hecho esto, cada merge a `main` que toque `portal-backend/functions/**` despliega
las funciones modificadas y, si `ai-sales` cambió, comprueba que responde.

## Desplegar a mano

En GitHub → pestaña **Actions** → *Desplegar Edge Functions* → **Run workflow**.
El campo `funcion` acepta un nombre concreto (`ai-sales`) o se deja vacío para
subir todas.

## Las funciones

| Función | Quién la llama | Sesión |
|---|---|---|
| `ai-sales` | cualquier visitante del sitio, desde el chat | **no** (`--no-verify-jwt`), la protegen los límites por IP |
| `ai-advisor` | admins dentro del panel | sí |
| `ai-parse-costs` | admins, al pegar costos | sí |
| `admin-create-client` | superadmin | sí |
| `notify-update` | admins, al publicar un avance | sí |

Si algún día se agrega otra función pública, hay que añadirla junto a `ai-sales`
en el paso *Desplegar* del workflow; si no, se despliega exigiendo sesión y el
sitio recibirá 401.

## Secretos que necesitan las funciones

Se configuran en Supabase → **Edge Functions → Secrets** (no en GitHub):

- `ANTHROPIC_API_KEY` — sin ella `ai-sales` responde 503 y el chat deriva a WhatsApp.
- `RESEND_API_KEY` y `NOTIFY_FROM` — para los correos de avance.
