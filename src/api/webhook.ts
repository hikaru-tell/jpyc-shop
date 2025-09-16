import crypto from 'node:crypto';

export async function sendWebhook(url: string, secret: string, body: object) {
  const payload = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': sig,
    },
    body: payload,
  });

  if (!res.ok) {
    console.error('Webhook failed', res.status, await res.text());
  }
  return res.ok;
}
