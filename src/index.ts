import EthCrypto from 'eth-crypto';
import SimpleCrypto from 'simple-crypto-js';
import { SHA256, enc } from 'crypto-js';
import * as crypto from 'crypto';

import { Wallet, Contract, providers } from 'ethers';
import { AbiCoder, BigNumber, toUtf8Bytes, parseBytes32String, toUtf8String } from 'ethers/utils';

import ipfsHttpClient = require('ipfs-http-client');

import { HastoIpfsUpload, HastoFile, HastoFileUpdate } from './types';
import { bytes32ToIpfsHash, ipfsHashToBytes32 } from './utils/ipfsHashesUtils';

import { HastoStorage } from '../typechain-build/HastoStorage';

import HastoABI from './utils/hasto-abi.json';

export class HastoSdk {
  private privateKey: string;
  private contractInstance: HastoStorage;
  private wallet: Wallet;
  private ipfs: any;

  constructor(ipfsProviderUrl: string, ethereumProviderUrl: string, contractAddress: string, privateKey?: string) {
    this.privateKey = privateKey || EthCrypto.createIdentity().privateKey;
    this.wallet = new Wallet(this.privateKey, new providers.JsonRpcProvider(ethereumProviderUrl));
    this.contractInstance = new Contract(contractAddress, HastoABI, this.wallet) as HastoStorage;
    this.ipfs = ipfsHttpClient(ipfsProviderUrl, { protocol: 'http' });
  }

  async uploadFile(bytesFile: Buffer): Promise<HastoIpfsUpload> {
    const key = crypto.randomBytes(256).toString('hex');
    const simpleCrypto = new SimpleCrypto(key);
    const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
    const ipfsContent = await this.ipfs.add(cipheredBytes);
    const encryptionKeyHash = '0x' + SHA256(key).toString(enc.Hex);

    const ipfsHash = ipfsContent[0].hash;

    // Ethereum transaction

    const bts32IpfsHash = await ipfsHashToBytes32(ipfsHash);

    const tx = await this.contractInstance.publishFile(bts32IpfsHash, encryptionKeyHash);
    const txReceipt = await tx.wait();

    if (txReceipt.logs !== undefined) {
      const topics = txReceipt.logs[0].topics;
      const [ipfsLink, publisher, fileID] = topics;

      return {
        encryptionKey: key,
        ipfsHashMultiHashFormat: ipfsHash,
        ipfsHashBytes32Format: String(ipfsLink),
        fileID: parseInt(fileID, 16),
      };
    }

    throw new Error(`File upload failed tx hash: ${txReceipt.transactionHash}`);
  }

  async getFile(fileID: number, secretKey: string): Promise<HastoFile> {
    const simpleCrypto = new SimpleCrypto(secretKey);
    const ipfsHashBytes32Format: string = await this.contractInstance.getFileIpfsHash(fileID);
    const ipfsHash = await bytes32ToIpfsHash(ipfsHashBytes32Format);

    const ipfsDownload = await this.ipfs.cat(ipfsHash);
    const decipheredContent = simpleCrypto.decrypt(ipfsDownload.toString()).toString();

    return { ipfsHashMultiHashFormat: ipfsHash, ipfsHashBytes32Format, fileBytes: decipheredContent };
  }

  async getFilesPublishedByMe(): Promise<number[]> {
    const publishedFilesCount = await this.contractInstance.getPublishedFilesCount();

    let publishedFiles: number[] = [];

    for (let i = 0; i < publishedFilesCount.toNumber(); i++) {
      const globalFileID = await this.contractInstance.getPublishedFileId(i);
      publishedFiles.push(globalFileID.toNumber());
    }

    return publishedFiles;
  }

  async getFilesSharedWithMe(): Promise<number[]> {
    const sharedFilesCount = await this.contractInstance.getSharedFilesCount();

    let accessableFiles: number[] = [];

    for (let i = 0; i < sharedFilesCount.toNumber(); i++) {
      const globalFileID = await this.contractInstance.getSharedFileId(i);
      accessableFiles.push(globalFileID.toNumber());
    }

    return accessableFiles;
  }

