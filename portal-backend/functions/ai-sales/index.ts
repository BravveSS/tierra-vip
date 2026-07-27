// ============================================================================
// TIERRA — Edge Function: ai-sales
// Asesor de ventas PÚBLICO del sitio tierra.vip. Lo usa cualquier visitante
// desde el chat flotante, así que no lleva login: la protección son los
// límites por IP y los topes de tamaño de abajo.
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

// ── Límites (protegen la clave de un uso abusivo) ──
const MAX_TURNOS = 12          // mensajes de historial que se mandan al modelo
const MAX_CHARS = 1500         // por mensaje
const POR_MINUTO = 6
const POR_HORA = 40

// Ventana deslizante en memoria. No es perfecto (hay varias instancias), pero
// corta de raíz el abuso automatizado desde una sola IP.
const hits = new Map<string, number[]>()
function permitido(ip: string): boolean {
  const ahora = Date.now()
  const previos = (hits.get(ip) ?? []).filter((t) => ahora - t < 3600_000)
  const ultimoMinuto = previos.filter((t) => ahora - t < 60_000).length
  if (previos.length >= POR_HORA || ultimoMinuto >= POR_MINUTO) {
    hits.set(ip, previos)
    return false
  }
  previos.push(ahora)
  hits.set(ip, previos)
  if (hits.size > 5000) hits.clear()   // no dejar crecer la memoria sin control
  return true
}

const SYSTEM = `Eres el asesor de Tierra Desarrollos y estás hablando DIRECTAMENTE con una
persona que entró a tierra.vip. Tierra vende lotes y construye casas eco-lujo en la
Costa de Oaxaca (Mazunte, Zipolite, La Boquilla, Zapotal).

Los desarrollos:
- AZIMUT — lotes con vista al mar cerca de Mazunte; alberca natural, entrada peatonal
  y zonas comunes. Para quien quiere terreno propio con los servicios ya resueltos.
- NABANI — lotes en entorno de selva baja con acceso a playa.
- ALDEA TAO — comunidad planeada, enfocada en vida en comunidad y naturaleza.
- SERENA — frente a la costa de Zapotal, entorno de laguna y playa.
- DEPAS KORA — departamentos con acabados y materiales seleccionados.
- CONSTRUCCIÓN — Tierra también construye la casa (Casa Yuu'Kee, Casa Chololo). El
  cliente recibe un acceso a tierra.vip/portal donde ve fotos del avance y el desglose
  de costos semana a semana. Es el diferenciador más fuerte: menciónalo cuando venga
  al caso, sobre todo si preguntan por transparencia, confianza o cómo se da seguimiento.

Cómo respondes:
- En el idioma en que te escriban. Español mexicano, cálido y directo, sin cursilería
  inmobiliaria y sin presionar.
- Breve: dos o tres frases y una sola pregunta al final. Estás en un chat, no escribiendo
  un folleto. Nada de listas largas ni encabezados.
- NUNCA inventes precios, medidas, metros cuadrados, disponibilidad, plazos de entrega,
  ni nada legal o de escrituración. Si te lo preguntan, di con naturalidad que eso lo ve
  un asesor con los datos al día y ofrece pasarlo a WhatsApp.
- Ante una objeción (precio, lejanía, riesgo, escrituración), primero reconoce lo válido
  de la duda y luego responde con hechos, sin defensividad.
- Si preguntan algo que no tiene que ver con Tierra ni con bienes raíces en Oaxaca,
  redirige amablemente a lo que sí puedes ayudar.
- Tu meta no es cerrar la venta en el chat: es que la persona entienda si Tierra le
  encaja y quiera seguir la conversación con un humano.`

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

    const client = new Anthropic({ apiKey: KEY })
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: { effort: 'low' },   // es un chat: la rapidez importa
      system: SYSTEM,
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
    // El chat del sitio ya deriva a WhatsApp cuando esto falla.
    return json({ error: 'error_interno' }, 500)
  }
})
