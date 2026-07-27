# Plantillas de correo de Supabase Auth

Los correos que manda Supabase (restablecer contraseña, invitación, confirmar
correo) **no se despliegan desde este repo**: se pegan a mano en el panel.
Aquí quedan guardados para no reescribirlos y para que todos hablen igual que
`notify-update`, que es el correo que sí manda nuestra Edge Function.

## Cómo aplicarlas

Supabase → **Authentication** → **Emails** → pestaña **Templates** → elige la
plantilla, pega el HTML del archivo correspondiente y **Save**.

| Archivo | Plantilla de Supabase | Asunto sugerido |
|---|---|---|
| `recovery.html` | Reset Password | `Restablece tu contraseña — Tierra Desarrollos` |

Las cuentas de cliente se crean desde el panel con contraseña ya puesta
(`admin-create-client`), así que la plantilla *Invite user* no se usa.

## Reglas para no romperlas

- `{{ .ConfirmationURL }}` es la variable que inyecta Supabase. **No la toques**
  ni la muevas fuera del `href`: sin ella el enlace no funciona.
- Todo el CSS va **en línea** (`style="..."`). Gmail y Outlook descartan
  cualquier `<style>` del `<head>`.
- Nada de fuentes externas: los clientes de correo no las cargan. Se usa
  Georgia (el serif más parecido a Cormorant) con Arial de respaldo.
- Tabla de un solo bloque centrado, máximo 520 px: es lo que sobrevive igual en
  iPhone, Gmail y Outlook de escritorio.
