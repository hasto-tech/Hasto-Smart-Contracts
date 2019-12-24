export declare class HastoGatewaySdk {
    private readonly hastoApiUrl;
    private readonly privateKey;
    private readonly walletAddress;
    private authToken;
    constructor(hastoApiUrl: string, privateKey: string, walletAddress: string);
    private computeHashcash;
    setHastoApiAuthToken(): Promise<void>;
    addToIpfs(data: string): Promise<{
        usedTransfer: number;
        ipfsHash: string;
    }>;
    private refreshAuthToken;
}
