import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';

async function main() {
  const client = createPublicClient({
    chain: polygon,
    transport: http(process.env.RPC_URL!), // .env の RPC_URL を使う
  });

  const block = await client.getBlockNumber();
  console.log('RPC OK. latest block =', block.toString());
}

main().catch(console.error);
