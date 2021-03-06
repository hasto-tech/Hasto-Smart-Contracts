pragma solidity 0.5.13;

import "./PublicKeyUtils.sol";
import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";



contract HastoStorage {

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
        bytes ephemeralPublicKey;

        bytes cipheredText;

        bytes mac;
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
    event FileAccessRemoved(uint indexed fileId, address indexed to);
    event PublicKeySet(address indexed by);

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
        require(users[msg.sender].secp256k1PublicKey.length == 0, "The public key has been already declared");
        _;
    }

    modifier fileExists(uint _fileId) {
        require(files[_fileId].ipfsHash[2] != 0, "In order to update a file it needs to be published");
        _;
    }

    modifier isFilePublisher(uint _fileId) {
        require(files[_fileId].publishedBy == msg.sender, "This action is restricted to the file publisher");
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

    function setPublicKey(
        bytes memory _publicKey,
        address _addressBeyondRelayer,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public publicKeyHasNotBeenDeclaredAndProven() {
        require(
            PublicKeyUtils.isPublicKeyCorrespondingToAddress(_addressBeyondRelayer, _publicKey),
            "Public key does not correspond to the address"
        );
        bytes32 _addressHash = keccak256(abi.encodePacked(_addressBeyondRelayer));
        require(ecrecover(_addressHash, _v, _r, _s) == _addressBeyondRelayer, "Signatures mismatch");
        users[msg.sender].secp256k1PublicKey = _publicKey;
        emit PublicKeySet(msg.sender);
    }

    function publishFile(bytes32 _ipfsHash, bytes32 _encryptionKeyHash) public returns(uint) {
        File memory file;
        file.ipfsHash = _ipfsHash;
        file.encryptionSymmetricalKeyHash = _encryptionKeyHash;
        file.publishedBy = msg.sender;
        file.publishmentTimestamp = block.timestamp;
        file.fileVersionCount = 0;
        files[filesCount] = file;
        users[msg.sender].publishedFilesIds.push(filesCount);
        emit FilePublishment(_ipfsHash, msg.sender, filesCount);
        return filesCount++;
    }

    function updateFile(uint _fileId, bytes32 _ipfsHash) public fileExists(_fileId) {
        require(msg.sender == files[_fileId].publishedBy || files[_fileId].allowedToUpdate[msg.sender], "Missing file update permission");
        files[_fileId].previousHashes.push(files[_fileId].ipfsHash);
        files[_fileId].ipfsHash = _ipfsHash;
        files[_fileId].fileVersionCount++;
        files[_fileId].updatesBy.push(msg.sender);
        emit FileUpdate(_fileId, msg.sender, _ipfsHash, files[_fileId].fileVersionCount);
    }

    function shareFileEncryptionKey(
        uint _fileId,
        address _to,
        bytes32 _iv,
        bytes memory _ephemeralPublicKey,
        bytes memory _cipheredText,
        bytes memory _mac
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

    function removeAccessToFile(
        uint _fileId,
        address _to
    ) public fileExists(_fileId) isFilePublisher(_fileId) correspondingPublicKeyExists(_to) {
        delete users[_to].filesAccesses[_fileId];
        emit FileAccessRemoved(_fileId, _to);
    }

    // Getters

    // Address pubkey

    function getPublicKey(address _user) public view returns(bytes memory) {
        return users[_user].secp256k1PublicKey;
    }


    // Informations regarding files published by specific user
    function getPublishedFilesCount() public view returns(uint) {
        return users[msg.sender].publishedFilesIds.length;
    }

    function getPublishedFileId(uint _localFileId) public view returns(uint) {
        require(_localFileId < users[msg.sender].publishedFilesIds.length, "Invalid file local id");
        return users[msg.sender].publishedFilesIds[_localFileId];
    }


    // Informations regarding files shared with specific user
    function getSharedFilesCount() public view returns(uint) {
        return users[msg.sender].sharedFilesIds.length;
    }

    function getSharedFileId(uint _localFileId) public view returns(uint) {
        require(_localFileId < users[msg.sender].sharedFilesIds.length, "Invalid file local id");
        return users[msg.sender].sharedFilesIds[_localFileId];
    }

    // File encryption object getters

    function getFileEncryptionIv(uint _fileId) public view returns(bytes32) {
        return users[msg.sender].filesAccesses[_fileId].iv;
    }

    function getFileEncryptionEphemeralPublicKey(uint _fileId) public view returns(bytes memory) {
        return users[msg.sender].filesAccesses[_fileId].ephemeralPublicKey;
    }

    function getFileEncryptionCipheredText(uint _fileId) public view returns(bytes memory) {
        return users[msg.sender].filesAccesses[_fileId].cipheredText;
    }

    function getFileEncryptionMac(uint _fileId) public view returns(bytes memory) {
        return users[msg.sender].filesAccesses[_fileId].mac;
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

}