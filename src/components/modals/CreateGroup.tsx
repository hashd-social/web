
import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import { Users, Coins, Award, Info, CheckCircle } from 'lucide-react';
import { NeonModal } from './NeonModal';
import { MatrixNotify } from '../MatrixNotify';
import { Stepper, Step } from '../Stepper';
import { ImageUpload } from '../ImageUpload';
import { GROUP_FACTORY_ABI, cidToBytes32 } from '../../utils/contracts';
import { useByteCaveContext } from '@gethashd/bytecave-browser';
import { useCurrentHashId } from '../../hooks/useCurrentHashId';
import { calculateCID } from '../../utils/cid-calculator';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';

interface CreateGroupProps {
  onGroupCreated?: () => void;
  onClose?: () => void;
  isOpen: boolean;
  userAddress: string | null;
}

export const CreateGroup: React.FC<CreateGroupProps> = ({ onGroupCreated, onClose, isOpen, userAddress }) => {
  const { store, registerContent, isConnected, connect, connectionState, peers } = useByteCaveContext();
  const { hashIdToken, hashIdName, loading: hashIdLoading, error: hashIdError } = useCurrentHashId(userAddress);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    avatarFile: null as File | null,
    headerFile: null as File | null,
    tokenName: '',
    tokenSymbol: '',
    nftName: '',
    nftSymbol: '',
    nftPrice: '0.001',
    maxNFTs: '100'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ tokenAddr: string; nftAddr: string } | null>(null);
  const isSubmittingRef = useRef(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset after a short delay to avoid visual glitches
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setFormData({
          title: '',
          description: '',
          avatarFile: null,
          headerFile: null,
          tokenName: '',
          tokenSymbol: '',
          nftName: '',
          nftSymbol: '',
          nftPrice: '0.001',
          maxNFTs: '100'
        });
        setError('');
        setSuccess(null);
        isSubmittingRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validation for each step
  const canProgressFromStep = (step: number): boolean => {
    switch (step) {
      case 0: // Guild Info
        return !!(formData.title && formData.description && formData.avatarFile);
      case 1: // Token
        return !!(formData.tokenName && formData.tokenSymbol);
      case 2: // NFT
        return !!(formData.nftName && formData.nftSymbol && formData.nftPrice && formData.maxNFTs);
      case 3: // Review - always can proceed
        return true;
      default:
        return false;
    }
  };

  const handleComplete = async () => {
    // Prevent double submission with both state and ref
    if (isCreating || isSubmittingRef.current) {
      console.log('Transaction already in progress, ignoring duplicate submission');
      return;
    }
    
    isSubmittingRef.current = true;
    
    setError('');
    setSuccess(null);
    setIsCreating(true);

    try {
      if (!GROUP_FACTORY_ADDRESS) {
        throw new Error('GroupFactory address not configured. Please restart the development server.');
      }

      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      if (!formData.avatarFile) {
        throw new Error('Please select an avatar image for the guild');
      }

      // Ensure ByteCave is connected
      if (!isConnected || connectionState !== 'connected') {
        console.log('ByteCave not connected, attempting to connect...');
        console.log('Connection state:', connectionState, 'Peers:', peers.length);
        
        try {
          await connect();
          // Wait a moment for peers to be discovered
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (connectError: any) {
          throw new Error(`Failed to connect to ByteCave: ${connectError.message}`);
        }
      }

      // Verify we have storage peers
      if (peers.length === 0) {
        throw new Error('No storage peers available. Please ensure ByteCave nodes are running and connected to the relay.');
      }

      // Check if we have a HashID token
      if (!hashIdToken) {
        throw new Error(hashIdError || 'No HashID found for current mailbox. Please create or switch to a mailbox with a HashID.');
      }
      
      console.log('Using HashID token:', hashIdToken, 'Name:', hashIdName);
      
      // Get signer for both upload authorization and contract interaction
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // STEP 1: Calculate CIDs from avatar and header images (before uploading)
      console.log('🔍 Step 1: Calculating CIDs from image data...');
      const avatarData = new Uint8Array(await formData.avatarFile.arrayBuffer());
      const avatarCID = await calculateCID(avatarData);
      console.log('✅ Avatar CID calculated:', avatarCID);
      
      let headerCID = avatarCID; // Default to avatar if no header
      let headerData = avatarData;
      if (formData.headerFile) {
        headerData = new Uint8Array(await formData.headerFile.arrayBuffer());
        headerCID = await calculateCID(headerData);
        console.log('✅ Header CID calculated:', headerCID);
      } else {
        console.log('ℹ️ No header file provided, using avatar for both');
      }

      // STEP 2: Verify user owns the HashID token
      console.log('🔍 Step 2: Verifying HashID ownership...');
      const userAddr = await signer.getAddress();
      console.log('User Address:', userAddr);
      console.log('HashID Token (string):', hashIdToken);
      console.log('HashID Name:', hashIdName);
      
      // Verify ownership using HashID contract
      try {
        const hashIdAddress = process.env.REACT_APP_HASHID;
        if (!hashIdAddress) {
          console.warn('⚠️ HashID contract address not configured, skipping ownership verification');
        } else {
          const hashIdContract = new ethers.Contract(
            hashIdAddress,
            ['function ownerOf(uint256 tokenId) view returns (address)'],
            provider
          );
          
          const owner = await hashIdContract.ownerOf(hashIdToken);
          console.log('HashID Token Owner:', owner);
          
          if (owner.toLowerCase() !== userAddr.toLowerCase()) {
            throw new Error(`You don't own HashID token ${hashIdToken}. Owner is ${owner}`);
          }
          
          console.log('✅ HashID ownership verified');
        }
      } catch (err: any) {
        console.error('HashID ownership verification failed:', err);
        throw new Error(`HashID verification failed: ${err.message}`);
      }
      
      // STEP 3: Check ContentRegistry configuration
      console.log('🔍 Step 3: Checking ContentRegistry configuration...');
      
      // Check ContentRegistry configuration before attempting registration
      try {
        const contentRegistryAddress = process.env.REACT_APP_CONTENT_REGISTRY;
        if (contentRegistryAddress) {
          const contentRegistry = new ethers.Contract(
            contentRegistryAddress,
            [
              'function hashIdContract() view returns (address)',
              'function contentStorage() view returns (address)'
            ],
            provider
          );
          
          const hashIdContractAddr = await contentRegistry.hashIdContract();
          const contentStorageAddr = await contentRegistry.contentStorage();
          
          console.log('ContentRegistry configuration:');
          console.log('  HashID Contract:', hashIdContractAddr);
          console.log('  Content Storage:', contentStorageAddr);
          
          if (hashIdContractAddr === ethers.ZeroAddress) {
            throw new Error('ContentRegistry has not been initialized with HashID contract address. Please run the deployment setup script.');
          }
          console.log('✅ ContentRegistry configuration verified');
        }
      } catch (err: any) {
        console.error('ContentRegistry configuration check failed:', err);
        throw new Error(`ContentRegistry not properly configured: ${err.message}`);
      }
      
      // STEP 4: Register both avatar and header content in ContentRegistry BEFORE uploading to storage
      console.log('🔍 Step 4: Checking if CIDs are already registered...');
      
      const contentRegistryAddress = process.env.REACT_APP_CONTENT_REGISTRY;
      if (!contentRegistryAddress) {
        throw new Error('ContentRegistry address not configured');
      }
      
      const contentRegistry = new ethers.Contract(
        contentRegistryAddress,
        ['function isContentRegistered(bytes32 cidHash) view returns (bool)'],
        provider
      );
      
      // Register avatar CID
      const avatarBytes32ForCheck = '0x' + avatarCID;
      const isAvatarRegistered = await contentRegistry.isContentRegistered(avatarBytes32ForCheck);
      
      console.log('Avatar CID registration check:');
      console.log('  CID:', avatarCID);
      console.log('  Already registered:', isAvatarRegistered);
      
      if (!isAvatarRegistered) {
        console.log('🔍 Step 5a: Registering avatar in ContentRegistry...');
        console.log('  Calling registerContent with:', { avatarCID, appId: 'hashd', hashIdToken });
        
        const avatarRegistrationResult = await registerContent(avatarCID, 'hashd', hashIdToken, signer);
        
        console.log('  Registration result:', avatarRegistrationResult);
        
        if (!avatarRegistrationResult.success) {
          throw new Error(`Avatar ContentRegistry registration failed: ${avatarRegistrationResult.error}`);
        }
        
        console.log('✅ Avatar registered in ContentRegistry, tx hash:', avatarRegistrationResult.txHash);
      } else {
        console.log('✅ Avatar already registered, skipping registration');
      }
      
      // Register header CID if different from avatar
      if (formData.headerFile && headerCID !== avatarCID) {
        const headerBytes32ForCheck = '0x' + headerCID;
        const isHeaderRegistered = await contentRegistry.isContentRegistered(headerBytes32ForCheck);
        
        console.log('Header CID registration check:');
        console.log('  CID:', headerCID);
        console.log('  Already registered:', isHeaderRegistered);
        
        if (!isHeaderRegistered) {
          console.log('🔍 Step 5b: Registering header in ContentRegistry...');
          const headerRegistrationResult = await registerContent(headerCID, 'hashd', hashIdToken, signer);
          
          if (!headerRegistrationResult.success) {
            throw new Error(`Header ContentRegistry registration failed: ${headerRegistrationResult.error}`);
          }
          
          console.log('✅ Header registered in ContentRegistry, tx hash:', headerRegistrationResult.txHash);
        }
      }
      
      // STEP 5: Now upload both images to ByteCave storage (nodes will verify they're registered)
      console.log('🔍 Step 6: Uploading images to ByteCave storage...');
      console.log('Connected peers:', peers.length);
      
      // Ensure ByteCave is connected
      if (!isConnected || connectionState !== 'connected') {
        console.log('ByteCave not connected, attempting to connect...');
        try {
          await connect();
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (connectError: any) {
          throw new Error(`Failed to connect to ByteCave: ${connectError.message}`);
        }
      }
      
      if (peers.length === 0) {
        throw new Error('No storage peers available. Please ensure ByteCave nodes are running.');
      }
      
      // Convert hashIdToken to number for store()
      const hashIdTokenNumber = Number(hashIdToken);
      
      // Upload avatar with pre-calculated CID
      console.log('🔍 Uploading avatar to ByteCave...');
      console.log('  Avatar data size:', avatarData.length, 'bytes');
      console.log('  MIME type:', formData.avatarFile.type);
      console.log('  HashID token:', hashIdTokenNumber);
      
      const avatarUploadResult = await store(avatarData, formData.avatarFile.type, signer, hashIdTokenNumber);

      console.log('  Upload result:', avatarUploadResult);

      if (!avatarUploadResult.success || !avatarUploadResult.cid) {
        throw new Error(avatarUploadResult.error || 'Failed to upload avatar to ByteCave');
      }
      
      // Verify the uploaded CID matches our pre-calculated CID
      if (avatarUploadResult.cid !== avatarCID) {
        throw new Error(`Avatar CID mismatch! Calculated: ${avatarCID}, Uploaded: ${avatarUploadResult.cid}`);
      }

      console.log('✅ Avatar uploaded to ByteCave, CID verified:', avatarUploadResult.cid);
      
      // Upload header if different from avatar
      if (formData.headerFile && headerCID !== avatarCID) {
        console.log('Uploading header...');
        const headerUploadResult = await store(headerData, formData.headerFile.type, signer, hashIdTokenNumber);

        if (!headerUploadResult.success || !headerUploadResult.cid) {
          throw new Error(headerUploadResult.error || 'Failed to upload header to ByteCave');
        }
        
        if (headerUploadResult.cid !== headerCID) {
          throw new Error(`Header CID mismatch! Calculated: ${headerCID}, Uploaded: ${headerUploadResult.cid}`);
        }

        console.log('✅ Header uploaded to ByteCave, CID verified:', headerUploadResult.cid);
      }

      // STEP 6: Create group on-chain
      console.log('🔍 Step 7: Creating group on-chain...');
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, signer);

      console.log('Creating group with data:', formData);

      const nftPriceWei = ethers.parseEther(formData.nftPrice);
      const maxNFTs = parseInt(formData.maxNFTs);

      // Convert CID strings to bytes32 format for contract storage
      // ByteCave CIDs are SHA-256 hex hashes (64 chars), not base58-encoded
      const avatarCIDBytes32 = cidToBytes32(avatarCID);
      const headerCIDBytes32 = cidToBytes32(headerCID);

      console.log('Calling factory.createGroup with:', {
        title: formData.title,
        description: formData.description,
        avatarCIDBytes32,
        headerCIDBytes32,
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        nftName: formData.nftName,
        nftSymbol: formData.nftSymbol,
        nftPriceWei: nftPriceWei.toString(),
        maxNFTs
      });
      
      const tx = await factory.createGroup(
        formData.title,
        formData.description,
        avatarCIDBytes32, // avatarCID - used for NFT image
        headerCIDBytes32, // headerCID - used for group header
        formData.tokenName,
        formData.tokenSymbol,
        formData.nftName,
        formData.nftSymbol,
        nftPriceWei,
        maxNFTs
      );

      console.log('✅ Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);

      // Parse the GroupCreated event (optional - for logging)
      const event = receipt.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === 'GroupCreated');

      if (event) {
        console.log('GroupCreated event:', event.args);
        
        // Set success state with the created group info
        setSuccess({
          tokenAddr: event.args.tokenAddr,
          nftAddr: event.args.nftAddr
        });
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        avatarFile: null,
        headerFile: null,
        tokenName: '',
        tokenSymbol: '',
        nftName: '',
        nftSymbol: '',
        nftPrice: '0.001',
        maxNFTs: '100'
      });

      // Call callbacks immediately after successful transaction
      if (onGroupCreated) {
        onGroupCreated();
      }
      
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error('Error creating group:', err);
      
      // Handle specific error types
      if (err.message?.includes('nonce has already been used')) {
        setError('Transaction pending. Please wait a moment and try again.');
      } else if (err.message?.includes('user rejected')) {
        setError('Transaction cancelled by user');
      } else {
        setError(err.message || 'Failed to create group');
      }
    } finally {
      setIsCreating(false);
      isSubmittingRef.current = false;
    }
  };

  // Define steps for the Stepper
  const steps: Step[] = [
    {
      id: 'guild-info',
      title: 'Guild Info',
      description: 'Basic details',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-cyan-500/30 mb-6">
            <Info className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-cyan-400 uppercase font-mono">Guild Information</h4>
          </div>
          
          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Guild Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
              placeholder="e.g., MegaETH Developers"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 resize-none font-mono text-sm transition-colors"
              placeholder="Describe your Guild..."
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Guild Avatar * (Used for NFT image)
            </label>
            <ImageUpload
              deferUpload={true}
              onFileSelected={(file) => {
                setFormData({ ...formData, avatarFile: file });
              }}
              onImageUploaded={() => {}}
              currentImageUrl={formData.avatarFile ? URL.createObjectURL(formData.avatarFile) : ''}
              disabled={isCreating}
              maxSizeMB={5}
            />
            {formData.avatarFile && (
              <div className="mt-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                <p className="text-xs text-gray-400 font-mono">
                  <strong className="text-cyan-400">Avatar:</strong> {formData.avatarFile.name} ({(formData.avatarFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Guild Header Image (Optional)
            </label>
            <ImageUpload
              deferUpload={true}
              onFileSelected={(file) => {
                setFormData({ ...formData, headerFile: file });
              }}
              onImageUploaded={() => {}}
              currentImageUrl={formData.headerFile ? URL.createObjectURL(formData.headerFile) : ''}
              disabled={isCreating}
              maxSizeMB={5}
            />
            {formData.headerFile && (
              <div className="mt-2 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2">
                <p className="text-xs text-gray-400 font-mono">
                  <strong className="text-purple-400">Header:</strong> {formData.headerFile.name} ({(formData.headerFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
            <p className="text-xs text-gray-400 font-mono mt-2">If not provided, avatar will be used</p>
          </div>
        </div>
      )
    },
    {
      id: 'token',
      title: 'Token',
      description: 'ERC20 details',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-purple-500/30 mb-6">
            <Coins className="w-5 h-5 text-purple-400" />
            <h4 className="text-sm font-bold text-purple-400 uppercase font-mono">Token (ERC20)</h4>
            <span className="text-xs text-gray-400 font-mono ml-auto">1B supply minted to you</span>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300 font-mono leading-relaxed">
              Each guild automatically launches with its own tradable token. Usage of this token is <strong className="text-purple-400">not necessary</strong> for basic guild functionality.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                Token Name *
              </label>
              <input
                type="text"
                value={formData.tokenName}
                onChange={(e) => setFormData({ ...formData, tokenName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g., MegaDev Token"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                Symbol *
              </label>
              <input
                type="text"
                value={formData.tokenSymbol}
                onChange={(e) => setFormData({ ...formData, tokenSymbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g., MGD"
                maxLength={10}
                disabled={isCreating}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'nft',
      title: 'NFTs',
      description: 'ERC721 details',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-yellow-500/30 mb-6">
            <Award className="w-5 h-5 text-yellow-400" />
            <h4 className="text-sm font-bold text-yellow-400 uppercase font-mono">Genesis Keys (ERC721)</h4>
            <span className="text-xs text-gray-400 font-mono ml-auto">7.5% royalty</span>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-300 font-mono leading-relaxed">
              You can <strong className="text-yellow-400">gift or sell</strong> Genesis Keys to your Guild members.<br/>Ownership grants certain <strong className="text-yellow-400">voting rights</strong> within the Guild.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                Collection Name *
              </label>
              <input
                type="text"
                value={formData.nftName}
                onChange={(e) => setFormData({ ...formData, nftName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g. MegaDev Genesis Keys"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                Symbol *
              </label>
              <input
                type="text"
                value={formData.nftSymbol}
                onChange={(e) => setFormData({ ...formData, nftSymbol: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g. MDGEN"
                maxLength={10}
                disabled={isCreating}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                NFT Price (ETH) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={formData.nftPrice}
                onChange={(e) => setFormData({ ...formData, nftPrice: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g., 0.001"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-400 font-mono mt-1">Price per NFT</p>
            </div>

            <div>
              <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                Max Supply *
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={formData.maxNFTs}
                onChange={(e) => setFormData({ ...formData, maxNFTs: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                placeholder="e.g., 100"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-400 font-mono mt-1">Total NFTs available</p>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-3">
            <p className="text-xs text-gray-300 font-mono">
              <strong className="text-cyan-300">Royalty Split:</strong> 5% to you (creator), 2.5% to platform for both primary and secondary sales.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm details',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-green-500/30 mb-6">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h4 className="text-sm font-bold text-green-400 uppercase font-mono">Review & Deploy</h4>
          </div>

          {/* Guild Info */}
          <div className="bg-cyan-500/5 rounded-lg p-4">
            <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-3 font-mono">Guild Information</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Title:</span>
                <span className="text-white font-mono">{formData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Description:</span>
                <span className="text-white font-mono text-right max-w-xs truncate">{formData.description}</span>
              </div>
              <div className="flex flex-col gap-2">
                {formData.avatarFile && (
                  <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                    <p className="text-xs text-gray-400 font-mono">
                      <strong className="text-cyan-400">Avatar:</strong> {formData.avatarFile.name} ({(formData.avatarFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
                {formData.headerFile && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2">
                    <p className="text-xs text-gray-400 font-mono">
                      <strong className="text-purple-400">Header:</strong> {formData.headerFile.name} ({(formData.headerFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Token Info */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
            <h5 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-3 font-mono">Token (ERC20)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-mono">{formData.tokenName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white font-mono">{formData.tokenSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Supply:</span>
                <span className="text-white font-mono">1,000,000,000</span>
              </div>
            </div>
          </div>

          {/* NFT Info */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
            <h5 className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-3 font-mono">Genesis Keys (ERC721)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white font-mono">{formData.nftName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Symbol:</span>
                <span className="text-white font-mono">{formData.nftSymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price:</span>
                <span className="text-white font-mono">{formData.nftPrice} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Supply:</span>
                <span className="text-white font-mono">{formData.maxNFTs}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Royalty:</span>
                <span className="text-white font-mono">7.5% (5% creator, 2.5% platform)</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <MatrixNotify title="DEPLOYMENT.FAILED" variant="error">
              <p className="text-sm text-white font-mono">{error}</p>
            </MatrixNotify>
          )}

          {/* Success Message */}
          {success && (
            <MatrixNotify title="GUILD.CREATED" variant="success">
              <div className="text-sm text-white font-mono space-y-2">
                <p>Your guild has been successfully deployed!</p>
                <div className="text-xs text-gray-300 space-y-1 mt-2">
                  <p><strong>Token:</strong> {success.tokenAddr}</p>
                  <p><strong>NFT:</strong> {success.nftAddr}</p>
                </div>
              </div>
            </MatrixNotify>
          )}
        </div>
      )
    }
  ];

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="Create Guild"
      icon={Users}
      maxWidth="3xl"
    >
      <div className="p-6">
        <p className="text-sm text-gray-400 font-mono mb-6">Deploy your community with ERC20 token & NFT collection</p>

        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onComplete={handleComplete}
          onCancel={onClose}
          canProgress={canProgressFromStep(currentStep)}
          isProcessing={isCreating}
          completeButtonText="Deploy Guild"
        />
      </div>
    </NeonModal>
  );
};

