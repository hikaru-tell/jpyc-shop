import 'dotenv/config';
import { createPublicClient, http, parseAbi, getAddress } from 'viem';
import { polygon } from 'viem/chains';

const ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

async function main() {
  const client = createPublicClient({
    chain: polygon,
    transport: http(process.env.RPC_URL!),
  });
  const addr = getAddress(process.env.JPYC_TOKEN_ADDRESS as `0x${string}`);
  const [sym, dec] = await Promise.all([
    client.readContract({ address: addr, abi: ABI, functionName: 'symbol' }),
    client.readContract({ address: addr, abi: ABI, functionName: 'decimals' }),
  ]);
  console.log('Token:', sym, 'decimals:', dec);
}
main().catch(console.error);
