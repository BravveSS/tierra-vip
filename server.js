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

const SYSTEM = `You are a luxury real estate assistant for Tierra Desarrollos, a premium eco-development company on the Oaxacan Pacific coast of Mexico.

You assist potential buyers and investors with:
- Information about projects: Azimut Mazunte, Nabani, and Aldea Tao (all on the Oaxaca coast)
- Lot sizes, amenities, and lifestyle at each development
- Investment and ROI questions (guide them to contact the team for exact pricing)
- Location and lifestyle information about Mazunte and the Oaxacan coast
- Legal and purchase process questions
- Booking visits or requesting more information

PROJECTS:
AZIMUT MAZUNTE: Hillside lots with panoramic Pacific views. Surrounded by native jungle. Community areas include yoga shala, temazcal, natural pool, bike parking. Close to Mazunte beach.

NABANI (Costa Oaxaqueña): Luxury tropical villa residences. Private pools, thatched-roof architecture, hammock terraces, tropical gardens. Author-designed for full nature immersion.

ALDEA TAO (Costa de Oaxaca): Clifftop lots above the Pacific. Access to private beaches (Playa Tololote, La Boquilla). Dramatic ocean views, volcanic rock cliffs, raw untouched nature.

Contact: +52 958 108 7977 | ventas@tierra.vip | wa.me/529581087977

RULES:
- Never give specific prices — always invite them to contact the team
- Tone: warm, sophisticated, knowledgeable — like a trusted friend who knows the best land in Mexico
- Answer in the same language the user writes (Spanish or English)
- Keep responses concise — maximum 3 sentences unless more detail is explicitly requested
- If user shows purchase intent, suggest WhatsApp: wa.me/529581087977`;

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
