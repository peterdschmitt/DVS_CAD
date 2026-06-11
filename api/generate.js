// Serverless proxy — supports OpenAI or Anthropic, whichever key is configured.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { prompt, system } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 2000)
    return res.status(400).json({ error: 'Invalid prompt' });

  try {
    let text;
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 2000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system || '' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await r.json();
      if (data.error) return res.status(502).json({ error: data.error.message });
      text = data.choices?.[0]?.message?.content || '';
    } else if (process.env.ANTHROPIC_API_KEY) {
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
      text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else {
      return res.status(500).json({ error: 'No API key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)' });
    }
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
