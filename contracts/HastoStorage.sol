pragma solidity 0.5.11;

import "./PublicKeyUtils.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts-ethereum-package/contracts/GSN/GSNRecipient.sol";



contract HastoStorage is GSNRecipient {

    using SafeMath for uint;

    // Structs

    struct File {
        bytes32 ipfsHash;
        address publishedBy;
        uint publishmentTimestamp;
        bytes32 encryptionSymmetricalKeyHash;

        uint fileVersionCount;
        bytes32[] previousHashes;
        address[] updatesBy;

        mapping(address => bool) allowedToUpdate;
    }

    struct FileAccessEncryptedKey {
        bytes32 iv;

        // Remember that the initial '04' is cutted the original length is 130 characters
        bytes32[4] ephemeralPublicKey;

        bytes32[9] cipheredText;

        bytes32[2] mac;
    }

    struct User {
        bytes secp256k1PublicKey;
        mapping(uint => FileAccessEncryptedKey) filesAccesses;
        uint[] sharedFilesIds;
        uint[] publishedFilesIds;
    }

    // Events

    event FilePublishment(bytes32 ipfsHash, address indexed publishedBy, uint indexed fileId);
    event FileUpdate(uint indexed fileId, address publishedBy, bytes32 newHash, uint fileVersion);
    event FileEncryptionKeyShared(uint fileId, address indexed to);

    address owner;
    uint filesCount;

    mapping(address => User) users;
    mapping(uint => File) public files;
    mapping(address => bool) approvedUsers;

    modifier isOwner() {
        require(msg.sender == owner, "This method is restricted just to the contract owner");
        _;
    }

    modifier publicKeyHasNotBeenDeclaredAndProven() {
        require(users[_msgSender()].secp256k1PublicKey.length == 0, "The public key has been already declared");
        _;
    }

    modifier fileExists(uint _fileId) {
        require(files[_fileId].ipfsHash[2] != 0, "In order to update a file it needs to be published");
        _;
    }

    modifier isFilePublisher(uint _fileId) {
        require(files[_fileId].publishedBy == _msgSender(), "This action is restricted to the file publisher");
        _;
    }

    modifier correspondingPublicKeyExists(address _user) {
        require(users[_user].secp256k1PublicKey.length != 0, "There is no corresponding public key for the given address");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    // State changing functions

    function setPublicKey(bytes memory _publicKey) public publicKeyHasNotBeenDeclaredAndProven() {
        require(PublicKeyUtils.isPublicKeyCorrespondingToAddress(_msgSender(), _publicKey), "Public key does not correspond to the address");
        users[_msgSender()].secp256k1PublicKey = _publicKey;
    }

    function publishFile(bytes32 _ipfsHash, bytes32 _encryptionKeyHash) public returns(uint) {
        File memory file;
        file.ipfsHash = _ipfsHash;
        file.encryptionSymmetricalKeyHash = _encryptionKeyHash;
        file.publishedBy = _msgSender();
        file.publishmentTimestamp = block.timestamp;
        file.fileVersionCount = 0;
        files[filesCount] = file;
        users[_msgSender()].publishedFilesIds.push(filesCount);
        emit FilePublishment(_ipfsHash, _msgSender(), filesCount);
        return filesCount++;
    }

    function updateFile(uint _fileId, bytes32 _ipfsHash) public fileExists(_fileId) {
        require(_msgSender() == files[_fileId].publishedBy || files[_fileId].allowedToUpdate[_msgSender()], "Missing file update permission");
        files[_fileId].previousHashes.push(files[_fileId].ipfsHash);
        files[_fileId].ipfsHash = _ipfsHash;
        files[_fileId].fileVersionCount++;
        files[_fileId].updatesBy.push(_msgSender());
        emit FileUpdate(_fileId, _msgSender(), _ipfsHash, files[_fileId].fileVersionCount);
    }

    function shareFileEncryptionKey(
        uint _fileId,
        address _to,
        bytes32 _iv,
        bytes32[4] memory _ephemeralPublicKey,
        bytes32[9] memory _cipheredText,
        bytes32[2] memory _mac
    ) public fileExists(_fileId) isFilePublisher(_fileId) correspondingPublicKeyExists(_to) {
        users[_to].filesAccesses[_fileId] = FileAccessEncryptedKey({
            iv: _iv,
            ephemeralPublicKey: _ephemeralPublicKey,
            cipheredText: _cipheredText,
            mac: _mac
        });
        users[_to].sharedFilesIds.push(_fileId);
        emit FileEncryptionKeyShared(_fileId, _to);
    }

    // Getters

    // Address pubkey

    function getPublicKey(address _user) public view returns(bytes memory) {
        return users[_user].secp256k1PublicKey;
    }


    // Informations regarding files published by specific user
    function getPublishedFilesCount() public view returns(uint) {
        return users[_msgSender()].publishedFilesIds.length;
    }

    function getPublishedFileId(uint _localFileId) public view returns(uint) {
        require(_localFileId < users[_msgSender()].publishedFilesIds.length, "Invalid file local id");
        return users[_msgSender()].publishedFilesIds[_localFileId];
    }


    // Informations regarding files shared with specific user
    function getSharedFilesCount() public view returns(uint) {
        return users[_msgSender()].sharedFilesIds.length;
    }

    function getSharedFileId(uint _localFileId) public view returns(uint) {
        require(_localFileId < users[_msgSender()].sharedFilesIds.length, "Invalid file local id");
        return users[_msgSender()].sharedFilesIds[_localFileId];
    }

    // File encryption object getters

    function getFileEncryptionIv(uint _fileId) public view returns(bytes32) {
        return users[_msgSender()].filesAccesses[_fileId].iv;
    }

    function getFileEncryptionEphemeralPublicKey(uint _fileId) public view returns(bytes32[4] memory) {
        return users[_msgSender()].filesAccesses[_fileId].ephemeralPublicKey;
    }

    function getFileEncryptionCipheredText(uint _fileId) public view returns(bytes32[9] memory) {
        return users[_msgSender()].filesAccesses[_fileId].cipheredText;
    }

    function getFileEncryptionMac(uint _fileId) public view returns(bytes32[2] memory) {
        return users[_msgSender()].filesAccesses[_fileId].mac;
    }

    // File data object getters

    function getFileIpfsHash(uint _fileId) public view returns(bytes32) {
        return files[_fileId].ipfsHash;
    }

    function getFilePublisher(uint _fileId) public view returns(address) {
        return files[_fileId].publishedBy;
    }

    function getFilePublishmentTimestamp(uint _fileId) public view returns(uint) {
        return files[_fileId].publishmentTimestamp;
    }

    function getFileSymmetricalEncryptionKeyHash(uint _fileId) public view returns(bytes32) {
        return files[_fileId].encryptionSymmetricalKeyHash;
    }

    function getFileVersion(uint _fileId) public view returns(uint) {
        return files[_fileId].fileVersionCount;
    }

    function getFileUpdatesCount(uint _fileId) public view returns(uint) {
        return files[_fileId].previousHashes.length;
    }

    function getFileVersionPreviousHash(uint _fileId, uint _updateId) public view returns(bytes32) {
        return files[_fileId].previousHashes[_updateId];
    }

    function getFileVersionUpdater(uint _fileId, uint _updateId) public view returns(address) {
        return files[_fileId].updatesBy[_updateId];
    }

    function isAllowedToUpdateFile(uint _fileId, address _updater) public view returns(bool) {
        return files[_fileId].allowedToUpdate[_updater];
    }

    // Gas station network policy

    function acceptRelayedCall(
        address relay,
        address from,
        bytes calldata encodedFunction,
        uint256 transactionFee,
        uint256 gasPrice,
        uint256 gasLimit,
        uint256 nonce,
        bytes calldata approvalData,
        uint256 maxPossibleCharge
    ) external view returns (uint256, bytes memory) {
        address _caller = _msgSender();
        if(approvedUsers[_caller] || _caller == owner) {
            return _approveRelayedCall();
        }
        return _rejectRelayedCall(403);
    }
}