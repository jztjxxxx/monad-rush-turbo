const { createWalletClient, createPublicClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const fs = require('fs');
const path = require('path');

const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
};

async function main() {
  const privateKey = process.env.PRIVATE_KEY || process.env.DEPLOYER_KEY;
  if (!privateKey) {
    console.error('Please specify PRIVATE_KEY in environment or .env');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('Deploying MonadRushTurbo with account:', account.address);

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Account balance:', (Number(balance) / 1e18).toFixed(4), 'MON');

  if (balance === 0n) {
    console.error('Account has 0 MON. Please fund this account at https://faucet.monad.xyz');
    process.exit(1);
  }

  const artifactPath = path.resolve(__dirname, '../artifacts/MonadRushTurbo.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  console.log('Deploying contract to Monad Testnet...');
  // Default initial price for BTC/USDT (in cents or 1e4: e.g. 96500_00 for $96,500.00)
  // INITIAL_PRICE is REQUIRED (BTC price in cents, e.g. 5800000 = $58,000).
  // No default on purpose: a stale hardcoded price silently poisons round 1.
  if (!process.env.INITIAL_PRICE) {
    throw new Error('INITIAL_PRICE env var is required (current BTC price in cents)');
  }
  const initialPrice = BigInt(process.env.INITIAL_PRICE);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: `0x${artifact.bytecode}`,
    args: [initialPrice],
  });

  console.log('Transaction hash:', hash);
  console.log('Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Contract deployed successfully at:', receipt.contractAddress);
  console.log('View on Monadscan:', `https://testnet.monadscan.com/address/${receipt.contractAddress}`);

  // Save deployment info
  const deployedInfo = {
    address: receipt.contractAddress,
    deployer: account.address,
    transactionHash: hash,
    network: 'Monad Testnet',
    chainId: 10143,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.resolve(__dirname, '../artifacts/deployed.json'),
    JSON.stringify(deployedInfo, null, 2)
  );

  // Copy ABI and deployed address to web/src/contracts
  const webContractsDir = path.resolve(__dirname, '../../web/src/contracts');
  if (!fs.existsSync(webContractsDir)) {
    fs.mkdirSync(webContractsDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(webContractsDir, 'MonadRushTurbo.json'),
    JSON.stringify({ ...deployedInfo, abi: artifact.abi }, null, 2)
  );
  console.log('Copied contract info to web/src/contracts/MonadRushTurbo.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
