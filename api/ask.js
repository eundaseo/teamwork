// Vercel Serverless Function: 브라우저 -> (여기) -> Anthropic API
// API 키는 서버 환경변수에만 있고, 브라우저에는 절대 노출되지 않습니다.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { ACCESS_CODE, ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ENABLE_SEARCH } = process.env;
  if (!ACCESS_CODE || !ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ACCESS_CODE, ANTHROPIC_API_KEY 환경변수를 설정하세요.' });
  }
  if (req.headers['x-access-code'] !== ACCESS_CODE) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { prompt, search } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 30000) {
    return res.status(400).json({ error: 'invalid prompt' });
  }

  const body = {
    model: ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    max_tokens: 4000,
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  };
  if (search && ENABLE_SEARCH !== 'false') {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }];
  }

  let up;
  try {
    up = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
  if (!up.ok) {
    console.error('Anthropic error', up.status, await up.text());
    return res.status(502).json({ error: 'upstream ' + up.status });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');

  const dec = new TextDecoder();
  let buf = '';
  try {
    for await (const chunk of up.body) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        let ev;
        try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
          res.write(ev.delta.text);
        } else if (ev.type === 'error') {
          res.write('\n\n[오류] 응답 중 문제가 생겼어요. 다시 시도해 주세요.');
        }
      }
    }
  } catch (e) {
    res.write('\n\n[오류] 연결이 끊겼어요. 다시 시도해 주세요.');
  }
  res.end();
};
