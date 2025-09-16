import { Hono } from 'hono';
import type { Merchant } from '@prisma/client';
import { prisma } from '../lib/db';

// Hono のコンテキストに merchant を型付きで保持
type Vars = { merchant: Merchant };
export const payments = new Hono<{ Variables: Vars }>();

// 超簡易 API キー認証（x-api-key と Merchant.apiKeyHash の一致）
payments.use('*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') ?? '';
  const merchant = await prisma.merchant.findFirst({
    where: { apiKeyHash: apiKey },
  });
  if (!merchant) return c.json({ error: 'unauthorized' }, 401);
  c.set('merchant', merchant);
  await next();
});

// POST /payments  { orderId, amountJpy }
payments.post('/', async (c) => {
  const merchant = c.get('merchant'); // 型: Merchant

  // 入力型を静的付与（実行時のバリデはMVPなので最小）
  const body = await c.req.json<{ orderId: string; amountJpy: number }>();
  const orderId = String(body.orderId);
  const amountJpy = Number(body.amountJpy);
  if (!orderId || !Number.isFinite(amountJpy) || amountJpy <= 0) {
    return c.json({ error: 'invalid payload' }, 400);
  }

  // MVP: 1:1換算（JPYCは0桁で扱う想定）
  const amountJpyc = String(Math.trunc(amountJpy));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const p = await prisma.payment.create({
    data: {
      merchantId: merchant.id,
      orderId,
      amountJpy,
      amountJpyc, // Prisma Decimal は string でOK
      status: 'pending',
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });

  return c.json({
    paymentId: p.id,
    toAddress: merchant.jpycAddress,
    amountJpyc,
    token: 'JPYC',
    expiresAt: p.expiresAt,
  });
});

// GET /payments/:id
payments.get('/:id', async (c) => {
  const merchant = c.get('merchant'); // 型: Merchant
  const id = c.req.param('id');

  const p = await prisma.payment.findUnique({
    where: { id },
    select: { merchantId: true, status: true, txHash: true },
  });
  if (!p || p.merchantId !== merchant.id) {
    return c.json({ error: 'not found' }, 404);
  }
  return c.json({ status: p.status, txHash: p.txHash });
});
