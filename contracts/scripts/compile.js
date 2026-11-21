const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, '../MonadRushTurbo.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'MonadRushTurbo.sol': {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log('Compiling MonadRushTurbo.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasErrors = false;
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
    if (err.severity === 'error') hasErrors = true;
  });
  if (hasErrors) {
    process.exit(1);
  }
}

const contract = output.contracts['MonadRushTurbo.sol']['MonadRushTurbo'];
const artifactsDir = path.resolve(__dirname, '../artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(artifactsDir, 'MonadRushTurbo.json'),
  JSON.stringify(
    {
      contractName: 'MonadRushTurbo',
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
    },
    null,
    2
  )
);

console.log('Compilation successful! Artifact saved to artifacts/MonadRushTurbo.json');
