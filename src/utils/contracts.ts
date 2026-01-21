import { ethers } from 'ethers';
import bs58 from 'bs58';

// ============================================
// IPFS CID CONVERSION UTILITIES
// ============================================

/**
 * Convert CID (SHA-256 hex) to bytes32
 * Vault uses 64-character hex strings as CIDs
 */
export function cidToBytes32(cid: string): string {
  if (!cid) {
    throw new Error('CID is required');
  }
  
  // Already has 0x prefix
  if (cid.startsWith('0x') && cid.length === 66) {
    return cid.toLowerCase();
  }
  
  // 64-char hex string (SHA-256)
  if (/^[a-f0-9]{64}$/i.test(cid)) {
    return '0x' + cid.toLowerCase();
  }
  
  throw new Error(`Invalid CID format: ${cid.slice(0, 20)}...`);
}

/**
 * Convert bytes32 back to CID (SHA-256 hex)
 */
export function bytes32ToCid(bytes32Hash: string): string {
  if (!bytes32Hash || bytes32Hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return '';
  }
  
  // Remove 0x prefix
  return bytes32Hash.startsWith('0x') ? bytes32Hash.slice(2) : bytes32Hash;
}

// Contract ABIs (simplified for demo)
export const HASHD_ABI = [
  "function getContractAddresses() view returns (address keyRegistryAddr, address messageContractAddr)",
  "function getSystemInfo() view returns (string version, uint256 deployment, uint256 totalMessages, uint256 totalUnread, string mailboxName)",
  "function registerKeyAndSendMessage(bytes keyData, address recipient, bytes encryptedContent, bytes encryptedMetadata) returns (uint256)"
];

export const VAULT_NODE_REGISTRY_ABI = [
  "function getNode(bytes32 nodeId) view returns (tuple(address owner, bytes publicKey, string url, bytes32 metadataHash, uint256 registeredAt, bool active))",
  "function getAllNodes(uint256 offset, uint256 limit) view returns (bytes32[])",
  "function getActiveNodes() view returns (bytes32[])",
  "function getNodeCount() view returns (uint256 total, uint256 active)",
  "function isNodeActive(bytes32 nodeId) view returns (bool)"
];

export const ACCOUNT_REGISTRY_ABI = [
  // Unified account functions
  "function registerAccount(bytes publicKey)",
  "function registerAccountWithHashID(string name, string domain, bytes publicKey) payable",
  "function updateAccountKey(uint256 index, bytes newPublicKey)",
  "function updateHashIDAccountKey(string fullName, bytes newPublicKey)",
  "function getAccount(address owner, uint256 index) view returns (bytes publicKey, uint256 createdAt, bool isActive, bool hasHashIDAttached, string hashIDName, uint256 hashIDTokenId)",
  "function getAccounts(address owner) view returns (tuple(bytes publicKey, uint256 createdAt, bool isActive, bool hasHashIDAttached, string hashIDName, uint256 hashIDTokenId)[])",
  "function getAccountCount(address owner) view returns (uint256)",
  "function hasAccount(address owner) view returns (bool)",
  
  // HashID functions
  "function getHashIDAccount(string fullName) view returns (bytes publicKey, address owner, uint256 timestamp, bool isActive)",
  "function getPublicKeyByName(string fullName) view returns (bytes)",
  "function isNameAvailable(string name, string domain) view returns (bool)",
  "function getOwnerHashIDs(address owner) view returns (string[])",
  "function getPrimaryHashID(address owner) view returns (string)",
  "function calculateNameFee(string name, string domain) view returns (uint256)",
  "function isHashIDAttached(string fullName) view returns (bool)",
  
  // Attachment functions
  "function attachHashID(string fullName, bytes accountPublicKey)",
  "function detachHashID(string fullName)",
  
  // Domain management
  "function getAvailableDomains() view returns (string[])",
  "function getDomainTierPrices(string domain) view returns (uint256[5])",
  "function isDomainActive(string domain) view returns (bool)",
  
  // Owner functions
  "function addDomain(string domain, uint256 fee)",
  "function setDomainFee(string domain, uint256 newFee)",
  "function withdrawFees()",
  "function removeDomain(string domain)",
  
  // Events
  "event BareAccountRegistered(address indexed owner, bytes publicKey, uint256 timestamp)",
  "event NamedAccountRegistered(address indexed owner, string indexed name, bytes publicKey, uint256 fee, uint256 timestamp)",
  "event AccountUpdated(address indexed owner, string indexed identifier, bytes newPublicKey, uint256 timestamp)",
  "event AccountDeactivated(address indexed owner, string indexed identifier, uint256 timestamp)",
  "event DomainAdded(string domain, uint256 fee)",
  "event DomainRemoved(string domain)",
  "event DomainFeeUpdated(string domain, uint256 oldFee, uint256 newFee)"
];

export const KEY_REGISTRY_ABI = [
  "function registerKey(bytes keyData, string mailboxName)",
  "function registerKey(bytes keyData)",
  "function getPublicKey(address user, bytes keyData) view returns (bytes keyData, uint256 timestamp, bool isActive, string mailboxName)",
  "function getAllKeys(address user) view returns (bytes32[] memory)",
  "function getKeyByHash(address user, bytes32 keyHash) view returns (uint256 timestamp, bool isActive, string mailboxName)",
  "function hasKey(address user, bytes keyData) view returns (bool)",
  "function getKeyCount(address user) view returns (uint256)",
  "function getMailboxNameByKeyHash(bytes32 keyHash) view returns (string)",
  "function getMailboxNameByKey(bytes keyData) view returns (string)",
  "function isKeyRegistered(address user) view returns (bool)",
  "function deactivateKey(bytes keyData)",
  "event KeyRegistered(address indexed user, bytes32 indexed keyHash, bytes keyData, string mailboxName, uint256 timestamp)",
  "event KeyUpdated(address indexed user, bytes32 indexed keyHash, bytes newKeyData, string mailboxName, uint256 timestamp)",
  "event KeyDeactivated(address indexed user, bytes32 indexed keyHash, uint256 timestamp)"
];

export const MESSAGE_CONTRACT_ABI = [
  // Write functions
  "function initializeUser(address user)",
  "function recordMessage(address sender, address recipient, bytes32 threadId, uint256 replyTo, bytes32 threadCID, bool ackRequired, bytes32 senderPublicKeyHash, bytes32 recipientPublicKeyHash) returns (uint256)",
  "function markAsRead(uint256 messageId)",
  "function markAsReadBatch(uint256[] messageIds)",
  "function authorizeDelegate(address delegate, uint256 validUntil)",
  
  // NEW: Read Receipt Functions
  "function markThreadAsRead(bytes32 threadId, uint256 messageIndex)",
  "function getReadStatus(bytes32 threadId, address participant) view returns (uint256 lastReadIndex, uint256 totalMessages, uint256 unreadCount, uint256 joinedAtIndex)",
  "function batchGetReadStatus(bytes32[] threadIds, address participant) view returns (uint256[] lastReadIndexes, uint256[] totalMessages, uint256[] unreadCounts, uint256[] joinedAtIndexes)",
  "function canReadMessage(bytes32 threadId, address participant, uint256 messageIndex) view returns (bool)",
  "function addParticipantToThread(bytes32 threadId, address participant)",
  "function isAckRequired(bytes32 threadId) view returns (bool)",
  "function isThreadTerminated(bytes32 threadId) view returns (bool)",
  "function isSenderPermitted(address recipient, address sender) view returns (bool)",
  
  // View functions - Pagination (UPDATED: removed unbounded getMessagesToRecipient)
  "function getUserCID(address user) view returns (bytes32)", // DEPRECATED - always returns 0
  "function getUserMessages(address user) view returns (bytes32 currentCID, uint256 lastUpdated, bool initialized)",
  "function getThreadCID(bytes32 threadId) view returns (bytes32)",
  "function getMessagesPaginated(uint256 offset, uint256 limit) view returns (uint256[] messageIds, uint256 total)",
  "function getMessagesBatch(uint256[] messageIds) view returns (tuple(uint256 messageId, bytes32 threadId, uint256 replyTo, uint256 timestamp, address sender, address recipient, bool isRead)[])",
  "function getUserMessageCounts(address user) view returns (uint256 sent, uint256 received)",
  "function getMessage(uint256 messageId) view returns (address sender, address recipient, bytes32 threadId, uint256 replyTo, uint256 timestamp, bool isRead)",
  
  // Public mappings
  "function userMessages(address user) view returns (bytes32 currentCID, uint256 lastUpdated, bool initialized)",
  "function messages(uint256 messageId) view returns (uint256 messageId, bytes32 threadId, uint256 replyTo, uint256 timestamp, address sender, address recipient, bool isRead)",
  "function userSentCount(address user) view returns (uint256)",
  "function userReceivedCount(address user) view returns (uint256)",
  "function totalMessages() view returns (uint256)",
  "function keyRegistry() view returns (address)",
  "function sessionManager() view returns (address)",
  
  // NEW: Read Receipt Mappings
  "function threadReadIndex(bytes32 threadId, address participant) view returns (uint256)",
  "function threadMessageCount(bytes32 threadId) view returns (uint256)",
  "function participantJoinIndex(bytes32 threadId, address participant) view returns (uint256)",
  
  // Events (UPDATED: Enhanced for The Graph indexing)
  "event MessageSent(uint256 indexed messageId, address indexed sender, address indexed recipient, bytes32 threadId, bytes32 senderPublicKeyHash, bytes32 recipientPublicKeyHash, uint256 replyTo, uint256 timestamp, uint256 senderMessageIndex, uint256 recipientMessageIndex)",
  "event ThreadCIDUpdated(bytes32 indexed threadId, bytes32 cid, uint256 messageCount)",
  "event MessageRead(uint256 indexed messageId, address indexed recipient, uint256 timestamp)",
  
  // NEW: Read Receipt Events
  "event ThreadRead(bytes32 indexed threadId, address indexed reader, uint256 readUpToIndex, uint256 timestamp)",
  "event ThreadMessageRecorded(bytes32 indexed threadId, uint256 indexed messageIndex, address indexed sender, uint256 timestamp)",
  "event ParticipantJoined(bytes32 indexed threadId, address indexed participant, uint256 joinedAtIndex, uint256 timestamp)",
  "event ThreadCreated(bytes32 indexed threadId, address indexed sender, address indexed recipient, bool ackRequired, uint256 timestamp)"
];

