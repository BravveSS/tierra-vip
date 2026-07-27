// ============================================================================
// TIERRA — Edge Function: ai-advisor
// Dos asesores con la API de Claude, solo para admins autenticados:
//   mode:'obra'   → asesor de obra: ve proyectos, costos, avances y notas reales
//                   y ayuda a decidir, redactar avisos y detectar desviaciones.
//   mode:'ventas' → asesor de ventas: conoce los desarrollos de Tierra y ayuda a
//                   responder prospectos, manejar objeciones y escribir mensajes.
// Requiere el secreto ANTHROPIC_API_KEY. Sin él responde {error:'ia_no_configurada'}.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const money = (n: number) => '$' + Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })

const VENTAS = `Eres el asesor de ventas de Tierra Desarrollos, inmobiliaria de lotes y
construcción eco-lujo en la Costa de Oaxaca (Mazunte, Zipolite, La Boquilla, Zapotal).

Los desarrollos de Tierra:
- AZIMUT — lotes con vista al mar cerca de Mazunte; alberca natural, entrada peatonal,
  zonas comunes. Para quien busca terreno propio con servicios ya resueltos.
- NABANI — lotes en entorno de selva baja con acceso a playa.
- ALDEA TAO — comunidad planeada con enfoque en vida en comunidad y naturaleza.
- SERENA — frente a la costa de Zapotal, entorno de laguna y playa.
- DEPAS KORA — departamentos con acabados y materiales seleccionados.
- CONSTRUCCIÓN — Tierra también construye la casa (ej. Casa Yuu'Kee, Casa Chololo),
  con portal donde el cliente ve el avance y los costos semana a semana.

Cómo trabajas:
- Respondes en español mexicano, cálido pero directo, sin cursilería inmobiliaria.
- Cuando te pidan un mensaje para un prospecto, escríbelo listo para copiar y pegar
  a WhatsApp: corto, humano, con una sola pregunta al final que invite a responder.
- Nunca inventes precios, metros, disponibilidad, plazos ni datos legales. Si no los
  tienes, di exactamente qué dato falta y deja un hueco marcado para que Tomás lo llene.
- Ante una objeción (precio, lejanía, riesgo, escrituración) reconoce lo válido de la
  duda primero y responde con hechos, no con presión.
- El diferenciador fuerte de Tierra es el portal de avance de obra: el cliente ve
  fotos y costos reales cada semana. Úsalo cuando venga al caso.`

const OBRA = `Eres el asesor de obra de Tierra Desarrollos, para el equipo interno que
administra las construcciones. Abajo tienes los datos REALES del sistema.

Cómo trabajas:
- Respondes en español mexicano, concreto y accionable. Nada de relleno.
- Cuando des números, úsalos tal cual vienen abajo. Si algo no está en los datos,
  dilo claramente en vez de estimarlo.
- Si te piden redactar la nota o el aviso para el cliente, escríbelo listo para pegar:
  claro para alguien que no es de construcción, sin tecnicismos innecesarios.
- Señala desviaciones que veas (un gasto que se disparó contra semanas previas, el
  presupuesto acercándose al límite, obras sin avances publicados hace mucho).
- Sé breve por defecto; si el tema lo pide, entonces sí extiéndete.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)
  try {
    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (!isAdmin) return json({ error: 'No autorizado' }, 403)

    const { mode, messages } = await req.json()
    if (!Array.isArray(messages) || !messages.length) return json({ error: 'Falta la pregunta' }, 400)
    if (!KEY) return json({ error: 'ia_no_configurada' })

    let system = mode === 'ventas' ? VENTAS : OBRA

    // El asesor de obra recibe el estado real del sistema como contexto
    if (mode !== 'ventas') {
      const admin = createClient(URL, SERVICE)
      const { data: projects } = await admin.from('projects').select('*').order('created_at', { ascending: false })
      const lines: string[] = []
      for (const p of projects ?? []) {
        const { data: weeks } = await admin.from('cost_weeks')
          .select('id, week_label, date_from, date_to').eq('project_id', p.id).order('created_at', { ascending: false }).limit(8)
        const { count: nUpd } = await admin.from('updates')
          .select('id', { count: 'exact', head: true }).eq('project_id', p.id)
        const { data: notes } = await admin.from('project_notes')
          .select('note_date, title, body').eq('project_id', p.id).order('note_date', { ascending: false }).limit(4)

        let acumulado = 0
        const wLines: string[] = []
        for (const w of weeks ?? []) {
          const { data: items } = await admin.from('cost_items')
            .select('concept, amount').eq('week_id', w.id).order('amount', { ascending: false })
          const t = (items ?? []).reduce((n: number, i: { amount: number }) => n + Number(i.amount || 0), 0)
          acumulado += t
          wLines.push(`  · ${w.week_label} (${w.date_from ?? '?'} a ${w.date_to ?? '?'}): ${money(t)} — ` +
            (items ?? []).slice(0, 8).map((i: { concept: string; amount: number }) => `${i.concept} ${money(Number(i.amount))}`).join('; '))
        }
        lines.push(
          `OBRA: ${p.name}` +
          (p.client_name ? ` · cliente: ${p.client_name}` : '') +
          (p.location ? ` · ${p.location}` : '') +
          ` · estado: ${p.status}` +
          (p.budget_total ? ` · presupuesto total: ${money(Number(p.budget_total))}` : ' · sin presupuesto capturado') +
          ` · avance declarado: ${p.progress ?? 0}%` +
          `\n  Gastado en las semanas registradas: ${money(acumulado)}` +
          (p.budget_total ? ` (${((acumulado / Number(p.budget_total)) * 100).toFixed(1)}% del presupuesto)` : '') +
          `\n  Avances con fotos publicados: ${nUpd ?? 0}` +
          (wLines.length ? `\n  Semanas de costos:\n${wLines.join('\n')}` : '\n  Sin semanas de costos registradas') +
          ((notes ?? []).length ? `\n  Notas recientes:\n` + (notes ?? []).map((n: { note_date: string; title: string; body: string }) =>
            `  · ${n.note_date} ${n.title ?? ''}: ${String(n.body).slice(0, 200)}`).join('\n') : '')
        )
      }
      const hoy = new Date().toISOString().slice(0, 10)
      system += `\n\n=== DATOS REALES DEL SISTEMA (hoy es ${hoy}) ===\n` +
        (lines.length ? lines.join('\n\n') : 'Todavía no hay obras registradas.')
    }

    const client = new Anthropic({ apiKey: KEY })
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'medium' },
      system,
      messages: messages.slice(-14).map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 8000),
      })),
    })

    if (response.stop_reason === 'refusal') return json({ text: 'No puedo ayudarte con eso. Prueba con otra pregunta.' })
    const text = response.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text).join('\n').trim()
    return json({ text: text || 'No obtuve respuesta. Intenta de nuevo.' })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
