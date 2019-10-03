pragma solidity 0.5.11;

library PublicKeyUtils {
    function isPublicKeyCorrespondingToAddress(
        address ethAddress,
        bytes memory publicKey
    ) public pure returns (bool) {
        require (publicKey.length == 64, "Invalid public key length");
        bytes20 bytes20Address = bytes20(uint160(uint256(keccak256 (publicKey))));
        return (keccak256(abi.encodePacked(bytes20Address)) == keccak256(abi.encodePacked(ethAddress)));
    }
}