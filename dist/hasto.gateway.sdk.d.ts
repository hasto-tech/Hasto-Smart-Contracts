export declare class HastoGatewaySdk {
    private readonly hastoApiUrl;
    private readonly privateKey;
    private readonly walletAddress;
    private authToken;
    constructor(hastoApiUrl: string, privateKey: string, walletAddress: string);
    setHastoApiAuthToken(): Promise<void>;
    addToIpfs(data: string): Promise<{
        usedTransfer: number;
        ipfsHash: string;
    }>;
    setIdentityEmail(email: string): Promise<void>;
    setIdentityPhoneNumber(phoneNumber: string): Promise<void>;
    confirmIdentity(confirmationCode: string): Promise<void>;
    private setIdentity;
    private refreshAuthToken;
    private computeHashcash;
}
