import axios from 'axios';

import * as jwt from 'jsonwebtoken';
import { SHA256, enc } from 'crypto-js';

import EthCrypto from 'eth-crypto';

export class HastoGatewaySdk {
  private authToken: string | undefined;
  constructor(
    private readonly hastoApiUrl: string,
    private readonly privateKey: string,
    private readonly walletAddress: string,
  ) {}

  async setHastoApiAuthToken() {
    const baseAuthUrl = `${this.hastoApiUrl}/api/v1/auth`;
    const requestAuthChallengeUrl = `${baseAuthUrl}/request-challenge/${this.walletAddress}`;
    const hashcash = await this.computeHashcash(4, 2);
    const challengeResponse = await axios.get(requestAuthChallengeUrl, { headers: { hashcash } });

    const randomness: string = challengeResponse.data.randomness;
    const signature = EthCrypto.sign(this.privateKey, randomness);

    const faceAuthChallangeUrl = `${baseAuthUrl}/face-challenge`;
    const challangeFaceResponse = await axios.post(
      faceAuthChallangeUrl,
      { ethereumAddress: this.walletAddress },
      {
        headers: {
          signature,
        },
      },
    );

    this.authToken = challangeFaceResponse.data.authToken;
  }

  async addToIpfs(data: string): Promise<{ usedTransfer: number; ipfsHash: string }> {
    await this.refreshAuthToken();
    const hastoIpfsUploadUrl = `${this.hastoApiUrl}/api/v1/ipfs/add`;

    let response;
    try {
      response = await axios.post(hastoIpfsUploadUrl, { rawData: data }, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }

    const hastoIpfsResponse = response;
    const ipfsHash: string = hastoIpfsResponse.data.ipfsHash;
    const usedTransfer: number = hastoIpfsResponse.data.usedTransfer;
    return { ipfsHash, usedTransfer };
  }

  async setIdentityEmail(email: string) {
    try {
      await this.setIdentity({ email });
    } catch (err) {
      throw err;
    }
  }

  async setIdentityPhoneNumber(phoneNumber: string) {
    try {
      await this.setIdentity({ phoneNumber });
    } catch (err) {
      throw err;
    }
  }

  async confirmIdentity(confirmationCode: string) {
    const confirmIdentityUrl = `${this.hastoApiUrl}/api/v1/identity/confirm`;
    try {
      await axios.post(confirmIdentityUrl, { dto: { confirmationCode } }, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }
  }

  private async setIdentity(args: { email?: string; phoneNumber?: string }) {
    if (!args.email && !args.phoneNumber) {
      throw new Error('Invalid arguments at least one needs to be not null');
    }

    if (args.email && args.phoneNumber) {
      throw new Error('Invalid arguments these properties need to set separately');
    }

    let dto: { email?: string; phoneNumber?: string } = {};
    const setIdentityUrl = `${this.hastoApiUrl}/api/v1/identity/set`;

    if (args.email) {
      dto.email = args.email;
    } else if (args.phoneNumber) {
      dto.phoneNumber = args.phoneNumber;
    }

    try {
      await axios.post(setIdentityUrl, { dto }, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }
  }

  private async refreshAuthToken() {
    if (!this.authToken) {
      await this.setHastoApiAuthToken();
    }

    const rawToken = jwt.decode(this.authToken!) as { [key: string]: any };
    const expires = rawToken!.exp;
    if (Date.now() / 1000 >= expires) {
      try {
        await this.setHastoApiAuthToken();
      } catch (err) {
        throw err;
      }
    }
    return;
  }

  private computeHashcash(difficulty: number, durationDecimals: number): number {
    const now = Date.now() / 1000;
    const roundedCurrentTimestamp = Math.floor(now / Math.pow(10, durationDecimals)) * Math.pow(10, durationDecimals);

    let hashCashSolved = false;
    let solution = 0;
    while (!hashCashSolved) {
      const hash = SHA256(`${roundedCurrentTimestamp}:${solution}`).toString(enc.Hex);
      let tmp = '';
      for (let i = 0; i < difficulty; i++) {
        tmp += '0';
      }
      hashCashSolved = hash.slice(0, difficulty) == tmp;
      if (hashCashSolved) {
        break;
      }
      solution++;
    }
    return solution;
  }
}
