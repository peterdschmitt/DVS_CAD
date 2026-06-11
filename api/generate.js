// Conversational proxy — supports OpenAI or Anthropic, whichever key is configured.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let { messages, prompt, system } = req.body || {};
  if (!messages && prompt) messages = [{ role: 'user', content: prompt }];
  if (!Array.isArray(messages) || !messages.length || messages.length > 24)
    return res.status(400).json({ error: 'Invalid messages' });
  for (const m of messages) {
    if (!['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 10000)
      return res.status(400).json({ error: 'Invalid message' });
  }

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
          max_tokens: 2500,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: system || '' }, ...messages],
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
          max_tokens: 2500,
          system: system || '',
          messages,
        }),
      });
      const data = await r.json();
      if (data.error) return res.status(502).json({ error: data.error.message });
      text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else {
      return res.status(500).json({ error: 'No API key configured' });
    }
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
