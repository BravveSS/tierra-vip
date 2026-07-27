// ============================================================================
// TIERRA — Edge Function: ai-parse-costs
// Interpreta con Claude el texto pegado de un Excel de costos (por muy
// desordenado que venga) y devuelve JSON limpio: etiqueta de semana, fechas
// y partidas {concept, amount}. Requiere el secreto ANTHROPIC_API_KEY en
// Supabase → Edge Functions → Secrets. Sin la key responde
// {error:'ia_no_configurada'} sin romper nada (el panel usa el parser local).
// Solo invocable por un ADMIN autenticado.
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

const SCHEMA = {
  type: 'object',
  properties: {
    week_label: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Etiqueta de la semana, p.ej. "Semana 77". null si no aparece.',
    },
    date_from: {
      anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
      description: 'Fecha inicial del periodo en formato YYYY-MM-DD. null si no aparece.',
    },
    date_to: {
      anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
      description: 'Fecha final del periodo en formato YYYY-MM-DD. null si no aparece.',
    },
    items: {
      type: 'array',
      description: 'Cada gasto de la semana, en el orden del documento.',
      items: {
        type: 'object',
        properties: {
          concept: { type: 'string', description: 'Descripción del gasto tal como aparece' },
          amount: { type: 'number', description: 'Monto en pesos MXN, sin símbolos' },
        },
        required: ['concept', 'amount'],
        additionalProperties: false,
      },
    },
  },
  required: ['week_label', 'date_from', 'date_to', 'items'],
  additionalProperties: false,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Metodo no permitido' }, 405)
  try {
    const URL = Deno.env.get('SUPABASE_URL')!
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
    const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''

    const asUser = createClient(URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'No autenticado' }, 401)
    const { data: isAdmin } = await asUser.rpc('is_admin')
    if (!isAdmin) return json({ error: 'No autorizado' }, 403)

    const { text } = await req.json()
    if (!text || String(text).trim().length < 3) return json({ error: 'Falta el texto a interpretar' }, 400)
    if (!KEY) return json({ error: 'ia_no_configurada' })

    const client = new Anthropic({ apiKey: KEY })
    const today = new Date().toISOString().slice(0, 10)
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system:
        'Eres experto en leer reportes semanales de costos de obra (construcción, México). ' +
        'Recibes texto pegado desde Excel, a veces desordenado o con columnas rotas. ' +
        'Extrae cada partida de gasto con su monto en MXN. Reglas: omite filas de encabezado ' +
        '(como "Descripción", "Coste") y la fila de TOTAL (no es una partida). Conserva el texto ' +
        'del concepto tal como aparece, corrigiendo solo mayúsculas iniciales. Los montos llevan ' +
        'a veces "$" y comas: conviértelos a número. Si el documento menciona "SEMANA n", úsalo ' +
        'como week_label ("Semana n"). Si hay un rango de fechas (p.ej. "DEL 06 AL 12 DE JULIO"), ' +
        `conviértelo a YYYY-MM-DD; si no indica año, usa el año de hoy (hoy es ${today}). ` +
        'Si un dato no aparece, devuélvelo como null.',
      messages: [{ role: 'user', content: String(text).slice(0, 30000) }],
    })

    if (response.stop_reason === 'refusal') return json({ error: 'La IA no pudo procesar este texto' }, 422)
    const block = response.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined
    if (!block) return json({ error: 'Respuesta vacía de la IA' }, 502)
    const parsed = JSON.parse(block.text)
    return json(parsed)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
