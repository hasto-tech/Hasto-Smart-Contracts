import bs58 = require('bs58');

export async function ipfsHashToBytes32(ipfsHash: string): Promise<string> {
  return (
    '0x' +
    bs58
      .decode(ipfsHash)
      .toString('hex')
      .substr(4)
  );
}
export async function bytes32ToIpfsHash(bytes32: string): Promise<string> {
  return bs58.encode(Buffer.from('1220' + bytes32.substr(2), 'hex'));
}
