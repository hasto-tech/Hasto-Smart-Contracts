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
const ipfsHttpClient = require("ipfs-http-client");
const ipfsHashesUtils_1 = require("./utils/ipfsHashesUtils");
const hasto_abi_json_1 = __importDefault(require("./utils/hasto-abi.json"));
const utils_1 = require("ethers/utils");
class HastoSdk {
    constructor(ipfsProviderUrl, ethereumProviderUrl, contractAddress, privateKey) {
        this.ipfsProviderUrl = ipfsProviderUrl;
        this.ethereumProviderUrl = ethereumProviderUrl;
        this.privateKey = privateKey || eth_crypto_1.default.createIdentity().privateKey;
        this.wallet = new ethers_1.Wallet(this.privateKey, new ethers_1.providers.JsonRpcProvider(ethereumProviderUrl));
        this.contractInstance = new ethers_1.Contract(contractAddress, hasto_abi_json_1.default, this.wallet);
        this.ipfs = ipfsHttpClient(ipfsHttpClient, '5001', { protocol: 'http' });
    }
    uploadFile(bytesFile) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = crypto.randomBytes(256).toString('hex');
            const simpleCrypto = new simple_crypto_js_1.default(key);
            const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
            const ipfsContent = yield this.ipfs.add(cipheredBytes);
            const encryptionKeyHash = '0x' + crypto_js_1.SHA256(key).toString(crypto_js_1.enc.Hex);
            const ipfsHash = ipfsContent[0].hash;
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
            // TODO
            const simpleCrypto = new simple_crypto_js_1.default(encryptionKey);
            const cipheredBytes = simpleCrypto.encrypt(bytesFile.toString('utf8'));
            const ipfsContent = yield this.ipfs.add(cipheredBytes);
            const ipfsHash = ipfsContent[0].hash;
            // Ethereum transaction
            const bts32IpfsHash = yield ipfsHashesUtils_1.ipfsHashToBytes32(ipfsHash);
            const tx = yield this.contractInstance.updateFile(fileID, bts32IpfsHash);
            const txReceipt = yield tx.wait();
            if (txReceipt.logs !== undefined) {
                const abiDecoded = new utils_1.AbiCoder().decode(['uint', 'address', 'bytes32', 'uint'], txReceipt.logs[0].data);
                const [fileId, publishedBy, newHash, fileVersion] = abiDecoded;
                return { fileId, publishedBy, newHash, fileVersion };
                console.log(abiDecoded);
            }
            throw new Error(`File update failed tx hash: ${txReceipt.transactionHash}`);
        });
    }
}
exports.HastoSdk = HastoSdk;
