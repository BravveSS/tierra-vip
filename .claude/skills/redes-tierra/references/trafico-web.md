# Cómo mover gente de las redes a tierra.vip

Instagram no deja poner links en los captions y castiga a quien manda gente
fuera. Por eso el tráfico web no sale solo: se diseña. Hay cuatro rutas, en
orden de rendimiento real.

---

## Ruta 1 · Comentario → DM → link (la más potente)

Es la jugada central de esta cuenta. Funciona porque hace tres cosas a la vez:

1. Genera **comentarios** (señal de ranking).
2. Genera **DMs enviados y respondidos** (la señal con más peso en 2026).
3. Manda el link **dentro** de Instagram, sin pedirle a nadie que salga.

**Cómo se arma:**

- El video termina con: *"Comenta PRECIOS y te mando la lista completa."*
- La palabra clave va también en el caption y en el texto en pantalla.
- Cada comentario recibe un DM con el link (con UTM) **más una pregunta**.
- Se puede automatizar con ManyChat o similar, pero el primer mes conviene
  hacerlo a mano: se aprende muchísimo de cómo pregunta la gente.

**Palabras clave por tema** (una por campaña, en mayúsculas, corta y fácil de
escribir):

| Palabra | Qué se manda | A dónde apunta |
|---|---|---|
| `PRECIOS` | Lista de lotes con precio y disponibilidad | `/azimut`, `/nabani` |
| `MAZUNTE` | Guía de terrenos en Mazunte | `/terrenos-en-mazunte` |
| `OBRA` | Desglose de costo de construcción | `/construir-en-la-costa-de-oaxaca` |
| `LEGAL` | Los 5 documentos + qué revisar | `/terrenos-en-mazunte` |
| `TAO` | Disponibilidad de Aldea Tao | `/aldea-tao` |
| `KORA` | Plan de pagos de la preventa | `/depas-kora` |
| `SERENA` | Alta en lista de espera | `/serena` |
| `VISITA` | Agendar visita | WhatsApp |
| `FIDEICOMISO` / `TRUST` | Cómo compra un extranjero | `/nosotros` (EN) |

**Una campaña por semana.** No más: si todos los videos piden comentarios, deja
de funcionar.

---

## Ruta 2 · Link en bio con una página que reparte

Un solo link en las dos redes: **`tierra.vip/redes`**.

Esa página (ya está en el repo, `redes.html`) es un hub que reparte a los
proyectos, a las guías y a WhatsApp, con todos los enlaces trackeados con UTM.
Ventajas frente a un Linktree:

- El tráfico llega a **tierra.vip**, no a un dominio ajeno → SEO y píxel
  propios.
- Se mide entero en GA4 junto con el resto del sitio.
- Carga con el diseño de la marca.
- Se puede cambiar el orden según la campaña de la semana.

**Mantenimiento:** cada lunes, el primer bloque de la página es el tema de la
campaña de esa semana. Si el reel que reventó fue el de precios de Mazunte, el
primer botón es "Precios de los lotes en Mazunte".

---

## Ruta 3 · Stories con sticker de enlace

Las stories son el canal de clics más eficiente por persona alcanzada. Alcanzan
a poca gente, pero esa gente ya te sigue y sí hace clic.

**Secuencia que funciona (no poner el link solo):**

1. Story de contexto: "Ayer nos preguntaron 6 veces cuánto cuesta un lote en
   Mazunte."
2. Story de encuesta: "¿Cuánto crees que cuesta el m²? ⬜ Menos de $1.000 /
   ⬜ Más de $1.000" — la encuesta sube el alcance de la siguiente.
3. Story con la respuesta + sticker de enlace: "Aquí están todos los precios ⬆️".

**Reglas:**
- Al menos 1 story con link al día, siempre precedida de contexto.
- Texto del sticker concreto: "Ver precios" y no "Más info".
- Guardar la secuencia en el highlight `Precios` para que siga trayendo clics.

---

## Ruta 4 · SEO — que el contenido siga trayendo gente sola

Desde 2026 Google indexa publicaciones públicas de cuentas profesionales de
Instagram. Un reel bien escrito puede aparecer en Google meses después.

- Captions con la keyword en la primera línea (ver `copy-seo.md`).
- El nombre del lugar dicho en voz alta (se transcribe).
- Texto alternativo relleno en todos los posts.
- Los artículos del sitio (`/terrenos-en-mazunte`,
  `/construir-en-la-costa-de-oaxaca`) son el destino natural del contenido
  educativo: cada pieza de ese pilar debe apuntar a uno.

**El bucle completo:** reel educativo → comentario-a-DM → artículo del sitio →
formulario o WhatsApp. Ese es el camino que convierte, y es medible de punta a
punta.

---

## Qué hacer con la gente cuando ya llegó

Traer visitas no sirve si se pierden. En el sitio ya existen las piezas:

- **Comparador de proyectos** en `/nosotros` — perfecto para el que llega frío.
- **Calculadora de enganche** en `/construccion` — engancha al perfil B.
- **Formularios de asesor** — evento `lead_form_submit` en GA4.
- **WhatsApp** — evento `whatsapp_click` en GA4.
- **Lista de espera de Serena** — el activo propio: audiencia que no depende
  de ningún algoritmo.

**Prioridad del trimestre:** que todo el que llegue de redes acabe en una de
estas tres: WhatsApp, formulario o lista de Serena. Los seguidores son
prestados; esas tres listas son de Tierra.

---

## Errores que matan el tráfico

- Poner "link en bio" sin decir **qué** hay en el link.
- Mandar todo al home. El home no responde la pregunta específica del video;
  manda a la página del proyecto o del artículo.
- Contestar los DMs a los dos días. La ventana buena es la primera hora.
- Contestar solo con el link, sin pregunta. Se acaba la conversación.
- Cambiar el link de la bio y no actualizar el UTM → se pierde la medición.
- Pedir clic en todos los videos. El contenido de alcance frío no debe pedir
  nada más que compartir o guardar.
