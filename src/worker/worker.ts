import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Hex,
  type Log,
} from 'viem';
import { polygon } from 'viem/chains';
import { sendWebhook } from '../api/webhook';

// .env 必須:
// RPC_URL="..."
// JPYC_TOKEN_ADDRESS="0x..." // Polygon上のJPYCコントラクト
// CONFIRMATIONS=6
const client = createPublicClient({
  chain: polygon,
  transport: http(process.env.RPC_URL!),
});

const JPYC = process.env.JPYC_TOKEN_ADDRESS as `0x${string}`;
const CONFIRM = Number(process.env.CONFIRMATIONS ?? 6);

// ERC20: Transfer(address indexed from, address indexed to, uint256 value)
const TRANSFER = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

// viemのログに合わせた型（any禁止）
type TransferLog = Log & {
  address: `0x${string}`;
  transactionHash: Hex;
  blockNumber: bigint;
  args: {
    from: `0x${string}`;
    to: `0x${string}`;
    value: bigint;
  };
};

// pendingの支払いで候補を1件取得
async function findCandidate(to: `0x${string}`, value: bigint) {
  const v = value.toString(); // Prisma Decimal は string
  return prisma.payment.findFirst({
    where: {
      status: 'pending',
      amountJpyc: v,
      merchant: { jpycAddress: to },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function handleLog(log: TransferLog) {
  const to = log.args.to;
  const value = log.args.value;

  const p = await findCandidate(to, value);
  if (!p) return;

  // 確定ブロック待ち
  const target = log.blockNumber + BigInt(CONFIRM);
  while ((await client.getBlockNumber()) < target) {
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 冪等チェック
  const curr = await prisma.payment.findUnique({
    where: { id: p.id },
    select: { status: true, txHash: true },
  });
  if (curr?.status === 'paid') return;

  // 更新
  const updated = await prisma.payment.update({
    where: { id: p.id },
    data: { status: 'paid', txHash: log.transactionHash },
  });

  // Webhook（あれば送信）
  const merchant = await prisma.merchant.findUnique({
    where: { id: updated.merchantId },
    select: { webhookUrl: true },
  });
  if (merchant?.webhookUrl) {
    await sendWebhook(merchant.webhookUrl, process.env.WEBHOOK_SECRET!, {
      paymentId: updated.id,
      orderId: updated.orderId,
      status: 'paid',
      txHash: updated.txHash,
      amountJpyc: updated.amountJpyc,
    });
  }

  console.log('paid:', updated.id, updated.txHash);
}

async function main() {
  console.log('Worker start. Watching JPYC Transfer on Polygon...');

  // 直近ブロックから監視（← getBlockNumber() は bigint を返す）
  const fromBlock = await client.getBlockNumber();

  client.watchEvent({
    address: JPYC,
    event: TRANSFER,
    fromBlock, // ← そのままbigintを渡す（BlockTagにキャストしない）
    onLogs: (logs) => {
      for (const log of logs) handleLog(log as TransferLog);
    },
    onError: (e) => console.error('watchEvent error', e),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
