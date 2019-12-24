/// <reference types="node" />
import { HastoIpfsUpload, HastoFile, HastoFileUpdate } from './types';
export declare class HastoSdk {
    private privateKey;
    private contractInstance;
    private wallet;
    private ipfs;
    private hastoGatewaySdk;
    constructor(ipfsProviderUrl: string, ethereumProviderUrl: string, hastoApiUrl: string, contractAddress: string, privateKey?: string);
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
    setIdentityEmail(email: string): Promise<void>;
    setIdentityPhoneNumber(phoneNumber: string): Promise<void>;
    confirmIdentity(confirmationCode: string): Promise<void>;
}
