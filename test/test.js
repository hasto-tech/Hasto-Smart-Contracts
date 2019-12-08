'use strict';

const expect = require('chai').expect;
const HastoSdk = require('../dist').HastoSdk;

const fs = require('fs');

const { utils } = require('ethers');

describe('HastoSdk class tests', () => {
  const privateKeys = fs.readFileSync('.privateKey', { encoding: 'utf8' }).split('\n');
  const contractAddress = fs.readFileSync('.contractAddress', { encoding: 'utf8' });

  const hastoSdk = new HastoSdk('http://localhost:5001', 'http://localhost:8545', contractAddress, privateKeys[0]);
  const plainFile = fs.readFileSync('./yarn.lock', { encoding: 'utf8' });

  let fileID;
  let fileEncryptionKey;
  it('should publish a file', async () => {
    const ipfsUpload = await hastoSdk.uploadFile(Buffer.from(plainFile));
    fileID = ipfsUpload.fileID;
    fileEncryptionKey = ipfsUpload.encryptionKey;
    expect(utils.isHexString(ipfsUpload.ipfsHashBytes32Format)).to.equal(true);
  });

  it('should get the file', async () => {
    const fileFromIpfs = await hastoSdk.getFile(fileID, fileEncryptionKey);
    expect(fileFromIpfs.fileBytes).to.equal(plainFile);
  });

  it('should update a file', async () => {
    const plainFile = fs.readFileSync('./package.json', { encoding: 'utf8' });
    const update = await hastoSdk.updateFile(fileID, Buffer.from(plainFile), fileEncryptionKey);
    expect(update.fileId).to.equal(fileID);
  });

  it('should get an updated file', async () => {
    const fileFromIpfs = await hastoSdk.getFile(fileID, fileEncryptionKey);
    const packageJson = fs.readFileSync('./package.json', { encoding: 'utf8' });
    expect(fileFromIpfs.fileBytes).to.equal(packageJson);
  });
});