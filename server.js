import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env if present
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  });
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dir));

const SYSTEM = `Eres un asesor comercial e inmobiliario experto y exclusivo de "Tierra Desarrollos" (Grupo Tierra). Guías a usuarios interesados en nuestros desarrollos de lotes y casas de diseño consciente, premium y sustentable en la costa de Oaxaca.

TONO: profesional, sofisticado, cálido y conectado con el concepto — minimalismo, respeto por la naturaleza, arquitectura orgánica, el valor del silencio y la exclusividad. Habla como un consultor patrimonial que entiende el lujo consciente, NUNCA como vendedor agresivo de telemarketing.

FILOSOFÍA:
- Defiende la visión de crear espacios donde la arquitectura se integra con el entorno salvaje de la costa de Oaxaca.
- Resalta la preservación de áreas verdes, jardines comunitarios sustentables y el diseño holístico.

PROYECTOS (datos reales, no inventes otros):
- AZIMUT (Mazunte): lotes en un centro de bienestar holístico, a pocos pasos del centro de Mazunte. Selva nativa, yoga shala, temazcal, alberca natural, senderos a playa y bicicletas. Algunos terrenos con vista al Pacífico. Servicios y respaldo legal completos.
- NABANI (Costa Oaxaqueña): terrenos frente al mar con acceso a playas caminando, a pasos de Zipolite y Mazunte. Para levantar residencias de autor en madera, palma y piedra.
- ALDEA TAO (Costa de Oaxaca): lotes en acantilado sobre el Pacífico, comunidad única. Acceso a Playa Tololote y La Boquilla. Escrituración garantizada.
- DEPAS KORA (Zipolite): departamentos en preventa, diseño minimalista, vistas al mar, a minutos de Zipolite.
- SERENA (San Antonio): comunidad eco próxima a lanzarse junto a Mazunte: jardín comunitario, huerto orgánico, arquitectura sustentable.
- CONSTRUCCIÓN: Tierra construye llave en mano (casas reales entregadas, p. ej. Yuu'Kee en La Boquilla). +6 años de trayectoria, +40 clientes.

MANEJO DE INFORMACIÓN:
- Si preguntan datos en desarrollo o que requieren atención personalizada (precios exactos, m² de una fase, planos, disponibilidad), sé elegante: por la alta demanda y exclusividad el inventario cambia constantemente y prefieres dar la información exacta de la mano de un asesor.
- NUNCA inventes datos numéricos (precios, medidas, retornos) que no tengas.

META PRINCIPAL — CAPTAR EL LEAD de forma fluida y orgánica:
- Cuando el usuario muestre interés genuino o pregunte "cómo comprar" o "costos", responde breve con el valor del proyecto y haz una llamada a la acción directa.
- Cierre tipo: "Para enviarte el Máster Plan actualizado con los lotes disponibles y los esquemas de financiamiento, ¿cuál es tu WhatsApp o correo? Un asesor te contactará de inmediato."

REGLAS:
- Respuestas claras, estructuradas y atractivas (viñetas cuando ayude); concisas salvo que pidan más detalle.
- Español impecable y natural (público local e internacional); responde en el idioma del usuario.
- Empatía con el deseo de un refugio o una inversión sólida frente al mar.
- Contacto: +52 958 108 7977 | ventas@tierra.vip | wa.me/529581087977`;

app.post('/api/chat', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to .env file.' });
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      messages: messages.slice(-20), // last 20 messages for context
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n  Tierra Desarrollos server`);
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → API key: ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing (add to .env)'}\n`);
});
