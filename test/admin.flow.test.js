'use strict';

const expect = require('chai').expect;
const HastoSdk = require('../dist').HastoSdk;
const readLineSync = require('readline-sync');

const fs = require('fs');

const { utils } = require('ethers');

describe('Hasto - admin flow test', () => {
  const privateKeys = fs.readFileSync('.privateKeys', { encoding: 'utf8' }).split('\n');
  const adminPrivateKey = privateKeys[0];
  const contractAddress = fs.readFileSync('.contractAddress', { encoding: 'utf8' });

  const hastoSdk = new HastoSdk(
    'http://localhost:5001',
    'http://localhost:8545',
    'http://localhost:8088',
    contractAddress,
    adminPrivateKey,
    'admin',
  );

  it('should assign some transfer to', async () => {
    await hastoSdk.assignTransfer('0xc9934CF26541a0cAcf4581EEEbb237715b05ca71', 20);
  });
});
