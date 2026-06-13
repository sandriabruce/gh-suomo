// Netlify serverless function — no egress restrictions, can reach api.openai.com freely
const https = require('https');
const { Readable } = require('stream');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'No OPENAI_API_KEY set' }) };
  }

  try {
    const { audio_url } = JSON.parse(event.body);
    if (!audio_url) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing audio_url' }) };
    }

    console.log('[transcribe] fetching audio:', audio_url);

    // Fetch audio from public Supabase bucket
    const audioRes = await fetch(audio_url);
    if (!audioRes.ok) {
      throw new Error(`Audio fetch failed: ${audioRes.status}`);
    }
    const audioBuf = await audioRes.arrayBuffer();
    console.log('[transcribe] audio bytes:', audioBuf.byteLength);

    if (audioBuf.byteLength < 500) {
      throw new Error('Audio too small');
    }

    // Build multipart form for Whisper
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const filename = audio_url.endsWith('.m4a') ? 'audio.m4a' : 'audio.webm';
    const mimeType = filename.endsWith('.m4a') ? 'audio/mp4' : 'audio/webm';

    const audioBytes = Buffer.from(audioBuf);
    const header = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const modelPart = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n--${boundary}--`
    );

    const body = Buffer.concat([header, audioBytes, modelPart]);

    // Call OpenAI Whisper
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    console.log('[transcribe] Whisper status:', whisperRes.status);

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      console.error('[transcribe] Whisper error:', err);
      throw new Error(`Whisper ${whisperRes.status}: ${err.slice(0, 200)}`);
    }

    const data = await whisperRes.json();
    const transcript = data.text?.trim();
    console.log('[transcribe] transcript:', transcript?.slice(0, 100));

    if (!transcript) throw new Error('Empty transcript');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    };

  } catch (e) {
    console.error('[transcribe] ERROR:', e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
