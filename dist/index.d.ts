/// <reference types="node" />
import { HastoIpfsUpload, HastoFile, HastoFileUpdate } from './types';
export declare class HastoSdk {
    private privateKey;
    private contractInstance;
    private wallet;
    private ipfs;
    constructor(ipfsProviderUrl: string, ethereumProviderUrl: string, contractAddress: string, privateKey?: string);
    uploadFile(bytesFile: Buffer): Promise<HastoIpfsUpload>;
    getFile(fileID: number, secretKey: string): Promise<HastoFile>;
    getFilesPublishedByMe(): Promise<number[]>;
    getFilesSharedWithMe(): Promise<number[]>;
    getFileEncryptionKeyHash(fileID: number): Promise<string>;
    updateFile(fileID: number, bytesFile: Buffer, encryptionKey: string, ignoreEncryptionKeysMismatch?: boolean): Promise<HastoFileUpdate>;
}
