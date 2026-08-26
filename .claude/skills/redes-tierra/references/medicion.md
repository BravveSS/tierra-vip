# Medición — UTMs, GA4 y el reporte semanal

Sin medición no hay mes 2: el plan entero depende de detectar qué funcionó en
el mes 1 y multiplicarlo. Esto es lo mínimo que hay que tener.

---

## Convención de UTMs

**Nunca** pongas un link a tierra.vip en redes sin UTM. Un link sin UTM aparece
en GA4 como tráfico directo o social genérico y se pierde la trazabilidad.

```
https://tierra.vip/<pagina>?utm_source=<red>&utm_medium=<ubicacion>&utm_campaign=<campana>
```

| Parámetro | Valores permitidos |
|---|---|
| `utm_source` | `instagram` · `tiktok` · `youtube` · `facebook` |
| `utm_medium` | `bio` · `stories` · `dm` · `reel` · `perfil` |
| `utm_campaign` | nombre de la campaña, en minúsculas y con guiones: `precios-mazunte`, `casa-desde-cero`, `legal-documentos`, `preventa-kora`, `lista-serena` |

**Ejemplos:**

```
Bio de Instagram
https://tierra.vip/redes?utm_source=instagram&utm_medium=bio&utm_campaign=perfil

Bio de TikTok
https://tierra.vip/redes?utm_source=tiktok&utm_medium=bio&utm_campaign=perfil

DM de la campaña PRECIOS
https://tierra.vip/azimut?utm_source=instagram&utm_medium=dm&utm_campaign=precios-mazunte

Story con link a la guía
https://tierra.vip/terrenos-en-mazunte?utm_source=instagram&utm_medium=stories&utm_campaign=legal-documentos
```

Genera los links con el script incluido:

```bash
python3 .claude/skills/redes-tierra/scripts/utm.py --red instagram --ubicacion dm --campana precios-mazunte --destino azimut
```

---

## GA4 — lo que ya está y lo que hay que mirar

El sitio ya tiene GA4 (`G-X2MWFYSH0Y`) con Consent Mode v2 en
`assets/tierra-analytics.js`, y ya dispara dos eventos que son los que
importan:

| Evento | Cuándo | Dónde se define |
|---|---|---|
| `whatsapp_click` | clic en cualquier enlace `wa.me` | `assets/tierra-analytics.js` |
| `lead_form_submit` | envío de formulario de asesor | `assets/tierra-analytics.js` |
| `compare_slide` | uso del comparador render/obra | `assets/tierra-compare.js` |
| `exit_intent_shown` | intención de salida | `assets/tierra-advisor.js` |

**Informes a revisar cada lunes en GA4:**

1. **Adquisición → Adquisición de tráfico**, filtrando por
   `Origen/medio = instagram / *` y `tiktok / *`. Da sesiones desde redes.
2. **Interacción → Eventos**, mirando `whatsapp_click` y `lead_form_submit`
   segmentados por origen. Esto es lo único que dice si las redes venden.
3. **Interacción → Páginas**, para ver qué página del sitio recibe el tráfico
   de redes (indica qué contenido está tirando).

Marcar `whatsapp_click` y `lead_form_submit` como **conversiones** en GA4 si
todavía no lo están: así aparecen en todos los informes sin tener que
construirlos.

---

## Métricas por plataforma — cuáles importan y cuáles no

**Sí importan:**

| Métrica | Dónde | Qué significa | Objetivo |
|---|---|---|---|
| Vistas de no-seguidores | Insights del reel | Si el contenido sale del círculo | >70 % del total |
| Retención a 3 s | Insights del reel | Si el gancho sirve | >60 % |
| Compartidos / envíos | Insights del reel | **La señal más pesada** | >2 % de las vistas |
| Guardados | Insights del reel | Valor percibido | >1 % |
| Seguidores nuevos por post | Insights del reel | Conversión a seguidor | >0,5 % de vistas |
| Likes | Insights del reel | Meta declarada | 150+ |
| Sesiones desde redes | GA4 | Meta declarada | subir mes a mes |
| `whatsapp_click` desde redes | GA4 | Lo único que es dinero | subir mes a mes |

**No importan (no reportarlas como logro):** impresiones totales, número de
hashtags, "alcance de la cuenta" agregado, seguidores comprados o de sorteos.

---

## Tracker semanal

Se llena cada lunes con los datos de la semana anterior:
`assets/tracker-semanal.csv`.

Columnas: `fecha, plataforma, pieza, pilar, perfil, estructura_gancho,
duracion_s, vistas, pct_no_seguidores, retencion_3s, likes, comentarios,
compartidos, guardados, seguidores_nuevos, clics_link, notas`.

**La columna que más se usa es `estructura_gancho`.** Después de 4 semanas,
ordena por vistas y mira qué estructuras están arriba: ese es el hallazgo que
decide el mes 2.

---

## Reporte semanal (15 minutos, cada lunes)

```
SEMANA DEL __ AL __

CRECIMIENTO
  Seguidores IG:     ____  (semana anterior ____, delta ____)
  Seguidores TikTok: ____  (delta ____)
  ¿Vamos al ritmo de 22/día? SÍ / NO

CONTENIDO
  Piezas publicadas: __ reels, __ carruseles, __ stories, __ TikToks
  Mejor pieza:  ____ (vistas ____, likes ____, envíos ____)
  Peor pieza:   ____ (vistas ____)
  Promedio de likes por reel: ____   (meta: 150)

HALLAZGO
  ¿Qué tenía la mejor pieza que no tenían las demás?
  ¿Qué estructura de gancho ganó?

WEB (GA4)
  Sesiones desde instagram: ____  desde tiktok: ____
  whatsapp_click desde redes: ____
  lead_form_submit desde redes: ____

DECISIÓN DE LA SEMANA QUE VIENE
  Repetimos:   ____
  Dejamos de hacer: ____
  Probamos:    ____
```

El reporte no sirve para presumir números: sirve para decidir esas tres
últimas líneas. Si un lunes no salen tres decisiones, el reporte estuvo mal
hecho.

---

## Hitos de control

| Momento | Pregunta | Si la respuesta es no |
|---|---|---|
| Día 14 | ¿Hay al menos un video sobre 5.000 vistas? | Cambiar estructuras de gancho, ir más a "lugar y vida" |
| Día 30 | ¿+300 seguidores y 2 videos sobre 10.000? | Revisar los primeros 3 s de todo; subir frecuencia |
| Día 45 | ¿Promedio de likes sobre 80? | Acortar duración, un segundo gancho a la mitad |
| Día 60 | ¿+1.000 acumulados y 1 video sobre 50.000? | Doblar el formato ganador, entrar a colaboraciones |
| Día 75 | ¿Tráfico web de redes ×2 vs. mes 1? | Campaña comentario-a-DM semanal + stories con link diarias |
| Día 90 | ¿2.000 seguidores y 150 likes de promedio? | Revisar el trimestre entero con el tracker y rehacer la mezcla |

**Honestidad con los números:** si a día 90 el resultado es 1.400 seguidores,
eso es un buen trimestre, no un fracaso. Lo que hay que mirar es la tendencia y
si ya hay leads llegando de redes. Nunca infles un reporte.
