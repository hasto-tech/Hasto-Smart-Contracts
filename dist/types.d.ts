export interface HastoIpfsUpload {
    readonly ipfsHashMultiHashFormat: string;
    readonly ipfsHashBytes32Format: string;
    readonly encryptionKey: string;
    readonly fileID: number;
}
export interface HastoFile {
    readonly ipfsHashMultiHashFormat: string;
    readonly ipfsHashBytes32Format: string;
    readonly fileBytes: string;
}
export interface HastoFileUpdate {
    readonly fileId: number;
    readonly publishedBy: string;
    readonly newHash: string;
    readonly fileVersion: number;
}
