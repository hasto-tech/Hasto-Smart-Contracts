"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_js_1 = require("crypto-js");
const eth_crypto_1 = __importDefault(require("eth-crypto"));
const ethers_1 = require("ethers");
class HastoGatewaySdk {
    constructor(hastoApiUrl, privKey, role) {
        this.hastoApiUrl = hastoApiUrl;
        this.privKey = privKey;
        if (!role) {
            this.role = 'user';
        }
        else {
            this.role = role;
        }
        this.publicKey = ethers_1.ethers.utils.computePublicKey(privKey).substring(2);
    }
    addToIpfs(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshAuthToken();
            const hastoIpfsUploadUrl = `${this.hastoApiUrl}/api/v1/ipfs/add`;
            let response;
            try {
                response = yield axios_1.default.post(hastoIpfsUploadUrl, { rawData: data }, { headers: { authtoken: this.authToken } });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
            const hastoIpfsResponse = response;
            const ipfsHash = hastoIpfsResponse.data.ipfsHash;
            const usedTransfer = hastoIpfsResponse.data.usedTransfer;
            return { ipfsHash, usedTransfer };
        });
    }
    setIdentityEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.setIdentity({ email });
            }
            catch (err) {
                throw err;
            }
        });
    }
    setIdentityPhoneNumber(phoneNumber) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.setIdentity({ phoneNumber });
            }
            catch (err) {
                throw err;
            }
        });
    }
    confirmIdentity(confirmationCode) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshAuthToken();
            const confirmIdentityUrl = `${this.hastoApiUrl}/api/v1/identity/confirm`;
            try {
                yield axios_1.default.post(confirmIdentityUrl, { confirmationCode }, { headers: { authtoken: this.authToken } });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
        });
    }
    assignTransfer(whom, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.role !== 'admin') {
                throw new Error('In order to call admin restricted methods please set sdk mode as admin role');
            }
            yield this.refreshAuthToken();
            const url = `${this.hastoApiUrl}/api/v1/transfers/assign-transfer`;
            const body = { whom, quantity };
            try {
                yield axios_1.default.post(url, body, { headers: { authtoken: this.authToken } });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
        });
    }
    // TODO
    removeTransfer() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    setIdentity(args) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshAuthToken();
            const hashcash = yield this.computeHashcash(4, 2);
            const isIdentitySetUrl = `${this.hastoApiUrl}/api/v1/identity/identity-exists/${ethers_1.utils.computeAddress(this.privKey)}`;
            const isIdentitySetResponse = yield axios_1.default.get(isIdentitySetUrl, { headers: { hashcash } });
            if (isIdentitySetResponse.data.exists) {
                return;
            }
            if (!args.email && !args.phoneNumber) {
                throw new Error('Invalid arguments at least one needs to be not null');
            }
            if (args.email && args.phoneNumber) {
                throw new Error('Invalid arguments these properties need to set separately');
            }
            let dto = {};
            const setIdentityUrl = `${this.hastoApiUrl}/api/v1/identity/set`;
            if (args.email) {
                dto.email = args.email;
            }
            else if (args.phoneNumber) {
                dto.phoneNumber = args.phoneNumber;
            }
            try {
                yield axios_1.default.post(setIdentityUrl, dto, { headers: { authtoken: this.authToken } });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
        });
    }
    authorize() {
        return __awaiter(this, void 0, void 0, function* () {
            const baseAuthUrl = `${this.hastoApiUrl}/api/v1/auth`;
            const requestAuthChallengeUrl = `${baseAuthUrl}/request-challenge`;
            const hashcash = yield this.computeHashcash(4, 2);
            let challengeResponse;
            try {
                challengeResponse = yield axios_1.default.get(requestAuthChallengeUrl, {
                    headers: { hashcash, publickey: this.publicKey },
                });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
            const randomness = challengeResponse.data.randomness;
            const signature = eth_crypto_1.default.sign(this.privKey, randomness);
            const faceAuthChallangeUrl = `${baseAuthUrl}/face-challenge`;
            let challangeFaceResponse;
            try {
                challangeFaceResponse = yield axios_1.default.post(faceAuthChallangeUrl, { publicKey: this.publicKey }, {
                    headers: {
                        signature,
                    },
                });
            }
            catch (err) {
                throw new Error(`Request to gateway failed details: ${JSON.stringify(err.response.data)}`);
            }
            this.authToken = challangeFaceResponse.data.authToken;
        });
    }
    refreshAuthToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.authToken) {
                yield this.authorize();
            }
            const rawToken = jwt.decode(this.authToken);
            const expires = rawToken.exp;
            const role = rawToken.role;
            if (Date.now() / 1000 >= expires) {
                try {
                    yield this.authorize();
                }
                catch (err) {
                    throw err;
                }
            }
            this.role = role;
        });
    }
    computeHashcash(difficulty, durationDecimals) {
        const now = Date.now() / 1000;
        const roundedCurrentTimestamp = Math.floor(now / Math.pow(10, durationDecimals)) * Math.pow(10, durationDecimals);
        let hashCashSolved = false;
        let solution = 0;
        while (!hashCashSolved) {
            const hash = crypto_js_1.SHA256(`${roundedCurrentTimestamp}:${solution}`).toString(crypto_js_1.enc.Hex);
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
exports.HastoGatewaySdk = HastoGatewaySdk;
