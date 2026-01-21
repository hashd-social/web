
import React, { useState, useRef, useEffect } from 'react';
import { ethers } from 'ethers';
import { Users, Coins, Award, Info, CheckCircle } from 'lucide-react';
import { NeonModal } from './NeonModal';
import { MatrixNotify } from '../MatrixNotify';
import { Stepper, Step } from '../Stepper';
import { ImageUpload } from '../ImageUpload';
import { GROUP_FACTORY_ABI } from '../../utils/contracts';
import { useByteCaveContext } from '@hashd-social/bytecave-browser';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';

interface CreateGroupProps {
  onGroupCreated?: () => void;
  onClose?: () => void;
  isOpen: boolean;
}

export const CreateGroup: React.FC<CreateGroupProps> = ({ onGroupCreated, onClose, isOpen }) => {
  const { store, registerContent, isConnected, connect, connectionState, peers } = useByteCaveContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageFile: null as File | null,
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
          imageFile: null,
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
        return !!(formData.title && formData.description && formData.imageFile);
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

      if (!formData.imageFile) {
        throw new Error('Please select an image for the guild');
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

      console.log('Uploading image to ByteCave...');
      console.log('Connected peers:', peers.length);
      
      // Get signer first for both upload authorization and contract interaction
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Upload image to ByteCave with authorization
      const imageData = new Uint8Array(await formData.imageFile.arrayBuffer());
      const uploadResult = await store(imageData, formData.imageFile.type, signer);

      if (!uploadResult.success || !uploadResult.cid) {
        throw new Error(uploadResult.error || 'Failed to upload image to ByteCave');
      }

      console.log('Image uploaded to ByteCave, CID:', uploadResult.cid);

      // Register content in ContentRegistry (on-chain)
      console.log('Registering content in ContentRegistry...');
      const registrationResult = await registerContent(uploadResult.cid, 'hashd', signer);
      
      if (!registrationResult.success) {
        throw new Error(`ContentRegistry registration failed: ${registrationResult.error}`);
      }
      
      console.log('Content registered in ContentRegistry, tx hash:', registrationResult.txHash);

      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, signer);

      console.log('Creating group with data:', formData);

      const nftPriceWei = ethers.parseEther(formData.nftPrice);
      const maxNFTs = parseInt(formData.maxNFTs);

      // Convert CID string to bytes32 format for contract storage
      // For now, using the same CID for both avatar and header
      const cidBytes32 = ethers.encodeBytes32String(uploadResult.cid);

      const tx = await factory.createGroup(
        formData.title,
        formData.description,
        cidBytes32, // avatarCID
        cidBytes32, // headerCID (same as avatar for now)
        formData.tokenName,
        formData.tokenSymbol,
        formData.nftName,
        formData.nftSymbol,
        nftPriceWei,
        maxNFTs
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

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
        
        // Manually join the group as a fallback (in case contract auto-join didn't work)
        try {
          const tokenAddress = event.args.tokenAddr;
          const userProfileAddress = process.env.REACT_APP_USER_PROFILE || '';
          
          if (!userProfileAddress) {
            console.warn('UserProfile address not configured, skipping auto-join check');
            return;
          }
          
          const userProfile = new ethers.Contract(
            userProfileAddress,
            [
              'function joinGroup(address groupToken) external',
              'function hasJoinedGroup(address user, address groupToken) view returns (bool)'
            ],
            signer
          );
          
          // Check if already joined (from contract auto-join)
          const alreadyJoined = await userProfile.hasJoinedGroup(await signer.getAddress(), tokenAddress);
          
          if (!alreadyJoined) {
            console.log('Auto-join did not work, manually joining group...');
            const joinTx = await userProfile.joinGroup(tokenAddress);
            await joinTx.wait();
            console.log('✅ Manually joined group');
          } else {
            console.log('✅ Already joined via contract auto-join');
          }
        } catch (joinError) {
          console.error('Error joining group:', joinError);
          // Don't fail the whole operation if join fails
        }
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        imageFile: null,
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
              Guild Header Image
            </label>
            <ImageUpload
              deferUpload={true}
              onFileSelected={(file) => {
                setFormData({ ...formData, imageFile: file });
              }}
              onImageUploaded={() => {}}
              currentImageUrl={formData.imageFile ? URL.createObjectURL(formData.imageFile) : ''}
              disabled={isCreating}
              maxSizeMB={5}
            />
            {formData.imageFile && (
              <div className="mt-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                <p className="text-xs text-gray-400 font-mono">
                  <strong className="text-cyan-400">Image:</strong> {formData.imageFile.name} ({(formData.imageFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
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
              <div className="flex justify-between align-center">

          {formData.imageFile && (
                  <div className="mt-2 bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                    <p className="text-xs text-gray-400 font-mono">
                      <strong className="text-cyan-400">Image:</strong> {formData.imageFile.name} ({(formData.imageFile.size / 1024).toFixed(1)} KB)
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