  async getFileEncryptionKeyHash(fileID: number): Promise<string> {
    return await this.contractInstance.getFileSymmetricalEncryptionKeyHash(fileID);
  }

  async updateFile(
    fileID: number,
    bytesFile: Buffer,
    encryptionKey: string,
    ignoreEncryptionKeysMismatch?: boolean,
  ): Promise<HastoFileUpdate> {
    const fromEthereumFileEncryptionKeyHash = await this.getFileEncryptionKeyHash(fileID);
    const fileEncryptionKeyHash = '0x' + SHA256(encryptionKey).toString(enc.Hex);

    if (fromEthereumFileEncryptionKeyHash !== fileEncryptionKeyHash && !ignoreEncryptionKeysMismatch) {
      throw new Error(
        'File encryption keys mismatch, to force the key change please set the param ignoreEncryptionKeysMismatch as true',
      );
    }

    const simpleCrypto = new SimpleCrypto(encryptionKey);
    const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
    const ipfsContent = await this.ipfs.add(cipheredBytes);

    const ipfsHash = ipfsContent[0].hash;

    const bts32IpfsHash = await ipfsHashToBytes32(ipfsHash);

    const tx = await this.contractInstance.updateFile(fileID, bts32IpfsHash);
    const txReceipt = await tx.wait();

    if (txReceipt.logs !== undefined) {
      const abiDecoded = new AbiCoder().decode(['address', 'bytes32', 'uint256'], txReceipt.logs[0].data);
      const fileId = parseInt(txReceipt.logs[0].topics[1], 16);
      const [publishedBy, newHash, fileVersion]: [string, string, BigNumber] = abiDecoded;
      return { fileId, publishedBy, newHash, fileVersion: fileVersion.toNumber() };
    }

    throw new Error(`File update failed tx hash: ${txReceipt.transactionHash}`);
  }

  async getMyPublicKey(): Promise<string> {
    const publicKey = await this.contractInstance.getPublicKey(this.wallet.address);
    return publicKey.slice(2);
  }

  async setPublicKey(): Promise<boolean> {
    const publicKey = '0x' + EthCrypto.publicKeyByPrivateKey(this.privateKey);
    try {
      const tx = await this.contractInstance.setPublicKey(publicKey);
      await tx.wait();
      return true;
    } catch (err) {
      if (
        err.message === 'VM Exception while processing transaction: revert The public key has been already declared'
      ) {
        return false;
      }
      throw new Error(err.message);
    }
  }

  async shareFile(fileID: number, withAddress: string, encryptionKey: string) {
    let publicKey = await this.contractInstance.getPublicKey(withAddress);
    publicKey = publicKey.slice(2);

    const encryptedKey = await EthCrypto.encryptWithPublicKey(publicKey, encryptionKey);

    const _iv = toUtf8Bytes(encryptedKey.iv);
    const _ephemeralPublicKey = toUtf8Bytes(encryptedKey.ephemPublicKey);
    const _cipheredText = toUtf8Bytes(encryptedKey.ciphertext);
    const _mac = toUtf8Bytes(encryptedKey.mac);

    const tx = await this.contractInstance.shareFileEncryptionKey(
      fileID,
      withAddress,
      _iv,
      _ephemeralPublicKey,
      _cipheredText,
      _mac,
    );

    await tx.wait();
  }

  async getSharedFile(fileID: number): Promise<HastoFile> {
    // TODO handle invalid fileID error

    const [hexIv, hexEphemPublicKey, hexCiphertext, hexMac] = await Promise.all([
      this.contractInstance.getFileEncryptionIv(fileID),
      this.contractInstance.getFileEncryptionEphemeralPublicKey(fileID),
      this.contractInstance.getFileEncryptionCipheredText(fileID),
      this.contractInstance.getFileEncryptionMac(fileID),
    ]);

    const [iv, ephemPublicKey, ciphertext, mac] = [hexIv, hexEphemPublicKey, hexCiphertext, hexMac].map(e => {
      return toUtf8String(e);
    });

    const encryptionKey = await EthCrypto.decryptWithPrivateKey(this.privateKey, {
      iv,
      ciphertext,
      mac,
      ephemPublicKey,
    });

    return await this.getFile(fileID, encryptionKey);
  }
}
