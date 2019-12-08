module.exports = {
  npmPath: '.',
  compiler: process.env.WAFFLE_COMPILER,
  solcVersion: '0.5.13+commit.5b0b510c',
  legacyOutput: true,
  outputType: 'all',
  compilerOptions: {
    evmVersion: 'constantinople',
    outputSelection: {
      '*': {
        '*': [
          'evm.bytecode.object',
          'evm.deployedBytecode.object',
          'abi',
          'evm.bytecode.sourceMap',
          'evm.deployedBytecode.sourceMap',
        ],
        '': ['ast'],
      },
    },
  },
};
