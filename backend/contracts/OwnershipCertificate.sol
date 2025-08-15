// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title OwnershipCertificate
 * @dev NFT contract for The Ownership Layer - Proof of Creation certificates
 * Each NFT represents cryptographic proof of content authorship
 */
contract OwnershipCertificate is 
    ERC721, 
    ERC721URIStorage, 
    ERC721Burnable, 
    Ownable, 
    Pausable, 
    ReentrancyGuard,
    IERC2981 
{
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    // Royalty info
    uint256 public constant ROYALTY_BASIS_POINTS = 500; // 5% royalty
    
    // Certificate metadata
    struct Certificate {
        string contentHash;      // SHA256 hash of original content
        string simHash;          // Perceptual similarity hash
        string contentType;      // text, image, audio, code
        string contentPreview;   // Title or snippet
        string authorHandle;     // Creator's .own handle
        address authorWallet;    // Creator's wallet address
        uint256 timestamp;       // Creation timestamp
        string[] tags;           // Content tags
        bool isVerified;         // Verification status
    }

    // Mappings
    mapping(uint256 => Certificate) public certificates;
    mapping(string => uint256) public contentHashToTokenId;
    mapping(address => uint256[]) public authorCertificates;
    mapping(string => uint256[]) public handleCertificates;

    // Events
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed author,
        string indexed contentHash,
        string contentType,
        string authorHandle
    );

    event CertificateVerified(uint256 indexed tokenId, bool verified);
    
    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 amount
    );

    constructor() ERC721("The Ownership Layer Certificate", "OWN") {}

    /**
     * @dev Mint a new ownership certificate
     * @param to Address to mint the certificate to
     * @param contentHash SHA256 hash of the content
     * @param simHash Perceptual similarity hash
     * @param contentType Type of content (text, image, audio, code)
     * @param contentPreview Title or snippet of content
     * @param authorHandle Creator's .own handle
     * @param tags Array of content tags
     * @param metadataURI IPFS URI for complete metadata
     */
    function mintCertificate(
        address to,
        string memory contentHash,
        string memory simHash,
        string memory contentType,
        string memory contentPreview,
        string memory authorHandle,
        string[] memory tags,
        string memory metadataURI
    ) public whenNotPaused nonReentrant returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(contentHash).length > 0, "Content hash required");
        require(contentHashToTokenId[contentHash] == 0, "Content already certified");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store certificate data
        certificates[tokenId] = Certificate({
            contentHash: contentHash,
            simHash: simHash,
            contentType: contentType,
            contentPreview: contentPreview,
            authorHandle: authorHandle,
            authorWallet: to,
            timestamp: block.timestamp,
            tags: tags,
            isVerified: false
        });

        // Update mappings
        contentHashToTokenId[contentHash] = tokenId;
        authorCertificates[to].push(tokenId);
        if (bytes(authorHandle).length > 0) {
            handleCertificates[authorHandle].push(tokenId);
        }

        // Mint NFT
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CertificateMinted(tokenId, to, contentHash, contentType, authorHandle);

        return tokenId;
    }

    /**
     * @dev Verify a certificate (only owner can verify)
     */
    function verifyCertificate(uint256 tokenId, bool verified) public onlyOwner {
        require(_exists(tokenId), "Certificate does not exist");
        certificates[tokenId].isVerified = verified;
        emit CertificateVerified(tokenId, verified);
    }

    /**
     * @dev Get certificate by content hash
     */
    function getCertificateByHash(string memory contentHash) 
        public 
        view 
        returns (uint256, Certificate memory) 
    {
        uint256 tokenId = contentHashToTokenId[contentHash];
        require(tokenId != 0, "Certificate not found");
        return (tokenId, certificates[tokenId]);
    }

    /**
     * @dev Get all certificates by author address
     */
    function getCertificatesByAuthor(address author) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return authorCertificates[author];
    }

    /**
     * @dev Get all certificates by handle
     */
    function getCertificatesByHandle(string memory handle) 
        public 
        view 
        returns (uint256[] memory) 
    {
        return handleCertificates[handle];
    }

    /**
     * @dev Check if content is already certified
     */
    function isContentCertified(string memory contentHash) public view returns (bool) {
        return contentHashToTokenId[contentHash] != 0;
    }

    /**
     * @dev Get total number of certificates
     */
    function totalCertificates() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // EIP-2981 Royalty Support
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        require(_exists(tokenId), "Certificate does not exist");
        
        receiver = certificates[tokenId].authorWallet;
        royaltyAmount = (salePrice * ROYALTY_BASIS_POINTS) / 10000;
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    // Admin functions
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        // Implementation for base URI if needed
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        
        // Clean up mappings
        Certificate memory cert = certificates[tokenId];
        delete contentHashToTokenId[cert.contentHash];
        delete certificates[tokenId];
        
        // Remove from author certificates (expensive operation, consider optimization)
        uint256[] storage authorCerts = authorCertificates[cert.authorWallet];
        for (uint256 i = 0; i < authorCerts.length; i++) {
            if (authorCerts[i] == tokenId) {
                authorCerts[i] = authorCerts[authorCerts.length - 1];
                authorCerts.pop();
                break;
            }
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}
