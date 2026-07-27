// ============================================================================
// TIERRA — Edge Function: ai-parse-costs (v2)
// Lee con Claude el contenido de un Excel de costos de obra y devuelve JSON.
//   { text }              → una sola semana  { week_label, date_from, date_to, items }
//   { text, multi: true } → histórico completo { weeks: [ {..., items} ] }
// Requiere el secreto ANTHROPIC_API_KEY. Sin él responde {error:'ia_no_configurada'}.
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

const ITEMS = {
  type: 'array',
  description: 'Cada gasto de la semana, en el orden del documento.',
  items: {
    type: 'object',
    properties: {
      concept: { type: 'string', description: 'Descripcion del gasto tal como aparece' },
      amount: { type: 'number', description: 'Monto en pesos MXN, sin simbolos' },
    },
    required: ['concept', 'amount'],
    additionalProperties: false,
  },
}
const WEEK_FIELDS = {
  week_label: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Etiqueta de la semana, p.ej. "Semana 77". null si no aparece.' },
  date_from: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Fecha inicial del periodo, formato YYYY-MM-DD. null si no aparece.' },
  date_to: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'Fecha final del periodo, formato YYYY-MM-DD. null si no aparece.' },
}
const SCHEMA_ONE = {
  type: 'object',
  properties: { ...WEEK_FIELDS, items: ITEMS },
  required: ['week_label', 'date_from', 'date_to', 'items'],
  additionalProperties: false,
}
const SCHEMA_MANY = {
  type: 'object',
  properties: {
    weeks: {
      type: 'array',
      description: 'Todas las semanas encontradas, de la mas antigua a la mas reciente.',
      items: {
        type: 'object',
        properties: { ...WEEK_FIELDS, items: ITEMS },
        required: ['week_label', 'date_from', 'date_to', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['weeks'],
  additionalProperties: false,
}

const REGLAS =
  'Reglas: omite filas de encabezado (como "Descripcion", "Coste") y las filas de TOTAL o SUMA ' +
  '(no son partidas de gasto). Conserva el texto del concepto tal como aparece, corrigiendo solo ' +
  'mayusculas iniciales y acentos obvios. Los montos llevan a veces "$" y comas: conviertelos a numero. ' +
  'Si el documento menciona "SEMANA n", usalo como week_label ("Semana n"). Si hay un rango de fechas ' +
  '(p.ej. "DEL 06 AL 12 DE JULIO"), conviertelo a YYYY-MM-DD. Si un dato no aparece, devuelvelo como null.'

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

    const { text, multi } = await req.json()
    if (!text || String(text).trim().length < 3) return json({ error: 'Falta el texto a interpretar' }, 400)
    if (!KEY) return json({ error: 'ia_no_configurada' })

    const today = new Date().toISOString().slice(0, 10)
    const base =
      'Eres experto en leer reportes semanales de costos de obra (construccion, Mexico). ' +
      'Recibes el contenido de un Excel, a veces desordenado o con columnas rotas. '
    const system = multi
      ? base +
        'El archivo contiene VARIAS SEMANAS: pueden venir como hojas separadas (marcadas abajo con ' +
        '"### HOJA: nombre"), como bloques uno debajo de otro separados por un encabezado de semana, ' +
        'o como columnas contiguas. Separa correctamente cada semana y asigna cada gasto a la semana ' +
        'a la que pertenece: NUNCA mezcles partidas de semanas distintas ni repitas una partida en dos ' +
        'semanas. Si una hoja no contiene gastos (portada, indice, resumen general, graficas), omitela ' +
        'por completo. Si el nombre de la hoja indica la semana, usalo para week_label. ' +
        `Devuelve TODAS las semanas encontradas. ${REGLAS} Si no indica anio, usa el anio de hoy (hoy es ${today}).`
      : base +
        `Extrae cada partida de gasto con su monto en MXN. ${REGLAS} ` +
        `Si no indica anio, usa el anio de hoy (hoy es ${today}).`

    const client = new Anthropic({ apiKey: KEY })
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: multi ? 64000 : 16000,
      output_config: {
        effort: multi ? 'medium' : 'low',
        format: { type: 'json_schema', schema: multi ? SCHEMA_MANY : SCHEMA_ONE },
      },
      system,
      messages: [{ role: 'user', content: String(text).slice(0, multi ? 400000 : 30000) }],
    })

    if (response.stop_reason === 'refusal') return json({ error: 'La IA no pudo procesar este archivo' }, 422)
    if (response.stop_reason === 'max_tokens') return json({ error: 'El archivo es demasiado grande. Divide el Excel en dos y subelos por separado.' }, 413)
    const block = response.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined
    if (!block) return json({ error: 'Respuesta vacia de la IA' }, 502)
    return json(JSON.parse(block.text))
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
