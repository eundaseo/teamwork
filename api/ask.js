// Vercel Serverless Function (Gemini 무료 키 버전): 브라우저 -> (여기) -> Google Gemini API
// 이 파일 내용을 GitHub 저장소의 api/ask.js 에 통째로 덮어쓰세요.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { ACCESS_CODE, GEMINI_API_KEY, GEMINI_MODEL, ENABLE_SEARCH } = process.env;
  if (!ACCESS_CODE || !GEMINI_API_KEY) {
    return res.status(500).json({ error: 'ACCESS_CODE, GEMINI_API_KEY 환경변수를 설정하세요.' });
  }
  if (req.headers['x-access-code'] !== ACCESS_CODE) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { prompt, search } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 30000) {
    return res.status(400).json({ error: 'invalid prompt' });
  }

  const useSearch = !!search && ENABLE_SEARCH === 'true';
  const text = useSearch
    ? prompt
    : prompt + (search ? '\n\n[참고] 지금은 웹 검색을 쓸 수 없다. 출처(매체명)를 절대 지어내지 말고, 학습된 지식 기반이라 최신 뉴스와 다를 수 있다고 첫 줄에 밝혀라.' : '');

  const body = {
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: { maxOutputTokens: 4000 },
  };
  if (useSearch) body.tools = [{ google_search: {} }];

  const model = GEMINI_MODEL || 'gemini-2.5-flash';
  let up;
  try {
    up = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
        body: JSON.stringify(body),
      }
    );
  } catch (e) {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
  if (!up.ok) {
    console.error('Gemini error', up.status, await up.text());
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
        const parts = (ev.candidates && ev.candidates[0] && ev.candidates[0].content && ev.candidates[0].content.parts) || [];
        for (const p of parts) if (p.text && !p.thought) res.write(p.text);
      }
    }
  } catch (e) {
    res.write('\n\n[오류] 연결이 끊겼어요. 다시 시도해 주세요.');
  }
  res.end();
};
