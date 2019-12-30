export declare class HastoGatewaySdk {
    private readonly hastoApiUrl;
    private readonly privKey;
    private authToken;
    private role;
    private publicKey;
    constructor(hastoApiUrl: string, privKey: string, role?: 'user' | 'admin');
    addToIpfs(data: string): Promise<{
        usedTransfer: number;
        ipfsHash: string;
    }>;
    setIdentityEmail(email: string): Promise<void>;
    setIdentityPhoneNumber(phoneNumber: string): Promise<void>;
    confirmIdentity(confirmationCode: string): Promise<void>;
    assignTransfer(whom: string, quantity: number): Promise<void>;
    removeTransfer(): Promise<void>;
    private setIdentity;
    private authorizeAsUser;
    private authorizeAsAdmin;
    private refreshAuthToken;
    private computeHashcash;
}