export const SESSION_MANAGER_ABI = [
  // Write functions
  "function createSession(address sessionKey, uint256 validUntil) payable",
  "function sendMessageViaSession(address user, address recipient, bytes encryptedContent, bytes encryptedMetadata, bytes senderEncryptedContent, bytes senderEncryptedMetadata) returns (uint256)",
  "function revokeSession(address sessionKey)",
  "function cleanupExpiredSession(address user, address sessionKey)",
  
  // View functions
  "function isValidSession(address user, address sessionKey) view returns (bool)",
  "function getSession(address user, address sessionKey) view returns (address user, address sessionKey, uint256 validUntil, bool isActive, uint256 createdAt)",
  "function getUserSessions(address user) view returns (address[])",
  "function getSessionBalance(address sessionKey) view returns (uint256)",
  "function sessions(address user, address sessionKey) view returns (address user, address sessionKey, uint256 validUntil, bool isActive, uint256 createdAt)",
  "function sessionKeyToSession(address sessionKey) view returns (address user, address sessionKey, uint256 validUntil, bool isActive, uint256 createdAt)",
  "function userSessions(address user, uint256 index) view returns (address)",
  "function messageContract() view returns (address)",
  
  // Events
  "event SessionCreated(address indexed user, address indexed sessionKey, uint256 validUntil, uint256 fundingAmount)",
  "event SessionRevoked(address indexed user, address indexed sessionKey)",
  "event SessionExpired(address indexed user, address indexed sessionKey)",
  "event MessageSentViaSession(address indexed user, address indexed sessionKey, uint256 indexed messageId)"
];

export const GROUP_POSTS_ABI = [
  // Write functions
  "function createPost(bytes32 contentHash, uint8 accessLevel) returns (uint256)",
  "function deletePost(uint256 postId)",
  "function addComment(uint256 postId, bytes32 contentHash) returns (uint256)",
  "function deleteComment(uint256 commentId)",
  
  // Vote functions
  "function upvotePost(uint256 postId)",
  "function upvoteComment(uint256 commentId)",
  "function downvotePost(uint256 postId)",
  "function downvoteComment(uint256 commentId)",
  
  // View functions - Pagination (UPDATED: removed unbounded arrays)
  "function getPostsPaginated(uint256 offset, uint256 limit) view returns (uint256[] postIds, uint256 total)",
  "function getPostCommentCount(uint256 postId) view returns (uint256 count)",
  "function getUserPostCount(address author) view returns (uint256 count)",
  
  // View functions - Batch
  // TEMPORARY: Using version WITHOUT downvotes to match deployed contract
  "function getPostsBatch(uint256[] postIds) view returns (tuple(uint256 id, bytes32 contentHash, uint256 timestamp, uint256 upvotes, uint256 commentCount, address author, uint8 accessLevel, bool isDeleted)[])",
  "function getCommentsBatch(uint256[] commentIds) view returns (tuple(uint256 id, uint256 postId, bytes32 contentHash, uint256 timestamp, uint256 upvotes, address author, bool isDeleted)[])",
  "function batchHasUpvotedPost(address user, uint256[] postIds) view returns (bool[])",
  "function batchHasUpvotedComment(address user, uint256[] commentIds) view returns (bool[])",
  
  // View functions - Single (UPDATED: optimized struct packing)
  "function getPost(uint256 postId) view returns (tuple(uint256 id, bytes32 contentHash, uint256 timestamp, uint256 upvotes, uint256 commentCount, address author, uint8 accessLevel, bool isDeleted))",
  "function getComment(uint256 commentId) view returns (tuple(uint256 id, uint256 postId, bytes32 contentHash, uint256 timestamp, uint256 upvotes, address author, bool isDeleted))",
  "function posts(uint256 postId) view returns (uint256 id, bytes32 contentHash, uint256 timestamp, uint256 upvotes, uint256 commentCount, address author, uint8 accessLevel, bool isDeleted)",
  "function comments(uint256 commentId) view returns (uint256 id, uint256 postId, bytes32 contentHash, uint256 timestamp, uint256 upvotes, address author, bool isDeleted)",
  "function hasUpvotedPost(address user, uint256 postId) view returns (bool)",
  "function hasUpvotedComment(address user, uint256 commentId) view returns (bool)",
  
  // Helper functions
  "function isMember(address user) view returns (bool)",
  "function postCount() view returns (uint256)",
  "function totalCommentCount() view returns (uint256)",
  "function userPostCount(address author) view returns (uint256)",
  "function groupToken() view returns (address)",
  "function groupNFT() view returns (address)",
  "function groupOwner() view returns (address)",
  "function userProfile() view returns (address)",
  
  // Events (UPDATED: Enhanced for The Graph indexing)
  "event PostCreated(uint256 indexed postId, address indexed author, bytes32 indexed ipfsHash, uint256 timestamp, uint8 accessLevel, uint256 authorPostIndex)",
  "event PostDeleted(uint256 indexed postId, address indexed author, uint256 timestamp)",
  "event CommentCreated(uint256 indexed commentId, uint256 indexed postId, address indexed author, bytes32 ipfsHash, uint256 timestamp, uint256 postCommentIndex)",
  "event CommentDeleted(uint256 indexed commentId, uint256 indexed postId, address indexed author, uint256 timestamp)",
  "event PostUpvoted(uint256 indexed postId, address indexed user, uint256 newUpvoteCount)",
  "event PostUnupvoted(uint256 indexed postId, address indexed user, uint256 newUpvoteCount)",
  "event CommentUpvoted(uint256 indexed commentId, address indexed user, uint256 newUpvoteCount)",
  "event CommentUnupvoted(uint256 indexed commentId, address indexed user, uint256 newUpvoteCount)"
];

export const GROUP_FACTORY_ABI = [
  "function createGroup(string title, string description, bytes32 avatarCID, bytes32 headerCID, string erc20Name, string erc20Symbol, string nftName, string nftSymbol, uint256 nftPrice, uint256 maxNFTs) returns (address tokenAddr, address nftAddr, address postsAddr, address commentsAddr)",
  "function allGroups(uint256 index) view returns (string title, string description, bytes32 avatarCID, bytes32 headerCID, address owner, address tokenAddress, address nftAddress, address postsAddress)",
  "function allGroupsLength() view returns (uint256)",
  "function getGroupsForOwner(address owner) view returns (address[])",
  "function userProfile() view returns (address)",
  "event GroupCreated(address indexed owner, address tokenAddress, address nftAddress, address postsAddress, string title)"
];

export const USER_PROFILE_ABI = [
  "function joinGroup(address groupToken)",
  "function leaveGroup(address groupToken)",
  "function hasJoinedGroup(address user, address groupToken) view returns (bool)",
  "function isMember(address user, address groupToken) view returns (bool)",
  "function getUserGroupCount(address user) view returns (uint256)",
  "function getGroupMemberCount(address groupToken) view returns (uint256)",
  "function batchHasJoinedGroup(address user, address[] groupTokens) view returns (bool[])",
  "event GroupJoined(address indexed user, address indexed groupToken, uint256 timestamp, uint256 newMemberCount)",
  "event GroupLeft(address indexed user, address indexed groupToken, uint256 timestamp, uint256 newMemberCount)"
];

