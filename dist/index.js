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
const eth_crypto_1 = __importDefault(require("eth-crypto"));
const simple_crypto_js_1 = __importDefault(require("simple-crypto-js"));
const crypto_js_1 = require("crypto-js");
const crypto = __importStar(require("crypto"));
const ethers_1 = require("ethers");
const utils_1 = require("ethers/utils");
const ipfsHttpClient = require("ipfs-http-client");
const ipfsHashesUtils_1 = require("./utils/ipfsHashesUtils");
const hasto_abi_json_1 = __importDefault(require("./utils/hasto-abi.json"));
const hasto_gateway_sdk_1 = require("./hasto.gateway.sdk");
class HastoSdk extends hasto_gateway_sdk_1.HastoGatewaySdk {
    constructor(ipfsProviderUrl, ethereumProviderUrl, hastoApiUrl, contractAddress, privateKey, role) {
        // tmp variables
        const privKey = privateKey || eth_crypto_1.default.createIdentity().privateKey;
        const wallet = new ethers_1.Wallet(privKey, new ethers_1.providers.JsonRpcProvider(ethereumProviderUrl));
        super(hastoApiUrl, privKey, role);
        this.privateKey = privKey;
        this.wallet = wallet;
        this.contractInstance = new ethers_1.Contract(contractAddress, hasto_abi_json_1.default, this.wallet);
        this.ipfs = ipfsHttpClient(ipfsProviderUrl, { protocol: 'http' });
    }
    uploadFile(bytesFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = crypto.randomBytes(256).toString('hex');
            const simpleCrypto = new simple_crypto_js_1.default(key);
            const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
            const encryptionKeyHash = '0x' + crypto_js_1.SHA256(key).toString(crypto_js_1.enc.Hex);
            const gatewayIpfsUploadResponse = yield this.addToIpfs(cipheredBytes);
            const ipfsHash = gatewayIpfsUploadResponse.ipfsHash;
            // Ethereum transaction
            const bts32IpfsHash = yield ipfsHashesUtils_1.ipfsHashToBytes32(ipfsHash);
            const tx = yield this.contractInstance.publishFile(bts32IpfsHash, encryptionKeyHash);
            const txReceipt = yield tx.wait();
            if (txReceipt.logs !== undefined) {
                const topics = txReceipt.logs[0].topics;
                const [ipfsLink, publisher, fileID] = topics;
                return {
                    encryptionKey: key,
                    ipfsHashMultiHashFormat: ipfsHash,
                    ipfsHashBytes32Format: String(ipfsLink),
                    fileID: parseInt(fileID, 16),
                };
            }
            throw new Error(`File upload failed tx hash: ${txReceipt.transactionHash}`);
        });
    }
    getFile(fileID, secretKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const simpleCrypto = new simple_crypto_js_1.default(secretKey);
            const ipfsHashBytes32Format = yield this.contractInstance.getFileIpfsHash(fileID);
            const ipfsHash = yield ipfsHashesUtils_1.bytes32ToIpfsHash(ipfsHashBytes32Format);
            const ipfsDownload = yield this.ipfs.cat(ipfsHash);
            const decipheredContent = simpleCrypto.decrypt(ipfsDownload.toString()).toString();
            return { ipfsHashMultiHashFormat: ipfsHash, ipfsHashBytes32Format, fileBytes: decipheredContent };
        });
    }
    getFilesPublishedByMe() {
        return __awaiter(this, void 0, void 0, function* () {
            const publishedFilesCount = yield this.contractInstance.getPublishedFilesCount();
            let publishedFiles = [];
            for (let i = 0; i < publishedFilesCount.toNumber(); i++) {
                const globalFileID = yield this.contractInstance.getPublishedFileId(i);
                publishedFiles.push(globalFileID.toNumber());
            }
            return publishedFiles;
        });
    }
    getFilesSharedWithMe() {
        return __awaiter(this, void 0, void 0, function* () {
            const sharedFilesCount = yield this.contractInstance.getSharedFilesCount();
            let accessableFiles = [];
            for (let i = 0; i < sharedFilesCount.toNumber(); i++) {
                const globalFileID = yield this.contractInstance.getSharedFileId(i);
                accessableFiles.push(globalFileID.toNumber());
            }
            return accessableFiles;
        });
    }
    getFileEncryptionKeyHash(fileID) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.contractInstance.getFileSymmetricalEncryptionKeyHash(fileID);
        });
    }
    updateFile(fileID, bytesFile, encryptionKey, ignoreEncryptionKeysMismatch) {
        return __awaiter(this, void 0, void 0, function* () {
            const fromEthereumFileEncryptionKeyHash = yield this.getFileEncryptionKeyHash(fileID);
            const fileEncryptionKeyHash = '0x' + crypto_js_1.SHA256(encryptionKey).toString(crypto_js_1.enc.Hex);
            if (fromEthereumFileEncryptionKeyHash !== fileEncryptionKeyHash && !ignoreEncryptionKeysMismatch) {
                throw new Error('File encryption keys mismatch, to force the key change please set the param ignoreEncryptionKeysMismatch as true');
            }
            const simpleCrypto = new simple_crypto_js_1.default(encryptionKey);
            const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
            const gatewayIpfsUploadResponse = yield this.addToIpfs(cipheredBytes);
            const ipfsHash = gatewayIpfsUploadResponse.ipfsHash;
            const bts32IpfsHash = yield ipfsHashesUtils_1.ipfsHashToBytes32(ipfsHash);
            const tx = yield this.contractInstance.updateFile(fileID, bts32IpfsHash);
            const txReceipt = yield tx.wait();
            if (txReceipt.logs !== undefined) {
                const abiDecoded = new utils_1.AbiCoder().decode(['address', 'bytes32', 'uint256'], txReceipt.logs[0].data);
                const fileId = parseInt(txReceipt.logs[0].topics[1], 16);
                const [publishedBy, newHash, fileVersion] = abiDecoded;
                return { fileId, publishedBy, newHash, fileVersion: fileVersion.toNumber() };
            }
            throw new Error(`File update failed tx hash: ${txReceipt.transactionHash}`);
        });
    }
    getMyPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = yield this.contractInstance.getPublicKey(this.wallet.address);
            return publicKey.slice(2);
        });
    }
    setPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = '0x' + eth_crypto_1.default.publicKeyByPrivateKey(this.privateKey);
            const addressKeccak = ethers_1.utils.solidityKeccak256(['address'], [this.wallet.address]);
            const sig = new ethers_1.utils.SigningKey(this.wallet.privateKey).signDigest(addressKeccak);
            try {
                if (sig.v) {
                    const tx = yield this.contractInstance.setPublicKey(publicKey, this.wallet.address, sig.v, sig.r, sig.s);
                    yield tx.wait();
                    return true;
                }
                else {
                    return false;
                }
            }
            catch (err) {
                if (err.message === 'VM Exception while processing transaction: revert The public key has been already declared') {
                    return false;
                }
                throw new Error(err.message);
            }
        });
    }
    shareFile(fileID, withAddress, encryptionKey) {
        return __awaiter(this, void 0, void 0, function* () {
            let publicKey = yield this.contractInstance.getPublicKey(withAddress);
            publicKey = publicKey.slice(2);
            const encryptedKey = yield eth_crypto_1.default.encryptWithPublicKey(publicKey, encryptionKey);
            const _iv = utils_1.toUtf8Bytes(encryptedKey.iv);
            const _ephemeralPublicKey = utils_1.toUtf8Bytes(encryptedKey.ephemPublicKey);
            const _cipheredText = utils_1.toUtf8Bytes(encryptedKey.ciphertext);
            const _mac = utils_1.toUtf8Bytes(encryptedKey.mac);
            const tx = yield this.contractInstance.shareFileEncryptionKey(fileID, withAddress, _iv, _ephemeralPublicKey, _cipheredText, _mac);
            yield tx.wait();
        });
    }
    getSharedFile(fileID) {
        return __awaiter(this, void 0, void 0, function* () {
            const [hexIv, hexEphemPublicKey, hexCiphertext, hexMac] = yield Promise.all([
                this.contractInstance.getFileEncryptionIv(fileID),
                this.contractInstance.getFileEncryptionEphemeralPublicKey(fileID),
                this.contractInstance.getFileEncryptionCipheredText(fileID),
                this.contractInstance.getFileEncryptionMac(fileID),
            ]);
            const [iv, ephemPublicKey, ciphertext, mac] = [hexIv, hexEphemPublicKey, hexCiphertext, hexMac].map(e => {
                return utils_1.toUtf8String(e);
            });
            const encryptionKey = yield eth_crypto_1.default.decryptWithPrivateKey(this.privateKey, {
                iv,
                ciphertext,
                mac,
                ephemPublicKey,
            });
            return yield this.getFile(fileID, encryptionKey);
        });
    }
}
exports.HastoSdk = HastoSdk;
