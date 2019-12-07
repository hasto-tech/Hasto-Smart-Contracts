'use strict';

const expect = require('chai').expect;
const HastoSdk = require('../dist').HastoSdk;

const fs = require('fs');

const { utils } = require('ethers');

describe('HastoSdk class tests', () => {
  const privateKey = fs.readFileSync('.privateKey', { encoding: 'utf8' });
  const contractAddress = fs.readFileSync('.contractAddress', { encoding: 'utf8' });

  const hastoSdk = new HastoSdk('localhost', 'http://localhost:7545', contractAddress, privateKey);
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
});
