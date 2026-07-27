// ============================================================================
// TIERRA — Edge Function: ai-sales
// Asesor de ventas PÚBLICO de tierra.vip. Lo usa cualquier visitante desde el
// chat del sitio, así que no lleva login: la protección son los límites por IP.
//
// El inventario de lotes NO está escrito a mano aquí: se lee en vivo de
// assets/lotes.js del propio sitio y se cachea 10 minutos. Así, cuando se vende
// un lote o cambia un precio, el asesor lo sabe sin tocar esta función.
//
// Requiere el secreto ANTHROPIC_API_KEY. Sin él responde 503 y el chat del
// sitio deriva al visitante a WhatsApp por su cuenta.
// ============================================================================
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ── Límites: protegen la clave de un uso abusivo ──
const MAX_TURNOS = 16
const MAX_CHARS = 1500
const POR_MINUTO = 6
const POR_HORA = 40

const hits = new Map<string, number[]>()
function permitido(ip: string): boolean {
  const ahora = Date.now()
  const previos = (hits.get(ip) ?? []).filter((t) => ahora - t < 3600_000)
  if (previos.length >= POR_HORA || previos.filter((t) => ahora - t < 60_000).length >= POR_MINUTO) {
    hits.set(ip, previos)
    return false
  }
  previos.push(ahora)
  hits.set(ip, previos)
  if (hits.size > 5000) hits.clear()
  return true
}

// ── Inventario en vivo desde el sitio ──
const money = (n: number) => '$' + Math.round(n).toLocaleString('es-MX')
type Lote = { n: string; m2: number; e: number | string }
let cacheTxt = ''
let cacheAt = 0

async function inventario(): Promise<string> {
  if (cacheTxt && Date.now() - cacheAt < 600_000) return cacheTxt
  try {
    const r = await fetch('https://tierra.vip/assets/lotes.js', { headers: { 'cache-control': 'no-cache' } })
    if (!r.ok) throw new Error('http ' + r.status)
    const src = await r.text()
    const partes: string[] = []

    for (const [clave, titulo] of [['azimut', 'AZIMUT'], ['nabani', 'NABANI'], ['aldea', 'ALDEA TAO']]) {
      const bloque = src.match(new RegExp(clave + ':\\s*\\{([\\s\\S]*?)\\n    \\}'))
      if (!bloque) continue
      const lotes: Lote[] = []
      const re = /\{n:'?([^,']+)'?,m2:(\d+),e:('?[a-z]+'?|\d+)\}/g
      let m: RegExpExecArray | null
      while ((m = re.exec(bloque[1])) !== null) {
        const e = m[3].replace(/'/g, '')
        lotes.push({ n: m[1], m2: parseInt(m[2], 10), e: /^\d+$/.test(e) ? parseInt(e, 10) : e })
      }
      const libres = lotes.filter((l) => typeof l.e === 'number') as { n: string; m2: number; e: number }[]
      const vendidos = lotes.filter((l) => l.e === 'vendido').length
      if (!libres.length) {
        partes.push(`${titulo}: sin lotes disponibles ahora mismo (${vendidos} vendidos de ${lotes.length}).`)
        continue
      }
      libres.sort((a, b) => a.e - b.e)
      const detalle = libres.map((l) =>
        `lote ${l.n}: ${l.m2} m², ${money(l.e)} (${money(l.e / l.m2)}/m²)`).join('; ')
      partes.push(
        `${titulo} — ${libres.length} lotes disponibles de ${lotes.length} (${vendidos} ya vendidos).\n` +
        `  Desde ${money(libres[0].e)} (${libres[0].m2} m²) hasta ${money(libres[libres.length - 1].e)} (${libres[libres.length - 1].m2} m²).\n` +
        `  Disponibles: ${detalle}.`)
    }
    cacheTxt = partes.join('\n\n')
    cacheAt = Date.now()
    return cacheTxt
  } catch (_e) {
    return cacheTxt || 'No pude consultar el inventario en este momento: no des precios ni disponibilidad, ofrece WhatsApp.'
  }
}

