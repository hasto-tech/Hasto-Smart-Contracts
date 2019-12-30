import axios from 'axios';

import * as jwt from 'jsonwebtoken';
import { SHA256, enc } from 'crypto-js';

import EthCrypto, { hash } from 'eth-crypto';
import { ethers, utils } from 'ethers';

export class HastoGatewaySdk {
  private authToken: string | undefined;
  private role: 'admin' | 'user';
  private publicKey: string;
  constructor(private readonly hastoApiUrl: string, private readonly privKey: string, role?: 'user' | 'admin') {
    if (!role) {
      this.role = 'user';
    } else {
      this.role = role;
    }

    this.publicKey = ethers.utils.computePublicKey(privKey).substring(2);
  }

  public async addToIpfs(data: string): Promise<{ usedTransfer: number; ipfsHash: string }> {
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

  public async setIdentityEmail(email: string) {
    try {
      await this.setIdentity({ email });
    } catch (err) {
      throw err;
    }
  }

  public async setIdentityPhoneNumber(phoneNumber: string) {
    try {
      await this.setIdentity({ phoneNumber });
    } catch (err) {
      throw err;
    }
  }

  public async confirmIdentity(confirmationCode: string) {
    await this.refreshAuthToken();
    const confirmIdentityUrl = `${this.hastoApiUrl}/api/v1/identity/confirm`;
    try {
      await axios.post(confirmIdentityUrl, { confirmationCode }, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }
  }

  public async assignTransfer(whom: string, quantity: number) {
    if (this.role !== 'admin') {
      throw new Error('In order to call admin restricted methods please set sdk mode as admin role');
    }

    await this.refreshAuthToken();

    const url = `${this.hastoApiUrl}/api/v1/transfers/assign-transfer`;
    const body = { whom, quantity };
    try {
      await axios.post(url, body, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }
  }

  // TODO
  public async removeTransfer() {}

  private async setIdentity(args: { email?: string; phoneNumber?: string }) {
    await this.refreshAuthToken();

    const hashcash = await this.computeHashcash(4, 2);
    const isIdentitySetUrl = `${this.hastoApiUrl}/api/v1/identity/identity-exists/${utils.computeAddress(
      this.privKey,
    )}`;
    const isIdentitySetResponse = await axios.get(isIdentitySetUrl, { headers: { hashcash } });

    if (isIdentitySetResponse.data.exists) {
      return;
    }

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
      await axios.post(setIdentityUrl, dto, { headers: { authtoken: this.authToken } });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }
  }

  private async authorizeAsUser() {
    const baseAuthUrl = `${this.hastoApiUrl}/api/v1/auth`;
    const requestAuthChallengeUrl = `${baseAuthUrl}/request-challenge/user`;
    const hashcash = await this.computeHashcash(4, 2);
    let challengeResponse;
    try {
      challengeResponse = await axios.get(requestAuthChallengeUrl, {
        headers: { hashcash, publickey: this.publicKey },
      });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }

    const randomness: string = challengeResponse.data.randomness;
    const signature = EthCrypto.sign(this.privKey, randomness);

    const faceAuthChallangeUrl = `${baseAuthUrl}/face-challenge/user`;

    let challangeFaceResponse;
    try {
      challangeFaceResponse = await axios.post(
        faceAuthChallangeUrl,
        { publicKey: this.publicKey },
        {
          headers: {
            signature,
          },
        },
      );
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }

    this.authToken = challangeFaceResponse.data.authToken;
  }

  private async authorizeAsAdmin() {
    const baseAuthUrl = `${this.hastoApiUrl}/api/v1/auth`;
    const requestAuthChallengeUrl = `${baseAuthUrl}/request-challenge/admin`;
    const hashcash = await this.computeHashcash(4, 2);
    let challengeResponse;
    try {
      challengeResponse = await axios.get(requestAuthChallengeUrl, {
        headers: { hashcash, publickey: this.publicKey },
      });
    } catch (err) {
      throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
    }

    const randomness: string = challengeResponse.data.randomness;
    const signature = EthCrypto.sign(this.privKey, randomness);

    const faceAuthChallangeUrl = `${baseAuthUrl}/face-challenge/admin`;
    const challangeFaceResponse = await axios.post(
      faceAuthChallangeUrl,
      { publicKey: this.publicKey },
      {
        headers: {
          signature,
        },
      },
    );

    this.authToken = challangeFaceResponse.data.authToken;
  }

  private async refreshAuthToken() {
    if (!this.authToken) {
      if (this.role === 'user') {
        await this.authorizeAsUser();
      } else {
        await this.authorizeAsAdmin();
      }
    }

    const rawToken = jwt.decode(this.authToken!) as { [key: string]: any };
    const expires = rawToken!.exp;
    if (Date.now() / 1000 >= expires) {
      try {
        if (this.role === 'user') {
          await this.authorizeAsUser();
        } else {
          this.authorizeAsAdmin();
        }
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
