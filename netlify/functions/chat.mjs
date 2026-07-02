/* ============================================================================
   TIERRA — Asesor de ventas con IA real (Netlify Function)
   POST /.netlify/functions/chat  { messages: [{role:'user'|'assistant', content:'...'}] }
   Responde { reply: '...' }.

   Requiere la variable de entorno ANTHROPIC_API_KEY (Netlify → Site settings →
   Environment variables). Modelo: Claude Haiku 4.5 (económico: centavos por
   conversación). Para más calidad, cambiar MODEL a 'claude-sonnet-5'.
   ========================================================================== */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5';

const SYSTEM = `Eres el asesor de ventas de Tierra Desarrollos, inmobiliaria eco-luxury de la Costa de Oaxaca, México. Tu objetivo es ayudar al visitante y llevarlo a dejar sus datos o escribir por WhatsApp.

PROYECTOS:
- Azimut (Mazunte): lotes residenciales dentro de un centro de bienestar holístico — yoga shala, temazcal, alberca natural. Algunos con vista al mar. Disponible.
- Nabani (Puerto Ángel): terrenos frente al mar, playas caminando (Estacahuite, Aguete), beach club con alberca. Disponible.
- Aldea Tao (La Boquilla): lotes en acantilado sobre el Pacífico, calas privadas (Tololote, La Boquilla). Disponibilidad limitada.
- Serena (Mazunte): vida en comunidad, jardín comunitario, huerto orgánico. Próximamente — lista de espera.
- Depas Kora (Puerto Ángel): departamentos de diseño minimalista. Preventa.

DATOS CLAVE:
- Todos con acompañamiento legal completo y título de posesión en regla.
- Financiamiento: esquemas de enganche y mensualidades flexibles (condiciones exactas las da un asesor humano).
- Construcción llave en mano (obra real: Casa Yuu'Kee en La Boquilla).
- +40 clientes felices, 6+ años de trayectoria.
- Contacto: WhatsApp +52 958 108 7977 · ventas@tierra.vip · Mazunte, Oaxaca.

REGLAS:
- Responde en el idioma del usuario (español o inglés).
- Sé cálido, breve (2-4 frases) y concreto. Nada de párrafos largos.
- NUNCA inventes precios ni disponibilidad exacta: di que un asesor humano los confirma y ofrece el WhatsApp.
- Si muestran interés real, invítalos a dejar nombre y WhatsApp o escribir al +52 958 108 7977.
- Solo hablas de Tierra Desarrollos y la Costa de Oaxaca. Si preguntan otra cosa, redirige con amabilidad.`;

const ALLOWED_ORIGINS = [
  'https://tierra.vip',
  'https://www.tierra.vip',
  'https://bravvess.github.io',
];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin || '');
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default async (req) => {
  const headers = cors(req.headers.get('origin'));

  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad json' }), { status: 400, headers });
  }

  // Validar y acotar el historial (máx 12 turnos, 1000 chars por mensaje)
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  if (!history.length || history[history.length - 1].role !== 'user') {
    return new Response(JSON.stringify({ error: 'no message' }), { status: 400, headers });
  }

  try {
    const client = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: history,
    });
    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return new Response(JSON.stringify({ reply }), { status: 200, headers });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    return new Response(JSON.stringify({ error: 'ai', status }), { status: 502, headers });
  }
};
