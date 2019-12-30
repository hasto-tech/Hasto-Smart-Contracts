/// <reference types="node" />
import { HastoIpfsUpload, HastoFile, HastoFileUpdate } from './types';
import { HastoGatewaySdk } from './hasto.gateway.sdk';
export declare class HastoSdk extends HastoGatewaySdk {
    private privateKey;
    private contractInstance;
    private wallet;
    private ipfs;
    constructor(ipfsProviderUrl: string, ethereumProviderUrl: string, hastoApiUrl: string, contractAddress: string, privateKey?: string, role?: 'admin' | 'user');
    uploadFile(bytesFile: Buffer): Promise<HastoIpfsUpload>;
    getFile(fileID: number, secretKey: string): Promise<HastoFile>;
    getFilesPublishedByMe(): Promise<number[]>;
    getFilesSharedWithMe(): Promise<number[]>;
    getFileEncryptionKeyHash(fileID: number): Promise<string>;
    updateFile(fileID: number, bytesFile: Buffer, encryptionKey: string, ignoreEncryptionKeysMismatch?: boolean): Promise<HastoFileUpdate>;
    getMyPublicKey(): Promise<string>;
    setPublicKey(): Promise<boolean>;
    shareFile(fileID: number, withAddress: string, encryptionKey: string): Promise<void>;
    getSharedFile(fileID: number): Promise<HastoFile>;
}