export const BONDING_CURVE_ABI = [
  // View functions
  "function getCurrentPrice() view returns (uint256)",
  "function getBuyPrice(uint256 amount) view returns (uint256)",
  "function getSellPrice(uint256 amount) view returns (uint256)",
  "function getPoolStats() view returns (uint256 price, uint256 supply, uint256 poolBalance, uint256 volume, uint256 holders, uint256 buys, uint256 sells, bool isGraduated)",
  "function canGraduate() view returns (bool)",
  "function token() view returns (address)",
  "function creator() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function totalVolume() view returns (uint256)",
  "function graduated() view returns (bool)",
  "function uniswapPair() view returns (address)",
  "function buyCount() view returns (uint256)",
  "function sellCount() view returns (uint256)",
  "function uniqueHolders() view returns (uint256)",
  
  // Write functions
  "function buy(uint256 minTokens) payable",
  "function sell(uint256 tokenAmount, uint256 minETH)",
  "function initiateGraduation()",
  "function finalizeGraduation(address uniswapPair)",
  
  // Events
  "event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount, uint256 newPrice, uint256 newSupply)",
  "event TokensSold(address indexed seller, uint256 tokenAmount, uint256 ethAmount, uint256 newPrice, uint256 newSupply)",
  "event GraduationInitiated(address indexed initiator, uint256 poolBalance, uint256 timestamp)",
  "event Graduated(address indexed uniswapPair, uint256 liquidityETH, uint256 liquidityTokens, uint256 creatorBonus)"
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  // Airdrop functions
  "function setDistribution(bytes32 _merkleRoot, uint256 ownerPercentage, uint256 bondingCurvePercentage)",
  "function claimAirdrop(uint256 amount, bytes32[] merkleProof)",
  "function hasClaimed(address account) view returns (bool)",
  "function merkleRoot() view returns (bytes32)",
  // Bonding curve functions
  "function activateBondingCurve()",
  "function buy() payable",
  "function sell(uint256 tokenAmount)",
  "function calculateBuyPrice(uint256 tokenAmount) view returns (uint256)",
  "function calculateSellPrice(uint256 tokenAmount) view returns (uint256)",
  "function getCurrentPrice() view returns (uint256)",
  "function bondingCurveActive() view returns (bool)",
  "function bondingCurveSupply() view returns (uint256)"
];

export const HASHD_ID_ABI = [
  // ERC721 Standard
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  
  // HashID specific
  "function tokenIdToName(uint256 tokenId) view returns (string)",
  "function tokenIdToDomain(uint256 tokenId) view returns (string)",
  "function domainColors(string domain) view returns (string)",
  "function accountRegistry() view returns (address)",
  
  // Events
  "event HashIDMinted(address indexed owner, uint256 indexed tokenId, string name, string domain)",
  "event HashIDTransferred(address indexed from, address indexed to, uint256 indexed tokenId, string name)",
  "event DomainColorUpdated(string indexed domain, string color)"
];

export const ERC721_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function approve(address to, uint256 tokenId)",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function transferFrom(address from, address to, uint256 tokenId)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  // Group NFT specific - public state variables (auto-generated getters)
  "function owner() view returns (address)",
  "function nftPrice() view returns (uint256)",
  "function nextTokenId() view returns (uint256)",
  "function MAX_NFTS() view returns (uint256)",
  "function groupCreator() view returns (address)",
  "function factory() view returns (address)",
  "function groupTitle() view returns (string)",
  "function groupDescription() view returns (string)",
  "function groupImageURI() view returns (string)",
  // Group NFT functions
  "function purchaseNFT() payable",
  "function giftNFT(address to)",
  "function setNFTPrice(uint256 newPrice)",
  "function issueNFT(address to)",
  "function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)"
];

// Network configuration
const CHAIN_ID = parseInt(process.env.REACT_APP_CHAIN_ID || "31337");
const ENV_RPC_URL = process.env.REACT_APP_RPC_URL;

// Detect network type
const IS_LOCAL = CHAIN_ID === 31337 || CHAIN_ID === 1337;
const IS_MEGAETH = CHAIN_ID === 6342;

// Determine RPC URL based on environment
const getRpcUrl = (): string => {
  // If explicit RPC URL is set, use it
  if (ENV_RPC_URL) {
    return ENV_RPC_URL;
  }
  
  // For local development, use localhost
  if (IS_LOCAL) {
    return "http://127.0.0.1:8545";
  }
  
  // For MegaETH, use public RPC
  if (IS_MEGAETH) {
    return "https://carrot.megaeth.com/rpc";
  }
  
  // Fallback - avoid localhost in production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return "http://localhost:8545";
  }
  
  // Production fallback - should not happen if properly configured
  throw new Error('RPC_URL not configured for production environment');
};

const RPC_URL = getRpcUrl();

export const NETWORK_CONFIG = {
  CHAIN_ID,
  RPC_URL,
  EXPLORER_URL: process.env.REACT_APP_EXPLORER_URL || (IS_LOCAL ? "http://localhost:8545" : "https://www.megaexplorer.xyz"),
  NAME: IS_MEGAETH ? "MegaETH" : IS_LOCAL ? "Localhost" : "Unknown",
  IS_LOCAL,
  IS_MEGAETH
};

console.log(`🌐 Network: ${NETWORK_CONFIG.NAME} (Chain ID: ${CHAIN_ID})`);
console.log(`📡 RPC Provider: ${IS_LOCAL ? 'Local Hardhat' : 'Direct RPC'}`);
console.log(`🔗 RPC URL: ${RPC_URL}`);

// Contract addresses - Always loaded from environment variables
// Make sure to set these in your .env file
export const CONTRACT_ADDRESSES = {
  ACCOUNT_REGISTRY: process.env.REACT_APP_ACCOUNT_REGISTRY || (() => {
    throw new Error('REACT_APP_ACCOUNT_REGISTRY not set in .env file');
  })(),
  KEY_REGISTRY: process.env.REACT_APP_KEY_REGISTRY || (() => {
    throw new Error('REACT_APP_KEY_REGISTRY not set in .env file');
  })(),
  MESSAGE_CONTRACT: process.env.REACT_APP_MESSAGE_CONTRACT || (() => {
    throw new Error('REACT_APP_MESSAGE_CONTRACT not set in .env file');
  })(),
  HASHD_TAG: process.env.REACT_APP_HASHD_TAG || (() => {
    throw new Error('REACT_APP_HASHD_TAG not set in .env file');
  })(),
  VAULT_NODE_REGISTRY: process.env.REACT_APP_VAULT_NODE_REGISTRY || '',
};

console.log('📋 CONTRACT_ADDRESSES loaded:', CONTRACT_ADDRESSES);
console.log('📋 Raw env vars:', {
  REACT_APP_MESSAGE_STORAGE: process.env.REACT_APP_MESSAGE_STORAGE,
  REACT_APP_KEY_STORAGE: process.env.REACT_APP_KEY_STORAGE,
  REACT_APP_ACCOUNT_STORAGE: process.env.REACT_APP_ACCOUNT_STORAGE,
  REACT_APP_POST_STORAGE: process.env.REACT_APP_POST_STORAGE,
  REACT_APP_USER_PROFILE_STORAGE: process.env.REACT_APP_USER_PROFILE_STORAGE,
  REACT_APP_GROUP_FACTORY_STORAGE: process.env.REACT_APP_GROUP_FACTORY_STORAGE,
  REACT_APP_KEY_REGISTRY: process.env.REACT_APP_KEY_REGISTRY,
  REACT_APP_ACCOUNT_REGISTRY: process.env.REACT_APP_ACCOUNT_REGISTRY,
  REACT_APP_HASHD_TAG: process.env.REACT_APP_HASHD_TAG,
  REACT_APP_MESSAGE_CONTRACT: process.env.REACT_APP_MESSAGE_CONTRACT,
  REACT_APP_USER_PROFILE: process.env.REACT_APP_USER_PROFILE,
  REACT_APP_GROUP_POSTS_DEPLOYER: process.env.REACT_APP_GROUP_POSTS_DEPLOYER,
  REACT_APP_GROUP_COMMENTS_DEPLOYER: process.env.REACT_APP_GROUP_COMMENTS_DEPLOYER,
  REACT_APP_BONDING_CURVE_DEPLOYER: process.env.REACT_APP_BONDING_CURVE_DEPLOYER,
  REACT_APP_GROUP_FACTORY: process.env.REACT_APP_GROUP_FACTORY,
  REACT_APP_DEPLOYMENT_REGISTRY: process.env.REACT_APP_DEPLOYMENT_REGISTRY,
});