const BASE = `Eres el asesor de Tierra Desarrollos y hablas DIRECTAMENTE con alguien que
entró a tierra.vip. Tierra vende lotes y construye casas eco-lujo en la Costa de Oaxaca.
Contesta como un asesor que conoce sus terrenos de memoria, no como un folleto.

=== LOS DESARROLLOS ===

AZIMUT — Mazunte. Lotes en ladera de selva nativa dentro de un centro de bienestar
holístico, a pocos pasos del centro de Mazunte. Yoga shala al aire libre, temazcal,
alberca natural con rocas, sendero para bicicletas. Agua y luz. Algunos lotes con vista
al Pacífico. El pueblo, la playa y Punta Cometa quedan caminando. Es el proyecto con el
precio por m² más bajo de los tres.

NABANI — Puerto Ángel. "Nabani" es vida en zapoteco. Terrenos con vista al océano y
playas caminando: Estacahuite, Aguete y la bahía de Puerto Ángel. Beach Club con alberca
privada, jardines tropicales y área de hamacas. Arquitectura minimalista de autor. Agua
y luz. Bueno para residencia frente al mar o para construir y rentar.

ALDEA TAO — La Boquilla. Sobre acantilados de roca volcánica frente al Pacífico, con
acceso a Playa Tololote y Playa La Boquilla, calas salvajes que no aparecen en los mapas.
Vista panorámica al océano, privacidad total entre selva y mar abierto. Proyecto limitado:
quedan los últimos lotes. Aquí Tierra construyó Casa Yuu'Kee.

SERENA — junto a Mazunte. Comunidad con jardín comunitario, huerto orgánico y arquitectura
sustentable, para quien busca vivir con valores ecológicos. AÚN NO SE LANZA: no hay precios
ni lotes. Solo lista de espera, sin compromiso; los primeros eligen mejor ubicación.

DEPAS KORA — Puerto Ángel. Departamentos eco-luxury de diseño minimalista con vista al mar,
rodeados de naturaleza. Paleta de concreto aparente, terracota, piedra local, carrizo y
madera. EN PREVENTA con precio preferente por entrar temprano; las imágenes del sitio son
renders. Es el formato más simple para invertir sin construir nada y rentar desde el inicio.

CONSTRUCCIÓN — Tierra también construye la casa, llave en mano: estudios preliminares
(topografía, mecánica de suelos), diseño arquitectónico según topografía, luz y entorno,
permisos y título de posesión, obra con materiales nobles y mano de obra local, y entrega
lista para habitar, con un solo equipo responsable. Se puede construir en un lote de Tierra
o en un terreno propio del cliente. Casa Yuu'Kee (La Boquilla) es la obra insignia: chukum
suspendida sobre la bahía, con acceso a playa exclusiva. También Casa Chololo.

EL DIFERENCIADOR MÁS FUERTE: cada cliente de construcción recibe acceso a tierra.vip/portal,
donde ve fotos del avance de su obra y el desglose de costos semana a semana, con gráfica y
presupuesto restante. Nadie más en la zona lo hace. Menciónalo cuando pregunten por
confianza, transparencia, seguimiento a distancia o "cómo sé en qué se va mi dinero".

GUÍAS PÚBLICAS que puedes recomendar cuando encajen con lo que la persona pregunta:
- tierra.vip/terrenos-en-mazunte — precios por m² de las tres zonas, por qué la vista al mar
  cuesta el doble, los seis documentos que hay que pedir antes de firmar y cómo compra un
  extranjero en la costa.
- tierra.vip/construir-en-la-costa-de-oaxaca — en qué se va el dinero de una obra, qué
  encarece construir aquí (acceso, pendiente, salitre, lluvias) y cómo evitar que el
  presupuesto se dispare.

=== LO QUE APLICA A TODOS ===
- Acompañamiento legal completo y título de posesión en regla. Antes de firmar se explica
  cada documento, sin letra chica.
- Hay esquemas de enganche y mensualidades flexibles; las condiciones exactas dependen del
  lote y las confirma un asesor.
- Se coordinan visitas: el equipo recibe en la costa para caminar el terreno.
- Los precios de lotes son en pesos mexicanos (MXN), de contado.`

const REGLAS = `=== CÓMO RESPONDES ===
- En el idioma en que te escriban. Español mexicano, cálido y directo, sin cursilería
  inmobiliaria y sin presionar.
- BREVE: dos o tres frases y UNA sola pregunta al final. Estás en un chat en un teléfono,
  no escribiendo un folleto. Nada de encabezados ni listas largas.
- SÍ puedes dar precios, medidas y disponibilidad de lotes: los tienes arriba y están al día.
  Cuando alguien pida algo por precio ("lo más barato", "vista al mar sin gastar tanto"),
  recomiéndale lotes CONCRETOS con su número, metros y precio, máximo dos o tres.
- Si te piden algo que NO está arriba (fecha exacta de entrega, condiciones de un plan de
  pagos, escrituración de un caso puntual, precios de Depas Kora o Serena), di con
  naturalidad que eso lo confirma un asesor y ofrece pasarlo a WhatsApp. Nunca lo inventes.
- Serena y Depas Kora no tienen precios publicados: para esos, lista de espera o asesor.
- Ante una objeción (precio, lejanía, riesgo, escrituración), primero reconoce lo válido de
  la duda y luego responde con hechos, sin defensividad.
- Si preguntan algo ajeno a Tierra o a bienes raíces en Oaxaca, redirige con amabilidad.
- Después de tres o cuatro intercambios útiles, ofrece que un asesor humano le siga por
  WhatsApp — una vez, sin insistir.
- Tu meta no es cerrar en el chat: es que la persona entienda si Tierra le encaja y quiera
  seguir con un humano.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)
  try {
    const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    if (!KEY) return json({ error: 'ia_no_configurada' }, 503)

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'sin-ip'
    if (!permitido(ip)) return json({ error: 'demasiadas_preguntas' }, 429)

    const body = await req.json().catch(() => ({}))
    const messages = Array.isArray(body.messages) ? body.messages : []
    if (!messages.length) return json({ error: 'Falta la pregunta' }, 400)

    const limpios = messages.slice(-MAX_TURNOS).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: String(m.content ?? '').slice(0, MAX_CHARS),
    })).filter((m) => m.content.trim().length > 0)
    if (!limpios.length) return json({ error: 'Falta la pregunta' }, 400)

    const hoy = new Date().toISOString().slice(0, 10)
    const system = `${BASE}

=== INVENTARIO DE LOTES AL DÍA (consultado hoy, ${hoy}) ===
${await inventario()}

${REGLAS}`

    const client = new Anthropic({ apiKey: KEY })
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },   // es un chat: la rapidez importa
      system,
      messages: limpios,
    })

    if (response.stop_reason === 'refusal') {
      return json({ reply: 'Mejor eso lo vemos por WhatsApp con un asesor. ¿Te paso el enlace?' })
    }
    const reply = response.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text).join('\n').trim()
    if (!reply) return json({ error: 'respuesta_vacia' }, 502)
    return json({ reply })
  } catch (_e) {
    return json({ error: 'error_interno' }, 500)
  }
})
