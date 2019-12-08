const HDWalletProvider = require('truffle-hdwallet-provider');

const fs = require('fs');
const infuraKey = '9defdc016d654060a6d372cbe5b2de0c';
const mnemonic = fs
  .readFileSync('.secret')
  .toString()
  .trim();

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1', // Localhost (default: none)
      port: 8545, // Standard Ethereum port (default: none)
      network_id: '*', // Any network (default: none)
    },

    ropsten: {
      provider: () => new HDWalletProvider(mnemonic, `https://ropsten.infura.io/v3/` + infuraKey),
      network_id: 3, // Ropsten's id
      gas: 5500000, // Ropsten has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
  },

  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: '0.5.13',
      docker: false,
      settings: {
        optimizer: {
          enabled: false,
          runs: 200,
        },
        evmVersion: 'byzantium',
      },
    },
  },
};