export interface ContractAddresses {
  keyRegistryAddr: string;
  messageContractAddr: string;
}

export class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private readProvider: ethers.JsonRpcProvider | null = null; // Fast read-only provider
  private signer: ethers.JsonRpcSigner | null = null;
  private contracts: {
    accountRegistry?: ethers.Contract;
    keyRegistry?: ethers.Contract;
    messageContract?: ethers.Contract;
    sessionManager?: ethers.Contract;
  } = {};

  constructor() {
    // Initialize fast read-only provider immediately
    this.readProvider = this.createRpcProvider();
  }

  private createRpcProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.RPC_URL, undefined, {
      staticNetwork: true,
      batchMaxCount: 1 // Disable batching to avoid 502 errors
    });
    
    // Add error handling with fallback
    const originalSend = provider.send.bind(provider);
    provider.send = async (method: string, params: any[]) => {
      try {
        return await originalSend(method, params);
      } catch (error: any) {
        // Log RPC errors for debugging
        console.error('RPC call failed:', error.message);
        throw error;
      }
    };
    
    return provider;
  }

  async connect(): Promise<boolean> {
    if (typeof window.ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        await this.provider.send("eth_requestAccounts", []);
        
        // Check if we're on the correct network
        const network = await this.provider.getNetwork();
        
        if (Number(network.chainId) !== NETWORK_CONFIG.CHAIN_ID) {
          await this.switchNetwork();
          
          // Recreate provider after network switch to avoid network change errors
          this.provider = new ethers.BrowserProvider(window.ethereum);
          
          // Verify network switch
          const newNetwork = await this.provider.getNetwork();
          
          if (Number(newNetwork.chainId) !== NETWORK_CONFIG.CHAIN_ID) {
            throw new Error(`Please manually switch to ${NETWORK_CONFIG.NAME} network in MetaMask. Current: ${Number(newNetwork.chainId)}, Expected: ${NETWORK_CONFIG.CHAIN_ID} (${NETWORK_CONFIG.NAME})`);
          }
        }
        
        this.signer = await this.provider.getSigner();
        
        // Initialize contracts
        await this.initializeContracts();
        
        return true;
      } catch (error) {
        console.error('Failed to connect to wallet:', error);
        return false;
      }
    }
    return false;
  }

  private async switchNetwork(): Promise<void> {
    if (!window.ethereum) throw new Error('No wallet found');
    
    const chainIdHex = `0x${NETWORK_CONFIG.CHAIN_ID.toString(16)}`;
    
    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: chainIdHex,
            chainName: NETWORK_CONFIG.NAME,
            rpcUrls: [NETWORK_CONFIG.RPC_URL],
            blockExplorerUrls: [NETWORK_CONFIG.EXPLORER_URL],
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
          }],
        });
      } else if (switchError.code === 4001) {
        // User rejected the request
        throw new Error('Please approve the network switch in MetaMask to continue');
      } else {
        console.error('Network switch error:', switchError);
        throw new Error(`Failed to switch network: ${switchError.message || 'Unknown error'}`);
      }
    }
  }

  // Initialize contracts with read-only provider (for read operations before wallet connection)
  initializeReadOnlyContracts() {
    // Skip if we already have a signer (contracts are already write-enabled)
    if (this.signer) {
      console.log('⏭️ Skipping read-only init - signer already connected');
      return;
    }
    
    const provider = this.getReadProvider();
    
    // Initialize AccountRegistry for read operations
    if (!this.contracts.accountRegistry) {
      this.contracts.accountRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
        ACCOUNT_REGISTRY_ABI,
        provider
      );
    }
    
    // Initialize KeyRegistry for read operations
    if (!this.contracts.keyRegistry) {
      this.contracts.keyRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.KEY_REGISTRY,
        KEY_REGISTRY_ABI,
        provider
      );
    }

    // Initialize MessageContract for read operations
    if (!this.contracts.messageContract) {
      this.contracts.messageContract = new ethers.Contract(
        CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
        MESSAGE_CONTRACT_ABI,
        provider
      );
    }
    
    console.log('✅ Read-only contracts initialized');
  }

  private async initializeContracts() {
    if (!this.signer) throw new Error('Signer not available');

    try {
      // Re-initialize contracts with signer for write operations
      this.contracts.accountRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
        ACCOUNT_REGISTRY_ABI,
        this.signer
      );
      
      // Initialize KeyRegistry
      this.contracts.keyRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.KEY_REGISTRY,
        KEY_REGISTRY_ABI,
        this.signer
      );

      // Initialize MessageContract (IPFS-based)
      this.contracts.messageContract = new ethers.Contract(
        CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
        MESSAGE_CONTRACT_ABI,
        this.signer
      );

    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw new Error(`Contract initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAddress(): Promise<string> {
    if (!this.signer) throw new Error('Not connected');
    return await this.signer.getAddress();
  }

  async getSigner(): Promise<ethers.JsonRpcSigner | null> {
    return this.signer;
  }

  getReadProvider(): ethers.JsonRpcProvider {
    if (!this.readProvider) {
      this.readProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.RPC_URL);
    }
    return this.readProvider;
  }

  getMessageContract(): ethers.Contract | null {
    return this.contracts.messageContract || null;
  }

  async registerKey(keyData: string, mailboxName?: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.keyRegistry) throw new Error('Contract not initialized');
    
    // Estimate gas and add 20% buffer
    const estimatedGas = mailboxName 
      ? await this.contracts.keyRegistry['registerKey(bytes,string)'].estimateGas(keyData, mailboxName)
      : await this.contracts.keyRegistry['registerKey(bytes)'].estimateGas(keyData);
    const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100);
    
    if (mailboxName) {
      return await this.contracts.keyRegistry['registerKey(bytes,string)'](keyData, mailboxName, { gasLimit });
    }
    return await this.contracts.keyRegistry['registerKey(bytes)'](keyData, { gasLimit });
  }

  async isKeyRegistered(address: string): Promise<boolean> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const keyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.KEY_REGISTRY,
      KEY_REGISTRY_ABI,
      provider
    );
    try {
      return await keyRegistry.isKeyRegistered(address);
    } catch (error) {
      console.error('Error checking key registration:', error);
      throw new Error('Failed to check key registration. Make sure you are connected to the correct network.');
    }
  }

  async getPublicKey(address: string, keyData: string): Promise<{publicKey: string, timestamp: bigint, isActive: boolean, mailboxName: string}> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const keyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.KEY_REGISTRY,
      KEY_REGISTRY_ABI,
      provider
    );
    // Contract returns the keyData back (validates hash exists)
    const result = await keyRegistry.getPublicKey(address, keyData);
    return {
      publicKey: result[0],  // Returns provided keyData (validated on-chain)
      timestamp: result[1],
      isActive: result[2],
      mailboxName: result[3]
    };
  }

  // Get public key from events (for when we only have address)
  async getPublicKeyFromEvents(address: string): Promise<string | null> {
    try {
      const provider = this.getReadProvider();
      const keyRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.KEY_REGISTRY,
        KEY_REGISTRY_ABI,
        provider
      );

      // Query KeyRegistered events for this user
      const filter = keyRegistry.filters.KeyRegistered(address);
      const events = await keyRegistry.queryFilter(filter);

      if (events.length === 0) return null;

      // Get the most recent key
      const latestEvent = events[events.length - 1];
      // Type guard to check if it's an EventLog
      if ('args' in latestEvent) {
        return latestEvent.args.keyData || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching public key from events:', error);
      return null;
    }
  }

  async hasKey(address: string, keyData: string): Promise<boolean> {
    const provider = this.getReadProvider();
    console.log('🔍 hasKey - Using KeyRegistry address:', CONTRACT_ADDRESSES.KEY_REGISTRY);
    console.log('🔍 hasKey - All CONTRACT_ADDRESSES:', CONTRACT_ADDRESSES);
    const keyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.KEY_REGISTRY,
      KEY_REGISTRY_ABI,
      provider
    );
    console.log('🔍 hasKey - Contract instance address:', await keyRegistry.getAddress());
    return await keyRegistry.hasKey(address, keyData);
  }

  async getAllKeys(address: string): Promise<string[]> {
    const provider = this.getReadProvider();
    const keyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.KEY_REGISTRY,
      KEY_REGISTRY_ABI,
      provider
    );
    return await keyRegistry.getAllKeys(address);
  }

  async getKeyCount(address: string): Promise<bigint> {
    const provider = this.getReadProvider();
    const keyRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.KEY_REGISTRY,
      KEY_REGISTRY_ABI,
      provider
    );
    return await keyRegistry.getKeyCount(address);
  }

  async getMessagesPaginated(offset: number, limit: number): Promise<{ messageIds: number[], total: number }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const result = await this.contracts.messageContract.getMessagesPaginated(offset, limit);
    return {
      messageIds: result.messageIds.map((id: bigint) => Number(id)),
      total: Number(result.total)
    };
  }
  
  async getMessagesBatch(messageIds: number[]): Promise<any[]> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const messages = await this.contracts.messageContract.getMessagesBatch(messageIds);
    return messages.map((msg: any) => ({
      messageId: Number(msg.messageId),
      threadId: msg.threadId,
      replyTo: Number(msg.replyTo),
      timestamp: Number(msg.timestamp),
      sender: msg.sender,
      recipient: msg.recipient,
      isRead: msg.isRead
    }));
  }

  async getMessage(messageId: number): Promise<{
    sender: string;
    recipient: string;
    encryptedContent: string;
    encryptedMetadata: string;
    senderEncryptedContent: string;
    senderEncryptedMetadata: string;
    timestamp: bigint;
    isRead: boolean;
    isArchived: boolean;
  }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    const result = await this.contracts.messageContract.getMessage(messageId);
    return {
      sender: result[0],
      recipient: result[1],
      encryptedContent: result[2],
      encryptedMetadata: result[3],
      senderEncryptedContent: result[4],
      senderEncryptedMetadata: result[5],
      timestamp: result[6],
      isRead: result[7],
      isArchived: result[8]
    };
  }

  async getReceivedMessages(address: string): Promise<any[]> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    // Get message IDs first
    const messageIds = await this.contracts.messageContract.getReceivedMessages(address);
    
    // Fetch full message data for each ID
    // Note: Transaction hashes are not included to avoid RPC limits from querying all events
    const messages = await Promise.all(
      messageIds.map(async (id: bigint) => {
        try {
          const messageData = await this.contracts.messageContract!.getMessage(id);
          return {
            id: id,
            sender: messageData[0],
            recipient: messageData[1], 
            encryptedContent: messageData[2],
            encryptedMetadata: messageData[3],
            senderEncryptedContent: messageData[4],
            senderEncryptedMetadata: messageData[5],
            timestamp: messageData[6],
            isRead: messageData[7],
            isArchived: messageData[8],
            txHash: undefined
          };
        } catch (error) {
          console.error(`Failed to fetch message ${id}:`, error);
          return null;
        }
      })
    );
    
    return messages.filter(msg => msg !== null);
  }

  async getUnreadCount(address: string): Promise<bigint> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    return await this.contracts.messageContract.getUnreadCount(address);
  }

  async markAsRead(messageId: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    return await this.contracts.messageContract.markAsRead(messageId);
  }

  async archiveMessage(messageId: number): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    return await this.contracts.messageContract.archiveMessage(messageId);
  }

  async getSentMessages(address: string): Promise<any[]> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    // Get message IDs first
    const messageIds = await this.contracts.messageContract.getSentMessages(address);
    
    // Fetch full message data for each ID
    const messages = await Promise.all(
      messageIds.map(async (id: bigint) => {
        try {
          const messageData = await this.contracts.messageContract!.getMessage(id);
          return {
            id: id,
            sender: messageData[0],
            recipient: messageData[1], 
            encryptedContent: messageData[2],
            encryptedMetadata: messageData[3],
            senderEncryptedContent: messageData[4],
            senderEncryptedMetadata: messageData[5],
            timestamp: messageData[6],
            isRead: messageData[7],
            isArchived: messageData[8],
            txHash: undefined
          };
        } catch (error) {
          console.error(`Failed to fetch message ${id}:`, error);
          return null;
        }
      })
    );
    
    return messages.filter(msg => msg !== null);
  }

  // MessageContract: Messages stored in IPFS, retrieved via ipfs/messaging
  // Removed old getMessagesPaginated - use new optimized version below

  // MessageContract methods (IPFS-based)
  async getUserMessages(address: string): Promise<{
    currentCID: string;
    lastUpdated: number;
    initialized: boolean;
  }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const result = await this.contracts.messageContract.getUserMessages(address);
    return {
      currentCID: result[0], // bytes32
      lastUpdated: Number(result[1]),
      initialized: result[2]
    };
  }

  async getUserCID(address: string): Promise<string> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    return await this.contracts.messageContract.getUserCID(address);
  }

  async initializeUserIPFS(
    userAddress: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    // No longer requires CID - thread-based storage
    return await this.contracts.messageContract.initializeUser(userAddress);
  }

  async recordMessage(
    sender: string,
    recipient: string,
    threadId: string,
    replyTo: number,
    threadCID: string, // bytes32 as hex string (0x...) - IPFS CID of thread file
    ackRequired: boolean = false, // Default to false (gas-free reading)
    senderPublicKeyHash: string, // bytes32 hash of sender's public key
    recipientPublicKeyHash: string // bytes32 hash of recipient's public key
  ): Promise<ethers.ContractTransactionResponse> {
    // Get fresh signer from browser wallet
    if (!window.ethereum) throw new Error('No wallet found');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    const messageContract = new ethers.Contract(
      CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
      MESSAGE_CONTRACT_ABI,
      signer
    );
    
    return await messageContract.recordMessage(
      sender,
      recipient,
      threadId,
      replyTo,
      threadCID,
      ackRequired,
      senderPublicKeyHash,
      recipientPublicKeyHash
    );
  }

  // Get thread IPFS CID from contract
  async getThreadCID(threadId: string): Promise<string> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    return await this.contracts.messageContract.getThreadCID(threadId);
  }

  async isAckRequired(threadId: string): Promise<boolean> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
      MESSAGE_CONTRACT_ABI,
      provider
    );
    return await contract.isAckRequired(threadId);
  }

  async isThreadTerminated(threadId: string): Promise<boolean> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
      MESSAGE_CONTRACT_ABI,
      provider
    );
    return await contract.isThreadTerminated(threadId);
  }

  async isSenderPermitted(recipient: string, sender: string): Promise<boolean> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(
      CONTRACT_ADDRESSES.MESSAGE_CONTRACT,
      MESSAGE_CONTRACT_ABI,
      provider
    );
    return await contract.isSenderPermitted(recipient, sender);
  }

  async getUserMessageCounts(address: string): Promise<{ sent: number, received: number }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const result = await this.contracts.messageContract.getUserMessageCounts(address);
    return {
      sent: Number(result.sent),
      received: Number(result.received)
    };
  }
  
  async markAsReadBatch(messageIds: number[]): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.markAsReadBatch(messageIds);
  }

  async getArchivedMessages(address: string): Promise<any[]> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const messageIds = await this.contracts.messageContract.getArchivedMessages(address);
    
    const messages = await Promise.all(
      messageIds.map(async (id: bigint) => {
        try {
          const messageData = await this.contracts.messageContract!.getMessage(id);
          return {
            id: id,
            sender: messageData[0],
            recipient: messageData[1], 
            encryptedContent: messageData[2],
            encryptedMetadata: messageData[3],
            senderEncryptedContent: messageData[4],
            senderEncryptedMetadata: messageData[5],
            timestamp: messageData[6],
            isRead: messageData[7],
            isArchived: messageData[8],
            txHash: undefined
          };
        } catch (error) {
          console.error(`Failed to fetch message ${id}:`, error);
          return null;
        }
      })
    );
    
    return messages.filter(msg => msg !== null);
  }

  async getMessageTransactionHash(messageId: number): Promise<string | null> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    try {
      // Limit query to recent blocks to avoid RPC limits
      const currentBlock = await this.provider!.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10k blocks
      
      const filter = this.contracts.messageContract.filters.MessageSent(messageId);
      const events = await this.contracts.messageContract.queryFilter(filter, fromBlock, 'latest');
      if (events.length > 0) {
        return events[0].transactionHash;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch transaction hash:', error);
      return null;
    }
  }


  // AccountRegistry methods - Bare Accounts (FREE)
  async registerAccount(publicKey: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    
    // Estimate gas and add 20% buffer
    const estimatedGas = await this.contracts.accountRegistry.registerAccount.estimateGas(publicKey);
    const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100);
    
    return await this.contracts.accountRegistry.registerAccount(publicKey, { gasLimit });
  }


  async hasAccount(address: string): Promise<boolean> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.hasAccount(address);
  }


  async getAccount(address: string, index: number = 0): Promise<{
    publicKey: string;
    createdAt: bigint;
    isActive: boolean;
    hasHashIDAttached: boolean;
    hashIDName: string;
    hashIDTokenId: bigint;
  }> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    const result = await this.contracts.accountRegistry.getAccount(address, index);
    return {
      publicKey: result[0],
      createdAt: result[1],
      isActive: result[2],
      hasHashIDAttached: result[3],
      hashIDName: result[4],
      hashIDTokenId: result[5]
    };
  }


  async getAccounts(address: string): Promise<Array<{
    publicKey: string;
    createdAt: bigint;
    isActive: boolean;
    hasHashIDAttached: boolean;
    hashIDName: string;
    hashIDTokenId: bigint;
  }>> {
    if (!this.contracts.accountRegistry) {
      throw new Error('AccountRegistry not initialized - call initializeReadOnlyContracts() first');
    }
    const result = await this.contracts.accountRegistry.getAccounts(address);
    return result.map((account: any) => ({
      publicKey: account[0],
      createdAt: account[1],
      isActive: account[2],
      hasHashIDAttached: account[3],
      hashIDName: account[4],
      hashIDTokenId: account[5]
    }));
  }


  async getAccountCount(address: string): Promise<number> {
    if (!this.contracts.accountRegistry) {
      throw new Error('AccountRegistry not initialized - call initializeReadOnlyContracts() first');
    }
    const count = await this.contracts.accountRegistry.getAccountCount(address);
    return Number(count);
  }


  async getPublicKeyByAddress(address: string): Promise<string> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.getPublicKeyByAddress(address);
  }

  async updateBareAccountKey(index: number, publicKey: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.updateBareAccountKey(index, publicKey);
  }

  // AccountRegistry methods - Named Accounts with HashID (PAID)
  async registerAccountWithHashID(name: string, domain: string, publicKey: string, feeInWei: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) {
      console.error('❌ AccountRegistry not initialized!');
      console.error('Signer:', !!this.signer);
      console.error('Provider:', !!this.provider);
      console.error('Contracts:', this.contracts);
      throw new Error('AccountRegistry not initialized. Please ensure wallet is connected.');
    }
    
    // Estimate gas and add 20% buffer (this will also validate the transaction)
    try {
      const estimatedGas = await this.contracts.accountRegistry.registerAccountWithHashID.estimateGas(name, domain, publicKey, { value: feeInWei });
      const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100); // 20% buffer
      console.log(`⛽ Gas estimate: ${estimatedGas.toString()}, using limit: ${gasLimit.toString()}`);
      
      return await this.contracts.accountRegistry.registerAccountWithHashID(name, domain, publicKey, { 
        value: feeInWei,
        gasLimit 
      });
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      // Try to get better error message
      let errorMessage = 'Failed to register account';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data) {
        // Try to decode error data
        try {
          const iface = this.contracts.accountRegistry.interface;
          const decodedError = iface.parseError(error.data);
          if (decodedError) {
            errorMessage = `Contract error: ${decodedError.name}`;
          }
        } catch (e) {
          console.error('Could not decode error:', e);
        }
      } else if (error.message) {
        if (error.message.includes('already taken') || error.message.includes('already exists')) {
          errorMessage = `Name ${name}.${domain} is already taken`;
        } else if (error.message.includes('Invalid name')) {
          errorMessage = 'Invalid name format: only lowercase letters, numbers, and underscores allowed';
        } else if (error.message.includes('Insufficient')) {
          errorMessage = 'Insufficient registration fee';
        } else if (error.message.includes('Domain not available')) {
          errorMessage = `Domain "${domain}" is not available`;
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  async getHashIDAccount(fullName: string): Promise<{
    publicKey: string;
    owner: string;
    timestamp: bigint;
    isActive: boolean;
  }> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    const result = await accountRegistry.getHashIDAccount(fullName);
    return {
      publicKey: result[0],
      owner: result[1],
      timestamp: result[2],
      isActive: result[3]
    };
  }

  async getPublicKeyByName(fullName: string): Promise<string> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.getPublicKeyByName(fullName);
  }

  async getNamedAccountInfo(fullName: string): Promise<{
    publicKey: string;
    owner: string;
    timestamp: number;
    isActive: boolean;
  }> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    const result = await accountRegistry.getNamedAccount(fullName);
    return {
      publicKey: result[0],
      owner: result[1],
      timestamp: Number(result[2]), // Convert BigInt to number (milliseconds)
      isActive: result[3]
    };
  }

  async isNameAvailable(name: string, domain: string): Promise<boolean> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.isNameAvailable(name, domain);
  }

  async getOwnerHashIDs(address: string): Promise<string[]> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.getOwnerHashIDs(address);
  }


  async getNameByPublicKey(publicKey: string): Promise<string | null> {
    // Use fast reverse mapping from contract
    try {
      const provider = this.getReadProvider();
      const keyRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.KEY_REGISTRY,
        KEY_REGISTRY_ABI,
        provider
      );

      const mailboxName = await keyRegistry.getMailboxNameByKey(publicKey);
      return mailboxName || null;
    } catch (error) {
      console.error('Error looking up account name by public key:', error);
      return null;
    }
  }

  async getPrimaryNamedAccount(address: string): Promise<string> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.getPrimaryNamedAccount(address);
  }

  async updateNamedAccountKey(fullName: string, publicKey: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.updateNamedAccountKey(fullName, publicKey);
  }

  // AccountRegistry - Domain Management
  async getAvailableDomains(): Promise<string[]> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.getAvailableDomains();
  }

  async getDomainFee(domain: string): Promise<bigint> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.domainFees(domain);
  }

  async calculateNameFee(name: string, domain: string): Promise<bigint> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.calculateNameFee(name, domain);
  }

  async isDomainAvailable(domain: string): Promise<boolean> {
    // Use fast read provider for this read-only operation
    const provider = this.getReadProvider();
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      provider
    );
    return await accountRegistry.availableDomains(domain);
  }

  // AccountRegistry - Owner Functions
  async addDomain(domain: string, feeInWei: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.addDomain(domain, feeInWei);
  }

  async setDomainFee(domain: string, newFeeInWei: bigint): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.setDomainFee(domain, newFeeInWei);
  }

  async withdrawFees(): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    return await this.contracts.accountRegistry.withdrawFees();
  }

  // Helper method to resolve recipient address (bare or named)
  async resolveRecipientPublicKey(recipient: string): Promise<string> {
    if (!this.contracts.accountRegistry) throw new Error('AccountRegistry not initialized');
    
    // Check if it's a named address (contains @)
    // Contract stores accounts as "name@domain" format
    if (recipient.includes('@')) {
      // Named account
      return await this.getPublicKeyByName(recipient);
    } else {
      // Bare address (wallet address)
      return await this.getPublicKeyByAddress(recipient);
    }
  }

  // GroupPosts - Pagination Methods
  async getPostsPaginated(groupPostsAddress: string, offset: number, limit: number): Promise<{ postIds: number[], total: number }> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    const result = await contract.getPostsPaginated(offset, limit);
    return {
      postIds: result.postIds.map((id: bigint) => Number(id)),
      total: Number(result.total)
    };
  }

  async getPostsBatch(groupPostsAddress: string, postIds: number[]): Promise<any[]> {
    // Return empty array immediately if no post IDs
    if (!postIds || postIds.length === 0) {
      console.log('ℹ️ No post IDs provided to getPostsBatch');
      return [];
    }
    
    const provider = this.getReadProvider(); // Use fast read provider
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    try {
      const posts = await contract.getPostsBatch(postIds);
      console.log('📖 Raw posts from contract:', posts);
      
      const mapped = posts.map((post: any, index: number) => ({
        id: postIds[index],
        author: post.author,
        ipfsHash: bytes32ToCid(post.ipfsHash), // Convert bytes32 back to CID string
        timestamp: Number(post.timestamp),
        upvotes: Number(post.upvotes),
        commentCount: Number(post.commentCount),
        accessLevel: Number(post.accessLevel),
        isDeleted: post.isDeleted
      }));
      
      console.log('📖 Mapped posts:', mapped);
      return mapped;
    } catch (error) {
      console.error('❌ Error in getPostsBatch:', error);
      console.error('Post IDs:', postIds);
      console.error('Contract address:', groupPostsAddress);
      throw error;
    }
  }

  async getPost(groupPostsAddress: string, postId: number): Promise<any> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    const post = await contract.getPost(postId);
    return {
      id: Number(post.id),
      ipfsHash: bytes32ToCid(post.ipfsHash), // Convert bytes32 back to CID string
      timestamp: Number(post.timestamp),
      upvotes: Number(post.upvotes),
      commentCount: Number(post.commentCount),
      author: post.author,
      accessLevel: Number(post.accessLevel),
      isDeleted: post.isDeleted
    };
  }

  async getPostCommentCount(groupPostsAddress: string, postId: number): Promise<number> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    const count = await contract.getPostCommentCount(postId);
    return Number(count);
  }
  
  async getUserPostCount(groupPostsAddress: string, author: string): Promise<number> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    const count = await contract.getUserPostCount(author);
    return Number(count);
  }

  async hasUpvotedPost(groupPostsAddress: string, userAddress: string, postId: number): Promise<boolean> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    return await contract.hasUpvotedPost(userAddress, postId);
  }

  async batchHasUpvotedPost(groupPostsAddress: string, userAddress: string, postIds: number[]): Promise<boolean[]> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    return await contract.batchHasUpvotedPost(userAddress, postIds);
  }

  async getCommentsBatch(groupPostsAddress: string, commentIds: number[]): Promise<any[]> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    const comments = await contract.getCommentsBatch(commentIds);
    
    return comments.map((comment: any, index: number) => ({
      id: commentIds[index],
      postId: Number(comment.postId),
      author: comment.author,
      ipfsHash: bytes32ToCid(comment.ipfsHash), // Convert bytes32 back to CID string
      timestamp: Number(comment.timestamp),
      upvotes: Number(comment.upvotes),
      isDeleted: comment.isDeleted
    }));
  }

  async batchHasUpvotedComment(groupPostsAddress: string, userAddress: string, commentIds: number[]): Promise<boolean[]> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, provider);
    
    return await contract.batchHasUpvotedComment(userAddress, commentIds);
  }

  // GroupPosts - Write Methods
  async createPost(groupPostsAddress: string, ipfsHash: string, accessLevel: number): Promise<ethers.ContractTransactionResponse> {
    console.log('📝 Creating post with CID:', ipfsHash, 'Access Level:', accessLevel);
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    // Convert CID string to bytes32
    const bytes32Hash = cidToBytes32(ipfsHash);
    console.log('📝 Converted to bytes32:', bytes32Hash);
    
    const tx = await contract.createPost(bytes32Hash, accessLevel);
    console.log('✅ Post creation tx:', tx.hash);
    return tx;
  }

  async upvotePost(groupPostsAddress: string, postId: number): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    return await contract.upvotePost(postId);
  }

  async downvotePost(groupPostsAddress: string, postId: number): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    return await contract.downvotePost(postId);
  }

  async downvoteComment(groupPostsAddress: string, commentId: number): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    return await contract.downvoteComment(commentId);
  }

  async deletePost(groupPostsAddress: string, postId: number): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    return await contract.deletePost(postId);
  }

  async addComment(groupPostsAddress: string, postId: number, ipfsHash: string): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    // Convert CID string to bytes32
    const bytes32Hash = cidToBytes32(ipfsHash);
    
    return await contract.addComment(postId, bytes32Hash);
  }

  async upvoteComment(groupPostsAddress: string, commentId: number): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(groupPostsAddress, GROUP_POSTS_ABI, signer);
    
    return await contract.upvoteComment(commentId);
  }

  // ============================================
  // BONDING CURVE METHODS
  // ============================================

  // Bonding Curve - View Methods
  async getBondingCurveStats(bondingCurveAddress: string) {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    
    const stats = await contract.getPoolStats();
    return {
      price: stats[0].toString(),
      supply: stats[1].toString(),
      poolBalance: ethers.formatEther(stats[2]),
      volume: ethers.formatEther(stats[3]),
      holders: stats[4].toString(),
      buys: stats[5].toString(),
      sells: stats[6].toString(),
      graduated: stats[7]
    };
  }

  async canGraduate(bondingCurveAddress: string): Promise<boolean> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    return await contract.canGraduate();
  }

  async getBuyPrice(bondingCurveAddress: string, tokenAmount: string): Promise<string> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    const price = await contract.getBuyPrice(tokenAmount);
    return price.toString();
  }

  async getSellPrice(bondingCurveAddress: string, tokenAmount: string): Promise<string> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    const price = await contract.getSellPrice(tokenAmount);
    return price.toString();
  }

  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<string> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return ethers.formatUnits(balance, 18);
  }

  // Bonding Curve - Write Methods
  async buyTokens(bondingCurveAddress: string, minTokens: string, ethAmount: string): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);
    
    const tx = await contract.buy(minTokens, { value: ethAmount });
    await tx.wait();
    return tx;
  }

  async sellTokens(bondingCurveAddress: string, tokenAmount: string, minETH: string): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);
    
    // First approve the bonding curve to spend tokens
    const tokenAddress = await contract.token();
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const approveTx = await tokenContract.approve(bondingCurveAddress, tokenAmount);
    await approveTx.wait();
    
    // Then sell
    const tx = await contract.sell(tokenAmount, minETH);
    await tx.wait();
    return tx;
  }

  async initiateGraduation(bondingCurveAddress: string): Promise<ethers.ContractTransactionResponse> {
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, signer);
    
    const tx = await contract.initiateGraduation();
    await tx.wait();
    return tx;
  }

  // Get bonding curve events for chart
  async getBondingCurveEvents(bondingCurveAddress: string): Promise<any[]> {
    const provider = this.getReadProvider();
    const contract = new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, provider);
    
    try {
      // Get TokensPurchased events
      const buyFilter = contract.filters.TokensPurchased();
      const buyEvents = await contract.queryFilter(buyFilter, -10000); // Last ~10k blocks
      
      // Get TokensSold events
      const sellFilter = contract.filters.TokensSold();
      const sellEvents = await contract.queryFilter(sellFilter, -10000);
      
      // Combine and sort by block number
      const allEvents = [
        ...buyEvents.map((e: any) => ({
          type: 'buy',
          timestamp: Date.now() / 1000, // Approximate - would need block timestamp
          price: e.args.newPrice.toString(),
          ethAmount: e.args.ethAmount.toString(),
          tokenAmount: e.args.tokenAmount.toString(),
        })),
        ...sellEvents.map((e: any) => ({
          type: 'sell',
          timestamp: Date.now() / 1000,
          price: e.args.newPrice.toString(),
          ethAmount: e.args.ethAmount.toString(),
          tokenAmount: e.args.tokenAmount.toString(),
        }))
      ];
      
      return allEvents;
    } catch (err) {
      console.error('Error fetching bonding curve events:', err);
      return [];
    }
  }

  // ============================================
  // READ RECEIPT METHODS
  // ============================================

  /**
   * Mark thread as read up to a specific message index (batch read)
   */
  async markThreadAsRead(
    threadId: string,
    messageIndex: number
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.markThreadAsRead(threadId, messageIndex);
  }

  /**
   * Get read status for a participant in a thread
   */
  async getReadStatus(
    threadId: string,
    participant: string
  ): Promise<{
    lastReadIndex: number;
    totalMessages: number;
    unreadCount: number;
    joinedAtIndex: number;
  }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const [lastReadIndex, totalMessages, unreadCount, joinedAtIndex] = 
      await this.contracts.messageContract.getReadStatus(threadId, participant);
    
    return {
      lastReadIndex: Number(lastReadIndex),
      totalMessages: Number(totalMessages),
      unreadCount: Number(unreadCount),
      joinedAtIndex: Number(joinedAtIndex)
    };
  }

  /**
   * Batch get read status for multiple threads
   */
  async batchGetReadStatus(
    threadIds: string[],
    participant: string
  ): Promise<Map<string, {
    lastReadIndex: number;
    totalMessages: number;
    unreadCount: number;
    joinedAtIndex: number;
  }>> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const [lastReadIndexes, totalMessages, unreadCounts, joinedAtIndexes] = 
      await this.contracts.messageContract.batchGetReadStatus(threadIds, participant);
    
    const statusMap = new Map();
    
    for (let i = 0; i < threadIds.length; i++) {
      statusMap.set(threadIds[i], {
        lastReadIndex: Number(lastReadIndexes[i]),
        totalMessages: Number(totalMessages[i]),
        unreadCount: Number(unreadCounts[i]),
        joinedAtIndex: Number(joinedAtIndexes[i])
      });
    }
    
    return statusMap;
  }

  /**
   * Check if a participant can read a specific message
   */
  async canReadMessage(
    threadId: string,
    participant: string,
    messageIndex: number
  ): Promise<boolean> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.canReadMessage(threadId, participant, messageIndex);
  }

  /**
   * Add a participant to a thread (they can only read messages from this point forward)
   */
  async addParticipantToThread(
    threadId: string,
    participant: string
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.addParticipantToThread(threadId, participant);
  }

  // ============================================
  // Thread Termination Methods
  // ============================================

  /**
   * Get the thread creator (who sent the first message)
   */
  async getThreadCreator(threadId: string): Promise<string> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.getThreadCreator(threadId);
  }

  /**
   * Check if current user can terminate this thread
   */
  async canTerminateThread(threadId: string, userAddress: string): Promise<boolean> {
    try {
      const creator = await this.getThreadCreator(threadId);
      return creator.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('Error checking thread termination permission:', error);
      return false;
    }
  }

  /**
   * Terminate a thread (only creator can do this)
   */
  async terminateThread(threadId: string): Promise<ethers.ContractTransactionResponse> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    return await this.contracts.messageContract.terminateThread(threadId);
  }

  /**
   * Get thread termination info
   */
  async getThreadTerminationInfo(threadId: string): Promise<{
    terminated: boolean;
    terminatedAt: bigint;
    terminatedBy: string;
  }> {
    if (!this.contracts.messageContract) throw new Error('Contract not initialized');
    
    const info = await this.contracts.messageContract.getThreadTerminationInfo(threadId);
    return {
      terminated: info.terminated,
      terminatedAt: info.terminatedAt,
      terminatedBy: info.terminatedBy
    };
  }

  // ============================================
  // HASHDTAG NFT METHODS
  // ============================================

  /**
   * Get all HashID NFTs owned by an address
   */
  async getHashIDNFTs(ownerAddress: string): Promise<Array<{
    tokenId: string;
    fullName: string;
    domain: string;
    tokenURI: string;
  }>> {
    try {
      const provider = this.getReadProvider();
      const hashID = new ethers.Contract(
        CONTRACT_ADDRESSES.HASHD_TAG,
        HASHD_ID_ABI,
        provider
      );

      // Get all HashIDs for this address
      const hashIDs = await this.getOwnerHashIDs(ownerAddress);
      
      const nfts = [];
      
      for (const fullName of hashIDs) {
        try {
          // Generate token ID from full name (same as contract does)
          const tokenId = ethers.keccak256(ethers.toUtf8Bytes(fullName));
          
          // Verify this address owns the NFT
          const owner = await hashID.ownerOf(tokenId);
          
          if (owner.toLowerCase() === ownerAddress.toLowerCase()) {
            // Get token URI (contains metadata)
            const tokenURI = await hashID.tokenURI(tokenId);
            
            // Get domain
            const domain = await hashID.tokenIdToDomain(tokenId);
            
            nfts.push({
              tokenId,
              fullName,
              domain,
              tokenURI
            });
          }
        } catch (error) {
          console.warn(`Could not fetch NFT for ${fullName}:`, error);
        }
      }
      
      return nfts;
    } catch (error) {
      console.error('Error fetching HashID NFTs:', error);
      return [];
    }
  }

  /**
   * Get HashID NFT balance for an address
   */
  async getHashIDBalance(ownerAddress: string): Promise<number> {
    try {
      const provider = this.getReadProvider();
      const hashID = new ethers.Contract(
        CONTRACT_ADDRESSES.HASHD_TAG,
        HASHD_ID_ABI,
        provider
      );
      
      const balance = await hashID.balanceOf(ownerAddress);
      return Number(balance);
    } catch (error) {
      console.error('Error fetching HashID balance:', error);
      return 0;
    }
  }

  /**
   * Get HashID NFT metadata by token ID
   */
  async getHashIDMetadata(tokenId: string): Promise<{
    fullName: string;
    domain: string;
    tokenURI: string;
  } | null> {
    try {
      const provider = this.getReadProvider();
      const hashID = new ethers.Contract(
        CONTRACT_ADDRESSES.HASHD_TAG,
        HASHD_ID_ABI,
        provider
      );
      
      const fullName = await hashID.tokenIdToName(tokenId);
      const domain = await hashID.tokenIdToDomain(tokenId);
      const tokenURI = await hashID.tokenURI(tokenId);
      
      return {
        fullName,
        domain,
        tokenURI
      };
    } catch (error) {
      console.error('Error fetching HashID metadata:', error);
      return null;
    }
  }

  /**
   * Check if a HashID is attached to an account
   */
  async isHashIDAttached(fullName: string): Promise<boolean> {
    try {
      const provider = this.getReadProvider();
      const accountRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
        ACCOUNT_REGISTRY_ABI,
        provider
      );
      
      return await accountRegistry.isHashIDAttached(fullName);
    } catch (error) {
      console.error('Error checking HashID attachment:', error);
      return false;
    }
  }

  /**
   * Detach a HashID from an account
   */
  async detachHashID(fullName: string): Promise<ethers.ContractTransactionResponse> {
    // Ensure we have a signer - try to get it if not available
    if (!this.signer) {
      console.log('🔄 Signer not available, attempting to reconnect...');
      const connected = await this.connect();
      if (!connected || !this.signer) {
        throw new Error('Failed to connect wallet. Please ensure MetaMask is connected and try again.');
      }
    }
    
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      this.signer
    );
    
    return await accountRegistry.detachHashID(fullName);
  }

  /**
   * Attach a HashID to a bare account
   */
  async attachHashID(fullName: string, bareAccountPublicKey: string): Promise<ethers.ContractTransactionResponse> {
    // Ensure we have a signer - try to get it if not available
    if (!this.signer) {
      console.log('🔄 Signer not available, attempting to reconnect...');
      const connected = await this.connect();
      if (!connected || !this.signer) {
        throw new Error('Failed to connect wallet. Please ensure MetaMask is connected and try again.');
      }
    }
    
    const accountRegistry = new ethers.Contract(
      CONTRACT_ADDRESSES.ACCOUNT_REGISTRY,
      ACCOUNT_REGISTRY_ABI,
      this.signer
    );
    
    return await accountRegistry.attachHashID(fullName, bareAccountPublicKey);
  }

  /**
   * Transfer a HashID NFT to another address
   */
  async transferHashID(fromAddress: string, toAddress: string, tokenId: string): Promise<ethers.ContractTransactionResponse> {
    // Ensure we have a signer - try to get it if not available
    if (!this.signer) {
      console.log('🔄 Signer not available, attempting to reconnect...');
      const connected = await this.connect();
      if (!connected || !this.signer) {
        throw new Error('Failed to connect wallet. Please ensure MetaMask is connected and try again.');
      }
    }
    
    const hashID = new ethers.Contract(
      CONTRACT_ADDRESSES.HASHD_TAG,
      HASHD_ID_ABI,
      this.signer
    );
    
    return await hashID.transferFrom(fromAddress, toAddress, tokenId);
  }
}

export const contractService = new ContractService();

/**
 * Fetch vault nodes from on-chain registry
 * Returns array of node URLs
 */
export async function getVaultNodesFromRegistry(): Promise<{ nodeId: string; url: string; active: boolean }[]> {
  const registryAddress = CONTRACT_ADDRESSES.VAULT_NODE_REGISTRY;
  
  console.log('🔍 getVaultNodesFromRegistry called');
  console.log('  Registry address:', registryAddress);
  console.log('  RPC URL:', NETWORK_CONFIG.RPC_URL);
  
  if (!registryAddress) {
    console.warn('VAULT_NODE_REGISTRY address not configured');
    return [];
  }
  
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.RPC_URL);
    const registry = new ethers.Contract(registryAddress, VAULT_NODE_REGISTRY_ABI, provider);
    
    // Get all active node IDs
    console.log('  Calling getActiveNodes()...');
    const nodeIds: string[] = await registry.getActiveNodes();
    console.log('  Found node IDs:', nodeIds.length, nodeIds);
    
    // Fetch node details for each
    const nodes = await Promise.all(
      nodeIds.map(async (nodeId: string) => {
        try {
          const node = await registry.getNode(nodeId);
          console.log('  Node details for', nodeId.slice(0, 10) + '...:', node.url, 'active:', node.active);
          return {
            nodeId,
            url: node.url,
            active: node.active
          };
        } catch (err) {
          console.warn('  Failed to get node:', nodeId, err);
          return null;
        }
      })
    );
    
    const activeNodes = nodes.filter((n): n is { nodeId: string; url: string; active: boolean } => n !== null && n.active);
    console.log('  Returning', activeNodes.length, 'active nodes');
    return activeNodes;
  } catch (error) {
    console.warn('Failed to fetch vault nodes from registry:', error);
    return [];
  }
}

// Debug function to check contract status
export const debugContractStatus = () => {
  console.log('=== Contract Debug Info ===');
  console.log('Network Config:', NETWORK_CONFIG);
  console.log('Contract Addresses:', CONTRACT_ADDRESSES);
  console.log('Contract Status:', {
    provider: !!contractService['provider'],
    signer: !!contractService['signer'],
    contracts: {
      accountRegistry: !!contractService['contracts'].accountRegistry,
      keyRegistry: !!contractService['contracts'].keyRegistry,
      messageContract: !!contractService['contracts'].messageContract
    }
  });
};
