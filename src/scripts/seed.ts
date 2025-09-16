import { prisma } from '../lib/db';

async function main() {
  const merchant = await prisma.merchant.create({
    data: {
      name: 'demo',
      apiKeyHash: 'test-key', // curlで使うAPIキー
      jpycAddress:
        process.env.JPYC_WALLET_ADDRESS ||
        '0xB3a2DCfA448bb21431C5f885f78Dc7441287dEd4', //ひかるのウォレットアドレス
    },
  });
  console.log('merchant created:', merchant);
}

main().finally(() => prisma.$disconnect());
