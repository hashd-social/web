/**
 * Frontend Deployment Verification
 * Calculates hash of loaded JavaScript and verifies against DeploymentRegistry
 */

import { ethers } from 'ethers';

const DEPLOYMENT_REGISTRY_ABI = [
  "function isApproved(bytes32 codeHash) external view returns (bool)",
  "function getDeployment(bytes32 codeHash) external view returns (bytes32, string, string, string, address, uint256, uint256, bool, bool, string)",
  "function approvers(address) external view returns (bool)",
  "function requiredApprovals() external view returns (uint256)"
];

export interface DeploymentInfo {
  codeHash: string;
  version: string;
  ipfsCID: string;
  githubCommit: string;
  submitter: string;
  timestamp: number;
  approvalCount: number;
  isOfficial: boolean;
  isRejected: boolean;
  description: string;
}

export interface VerificationResult {
  isApproved: boolean;
  isOfficial: boolean;
  isRejected: boolean;
  codeHash: string;
  deploymentInfo?: DeploymentInfo;
  error?: string;
}

/**
 * Calculate SHA-256 hash of the main JavaScript bundle
 */
export const calculateDeploymentHash = async (): Promise<string> => {
  try {
    // Find the main React bundle script
    const scriptTags = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
    const mainScript = scriptTags.find(script => 
      script.src.includes('/static/js/main.') || 
      script.src.includes('main.') ||
      script.src.includes('bundle.')
    );

    if (!mainScript) {
      console.warn('⚠️ Main script not found, using fallback');
      // Fallback: use first script with /static/js/
      const fallback = scriptTags.find(s => s.src.includes('/static/js/'));
      if (!fallback) {
        throw new Error('No suitable script found for hashing');
      }
      return await hashScript(fallback.src);
    }

    return await hashScript(mainScript.src);
  } catch (error) {
    console.error('Failed to calculate deployment hash:', error);
    throw error;
  }
};

/**
 * Hash a script file
 */
const hashScript = async (scriptUrl: string): Promise<string> => {
  try {
    console.log('📊 Hashing script:', scriptUrl);
    
    const response = await fetch(scriptUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch script: ${response.statusText}`);
    }
    
    const code = await response.text();
    console.log(`📏 Script size: ${(code.length / 1024).toFixed(2)} KB`);
    
    // Calculate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string with 0x prefix
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    console.log('🔐 Deployment hash:', hashHex);
    return hashHex;
  } catch (error) {
    console.error('Failed to hash script:', error);
    throw error;
  }
};

/**
 * Verify deployment against on-chain registry
 */
export const verifyDeployment = async (
  provider: ethers.Provider,
  registryAddress: string
): Promise<VerificationResult> => {
  try {
    console.log('🔍 Verifying deployment...');
    
    // Calculate hash of current deployment
    const codeHash = await calculateDeploymentHash();
    
    // Connect to registry contract
    const registry = new ethers.Contract(
      registryAddress,
      DEPLOYMENT_REGISTRY_ABI,
      provider
    );
    
    // Check if approved
    const isApproved = await registry.isApproved(codeHash);
    console.log('✅ Approved:', isApproved);
    
    // Get deployment info
    const deployment = await registry.getDeployment(codeHash);
    
    const deploymentInfo: DeploymentInfo = {
      codeHash: deployment[0],
      version: deployment[1],
      ipfsCID: deployment[2],
      githubCommit: deployment[3],
      submitter: deployment[4],
      timestamp: Number(deployment[5]),
      approvalCount: Number(deployment[6]),
      isOfficial: deployment[7],
      isRejected: deployment[8],
      description: deployment[9]
    };
    
    // Check if this is a known deployment (has submitter)
    const isKnownDeployment = deploymentInfo.submitter !== ethers.ZeroAddress;
    
    if (!isKnownDeployment) {
      console.warn('⚠️ Unknown deployment - not in registry');
      return {
        isApproved: false,
        isOfficial: false,
        isRejected: false,
        codeHash,
        error: 'Deployment not found in registry'
      };
    }
    
    console.log('📦 Deployment info:', deploymentInfo);
    
    return {
      isApproved,
      isOfficial: deploymentInfo.isOfficial,
      isRejected: deploymentInfo.isRejected,
      codeHash,
      deploymentInfo
    };
  } catch (error) {
    console.error('Verification failed:', error);
    return {
      isApproved: false,
      isOfficial: false,
      isRejected: false,
      codeHash: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get user-friendly status message
 */
export const getVerificationMessage = (result: VerificationResult): string => {
  if (result.error) {
    return `⚠️ Verification Error: ${result.error}`;
  }
  
  if (result.isRejected) {
    return '❌ REJECTED DEPLOYMENT - This deployment has been marked as malicious!';
  }
  
  if (result.isOfficial) {
    return '✅ Official HASHD Deployment';
  }
  
  if (result.isApproved) {
    return '✅ Community Approved Deployment';
  }
  
  return '⚠️ Unverified Deployment - Not approved by the community';
};

/**
 * Should we block the app from running?
 */
export const shouldBlockApp = (result: VerificationResult): boolean => {
  // Block if rejected
  if (result.isRejected) return true;
  
  // Block if not approved (unless in development)
  if (!result.isApproved && process.env.NODE_ENV === 'production') {
    return true;
  }
  
  return false;
};
