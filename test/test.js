'use strict';

const expect = require('chai').expect;
const HastoSdk = require('../dist').HastoSdk;

const fs = require('fs');

const { utils } = require('ethers');

describe('HastoSdk class tests', () => {
  const privateKeys = fs.readFileSync('.privateKeys', { encoding: 'utf8' }).split('\n');
  const contractAddress = fs.readFileSync('.contractAddress', { encoding: 'utf8' });

  const hastoSdk = new HastoSdk(
    'http://localhost:5001',
    'http://localhost:8545',
    'http://localhost:8088',
    contractAddress,
    privateKeys[0],
  );
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

  it('should return the ids of all published files', async () => {
    const publishedFiles = await hastoSdk.getFilesPublishedByMe();
    expect(publishedFiles.length > 0).to.equal(true);
  });

  it('should return all the files ids that have been shared with me', async () => {
    const sharedFiles = await hastoSdk.getFilesSharedWithMe();
    expect(sharedFiles.length).to.equal(0);
  });

  const hastoSdkV2 = new HastoSdk(
    'http://localhost:5001',
    'http://localhost:8545',
    'http://localhost:8081',
    contractAddress,
    privateKeys[1],
  );

  it('should set a new public key', async () => {
    await hastoSdkV2.setPublicKey();
  });

  it('should get my public key', async () => {
    const publicKey = await hastoSdkV2.getMyPublicKey();
    expect(publicKey.length).to.equal(128);
  });

  it('should share a file', async () => {
    await hastoSdk.shareFile(fileID, hastoSdkV2.wallet.address, fileEncryptionKey);
    const sharedFiles = await hastoSdkV2.getFilesSharedWithMe();
    expect(sharedFiles.length > 0).to.equal(true);
  });

  it('should get a shared file', async () => {
    const updatedFile = fs.readFileSync('./package.json', { encoding: 'utf8' });
    const fileFromIpfs = await hastoSdkV2.getSharedFile(fileID);
    expect(fileFromIpfs.fileBytes).to.equal(updatedFile);
  });
});
