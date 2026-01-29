/**
 * Edit Group Info Modal
 * 
 * Modal for group owners to update group information (title, description, avatar, header)
 * Uses GroupFactory.updateGroupMetadata() and ByteCave storage for images
 */

import React, { useState, useEffect } from 'react';
import { Edit, AlertCircle, Upload, X } from 'lucide-react';
import { NeonModal, NeonButton } from './NeonModal';
import { ImageUpload } from '../ImageUpload';
import { GuildImage } from '../GuildImage';
import { ethers } from 'ethers';
import { GROUP_FACTORY_ABI, cidToBytes32 } from '../../utils/contracts';
import { useByteCaveContext } from '@gethashd/bytecave-browser';
import { calculateCID } from '../../utils/cid-calculator';

const GROUP_FACTORY_ADDRESS = process.env.REACT_APP_GROUP_FACTORY || '';

interface EditGroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  currentInfo: {
    title: string;
    description: string;
    imageURI: string;
    headerImageURI: string;
  };
  hashIdToken: string | null;
  onUpdate: () => void;
}

export const EditGroupInfoModal: React.FC<EditGroupInfoModalProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  currentInfo,
  hashIdToken,
  onUpdate
}) => {
  const { store, registerContent, isConnected } = useByteCaveContext();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    avatarFile: null as File | null,
    headerFile: null as File | null
  });
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showHeaderUpload, setShowHeaderUpload] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: currentInfo.title || '',
        description: currentInfo.description || '',
        avatarFile: null,
        headerFile: null
      });
      setShowAvatarUpload(false);
      setShowHeaderUpload(false);
      setError(null);
    }
  }, [isOpen, currentInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('Wallet not connected');
      }

      if (!hashIdToken) {
        throw new Error('No HASHD ID found. Please register or link a HASHD ID first.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Extract current CIDs from hashd:// URLs
      const extractCID = (uri: string) => {
        if (!uri) return '';
        return uri.replace('hashd://', '');
      };

      let avatarCID = extractCID(currentInfo.imageURI);
      let headerCID = extractCID(currentInfo.headerImageURI);

      // Upload avatar if changed
      if (formData.avatarFile) {
        console.log('📤 Processing new avatar upload...');
        
        const imageData = new Uint8Array(await formData.avatarFile.arrayBuffer());
        const calculatedCID = await calculateCID(imageData);
        console.log('✅ Avatar CID calculated:', calculatedCID);

        // Register content in ContentRegistry
        console.log('🔍 Registering avatar in ContentRegistry...');
        const registrationResult = await registerContent(calculatedCID, 'hashd', hashIdToken, signer);
        
        if (!registrationResult.success) {
          throw new Error(`Avatar ContentRegistry registration failed: ${registrationResult.error}`);
        }
        
        console.log('✅ Avatar registered in ContentRegistry, tx hash:', registrationResult.txHash);

        // Upload to ByteCave
        console.log('📤 Uploading avatar to ByteCave...');
        const hashIdTokenNumber = Number(hashIdToken);
        const uploadResult = await store(imageData, formData.avatarFile.type, signer, hashIdTokenNumber);

        if (!uploadResult.success || !uploadResult.cid) {
          throw new Error(uploadResult.error || 'Failed to upload avatar to ByteCave');
        }

        console.log('✅ Avatar uploaded to ByteCave:', uploadResult.cid);
        avatarCID = uploadResult.cid;
      }

      // Upload header if changed
      if (formData.headerFile) {
        console.log('📤 Processing new header upload...');
        
        const imageData = new Uint8Array(await formData.headerFile.arrayBuffer());
        const calculatedCID = await calculateCID(imageData);
        console.log('✅ Header CID calculated:', calculatedCID);

        // Register content in ContentRegistry
        console.log('🔍 Registering header in ContentRegistry...');
        const registrationResult = await registerContent(calculatedCID, 'hashd', hashIdToken, signer);
        
        if (!registrationResult.success) {
          throw new Error(`Header ContentRegistry registration failed: ${registrationResult.error}`);
        }
        
        console.log('✅ Header registered in ContentRegistry, tx hash:', registrationResult.txHash);

        // Upload to ByteCave
        console.log('📤 Uploading header to ByteCave...');
        const hashIdTokenNumber = Number(hashIdToken);
        const uploadResult = await store(imageData, formData.headerFile.type, signer, hashIdTokenNumber);

        if (!uploadResult.success || !uploadResult.cid) {
          throw new Error(uploadResult.error || 'Failed to upload header to ByteCave');
        }

        console.log('✅ Header uploaded to ByteCave:', uploadResult.cid);
        headerCID = uploadResult.cid;
      }

      // Update group metadata in GroupFactory
      console.log('📝 Updating group metadata in GroupFactory...');
      const factory = new ethers.Contract(GROUP_FACTORY_ADDRESS, GROUP_FACTORY_ABI, signer);
      
      const avatarBytes32 = cidToBytes32(avatarCID);
      const headerBytes32 = cidToBytes32(headerCID);

      const tx = await factory.updateGroupMetadata(
        tokenAddress,
        formData.title,
        formData.description,
        avatarBytes32,
        headerBytes32
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');

      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Error updating group info:', err);
      setError(err.message || 'Failed to update group info');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <NeonModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Group Info"
      icon={Edit}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400 font-mono">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Group Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
              placeholder="Enter group title"
              required
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-500 mt-2 font-mono">
              This will be displayed throughout the platform and in NFT metadata
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Group Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900/50 border border-cyan-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 resize-none font-mono text-sm transition-colors min-h-[100px]"
              placeholder="Describe your group"
              required
              disabled={isUpdating}
            />
            <p className="text-xs text-gray-500 mt-2 font-mono">
              This description will appear on the group page and in NFT metadata
            </p>
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Group Avatar (Optional)
            </label>
            {!showAvatarUpload && currentInfo.imageURI ? (
              <div className="relative">
                <div className="w-full h-48 bg-gray-900/50 border border-cyan-500/20 rounded-lg overflow-hidden">
                  <GuildImage
                    imageURI={currentInfo.imageURI}
                    alt="Current avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarUpload(true)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <ImageUpload
                deferUpload={true}
                onFileSelected={(file) => {
                  setFormData({ ...formData, avatarFile: file });
                }}
                onImageUploaded={() => {}}
                currentImageUrl={
                  formData.avatarFile 
                    ? URL.createObjectURL(formData.avatarFile)
                    : undefined
                }
                disabled={isUpdating}
                maxSizeMB={5}
              />
            )}
            <p className="text-xs text-gray-500 mt-2 font-mono">
              {!showAvatarUpload && currentInfo.imageURI 
                ? 'Click X to replace the current avatar'
                : 'Upload a new avatar image'}
            </p>
          </div>

          {/* Header Upload */}
          <div>
            <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 block font-mono flex items-center gap-2">
              <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
              Group Header Banner (Optional)
            </label>
            {!showHeaderUpload && currentInfo.headerImageURI ? (
              <div className="relative">
                <div className="w-full h-48 bg-gray-900/50 border border-cyan-500/20 rounded-lg overflow-hidden">
                  <GuildImage
                    imageURI={currentInfo.headerImageURI}
                    alt="Current header"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowHeaderUpload(true)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <ImageUpload
                deferUpload={true}
                onFileSelected={(file) => {
                  setFormData({ ...formData, headerFile: file });
                }}
                onImageUploaded={() => {}}
                currentImageUrl={
                  formData.headerFile 
                    ? URL.createObjectURL(formData.headerFile)
                    : undefined
                }
                disabled={isUpdating}
                maxSizeMB={5}
              />
            )}
            <p className="text-xs text-gray-500 mt-2 font-mono">
              {!showHeaderUpload && currentInfo.headerImageURI 
                ? 'Click X to replace the current header'
                : 'Upload a new header banner image'}
            </p>
          </div>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-mono">
            <strong>Note:</strong> Updating group info will affect the group page and all NFT metadata. 
            {(formData.avatarFile || formData.headerFile) && ' New images will be uploaded to ByteCave storage and require signatures.'}
          </p>
        </div>

        <div className="flex gap-3">
          <NeonButton
            type="button"
            onClick={onClose}
            variant="red"
            className="flex-1"
            disabled={isUpdating}
          >
            Cancel
          </NeonButton>
          <NeonButton
            type="submit"
            variant="cyan"
            className="flex-1"
            disabled={isUpdating || !isConnected}
          >
            {isUpdating ? 'Updating...' : 'Update Group Info'}
          </NeonButton>
        </div>
      </form>
    </NeonModal>
  );
};
