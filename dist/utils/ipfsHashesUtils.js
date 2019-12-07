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
Object.defineProperty(exports, "__esModule", { value: true });
const bs58 = require("bs58");
function ipfsHashToBytes32(ipfsHash) {
    return __awaiter(this, void 0, void 0, function* () {
        return ('0x' +
            bs58
                .decode(ipfsHash)
                .toString('hex')
                .substr(4));
    });
}
exports.ipfsHashToBytes32 = ipfsHashToBytes32;
function bytes32ToIpfsHash(bytes32) {
    return __awaiter(this, void 0, void 0, function* () {
        return bs58.encode(Buffer.from('1220' + bytes32.substr(2), 'hex'));
    });
}
exports.bytes32ToIpfsHash = bytes32ToIpfsHash;
