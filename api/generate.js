// Serverless proxy: keeps the Anthropic API key server-side.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY)
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { prompt, system } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 2000)
    return res.status(400).json({ error: 'Invalid prompt' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        system: system || '',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message });
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
