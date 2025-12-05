import { ethers } from 'ethers';

export interface AirdropRecipient {
  address: string;
  amount: string; // In token units (not wei)
}

export interface MerkleTreeData {
  merkleRoot: string;
  proofs: { [address: string]: string[] };
  recipients: AirdropRecipient[];
}

/**
 * Generate merkle tree for token distribution
 */
export function generateMerkleTree(recipients: AirdropRecipient[]): MerkleTreeData {
  // Create leaves: keccak256(abi.encodePacked(address, amount))
  const leaves = recipients.map(r => {
    const amountWei = ethers.parseEther(r.amount);
    return ethers.solidityPackedKeccak256(
      ['address', 'uint256'],
      [r.address, amountWei]
    );
  });

  // Build merkle tree
  const tree = buildMerkleTree(leaves);
  const merkleRoot = tree[tree.length - 1][0];

  // Generate proofs for each address
  const proofs: { [address: string]: string[] } = {};
  recipients.forEach((recipient, index) => {
    proofs[recipient.address.toLowerCase()] = getMerkleProof(leaves, index);
  });

  return {
    merkleRoot,
    proofs,
    recipients
  };
}

/**
 * Build merkle tree from leaves
 */
function buildMerkleTree(leaves: string[]): string[][] {
  if (leaves.length === 0) {
    throw new Error('Cannot build tree with no leaves');
  }

  const tree: string[][] = [leaves];
  
  while (tree[tree.length - 1].length > 1) {
    const currentLevel = tree[tree.length - 1];
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Pair exists
        const [left, right] = sortPair(currentLevel[i], currentLevel[i + 1]);
        nextLevel.push(ethers.keccak256(ethers.concat([left, right])));
      } else {
        // Odd number, promote the last element
        nextLevel.push(currentLevel[i]);
      }
    }
    
    tree.push(nextLevel);
  }
  
  return tree;
}

/**
 * Get merkle proof for a leaf at given index
 */
function getMerkleProof(leaves: string[], index: number): string[] {
  const tree = buildMerkleTree(leaves);
  const proof: string[] = [];
  let currentIndex = index;
  
  for (let level = 0; level < tree.length - 1; level++) {
    const currentLevel = tree[level];
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
    
    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    }
    
    currentIndex = Math.floor(currentIndex / 2);
  }
  
  return proof;
}

/**
 * Sort pair of hashes (required for merkle tree)
 */
function sortPair(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

/**
 * Verify merkle proof
 */
export function verifyMerkleProof(
  proof: string[],
  root: string,
  leaf: string
): boolean {
  let computedHash = leaf;
  
  for (const proofElement of proof) {
    const [left, right] = sortPair(computedHash, proofElement);
    computedHash = ethers.keccak256(ethers.concat([left, right]));
  }
  
  return computedHash.toLowerCase() === root.toLowerCase();
}

/**
 * Calculate distribution amounts with bonding curve
 * Note: Platform fee (1%) is handled automatically by GroupFactory contract
 */
export function calculateDistribution(
  totalSupply: string,
  ownerPercentage: number, // 0-10
  bondingCurvePercentage: number, // 0-60
  recipientAddresses: string[]
): AirdropRecipient[] {
  const total = parseFloat(totalSupply);
  
  // Validate percentages
  if (ownerPercentage < 0 || ownerPercentage > 10) {
    throw new Error('Owner percentage must be between 0 and 10');
  }
  if (bondingCurvePercentage < 0 || bondingCurvePercentage > 60) {
    throw new Error('Bonding curve percentage must be between 0 and 60');
  }
  
  // Calculate amounts
  const ownerAmount = (total * ownerPercentage) / 100;
  const platformAmount = (total * 1) / 100; // 1% for platform (fixed)
  const bondingCurveAmount = (total * bondingCurvePercentage) / 100;
  const airdropAmount = total - ownerAmount - platformAmount - bondingCurveAmount;
  
  // Validate minimum airdrop (30%)
  if ((airdropAmount / total) * 100 < 30) {
    throw new Error('Airdrop must be at least 30% of total supply');
  }
  
  // Split airdrop among recipients
  const amountPerRecipient = airdropAmount / recipientAddresses.length;
  
  const recipients: AirdropRecipient[] = [];
  
  // Add recipients (platform allocation is handled by contract)
  recipientAddresses.forEach(address => {
    recipients.push({
      address: address.trim(),
      amount: amountPerRecipient.toFixed(18)
    });
  });
  
  return recipients;
}

/**
 * Get distribution summary
 */
export function getDistributionSummary(
  totalSupply: string,
  ownerPercentage: number,
  bondingCurvePercentage: number,
  recipientCount: number
) {
  const total = parseFloat(totalSupply);
  const ownerAmount = (total * ownerPercentage) / 100;
  const platformAmount = (total * 1) / 100;
  const bondingCurveAmount = (total * bondingCurvePercentage) / 100;
  const airdropAmount = total - ownerAmount - platformAmount - bondingCurveAmount;
  const amountPerRecipient = recipientCount > 0 ? airdropAmount / recipientCount : 0;
  
  return {
    owner: ownerAmount,
    platform: platformAmount,
    bondingCurve: bondingCurveAmount,
    airdrop: airdropAmount,
    perRecipient: amountPerRecipient,
    airdropPercentage: (airdropAmount / total) * 100
  };
}
