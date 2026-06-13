exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('[transcribe] No OPENAI_API_KEY');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'No OPENAI_API_KEY set' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { audio_url } = body;
    if (!audio_url) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing audio_url' }) };
    }

    console.log('[transcribe] fetching audio:', audio_url);

    const audioRes = await fetch(audio_url);
    if (!audioRes.ok) {
      throw new Error(`Audio fetch failed: ${audioRes.status}`);
    }
    const audioBuf = await audioRes.arrayBuffer();
    console.log('[transcribe] audio bytes:', audioBuf.byteLength);

    if (audioBuf.byteLength < 500) {
      throw new Error('Audio too small');
    }

    const filename = audio_url.includes('.m4a') ? 'audio.m4a' : 'audio.webm';
    const mimeType = filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/webm';
    const boundary = '----WaveFormBoundary' + Date.now().toString(36);

    const audioBytes = Buffer.from(audioBuf);
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const footer = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--${boundary}--`
    );

    const formBody = Buffer.concat([header, audioBytes, footer]);

    console.log('[transcribe] calling Whisper, form size:', formBody.byteLength);

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formBody,
    });

    console.log('[transcribe] Whisper status:', whisperRes.status);

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('[transcribe] Whisper error:', err.slice(0, 300));
      throw new Error(`Whisper ${whisperRes.status}: ${err.slice(0, 200)}`);
    }

    const data = await whisperRes.json();
    const transcript = data.text?.trim();
    console.log('[transcribe] transcript:', transcript?.slice(0, 100));

    if (!transcript) throw new Error('Empty transcript');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ transcript }),
    };

  } catch (e) {
    console.error('[transcribe] ERROR:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
