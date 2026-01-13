/**
 * useByteCaveUpload Hook
 * 
 * Reusable hook for uploading files to ByteCave storage network with authorization.
 * All uploads include sender signature for ownership tracking and future payment.
 */

import { useState, useCallback } from 'react';
import { vaultService } from '../services/vault/vaultService';

interface UploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  cid?: string;
  url?: string;
  error?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

const DEFAULT_MAX_SIZE_MB = 5;
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export const useByteCaveUpload = () => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null
  });

  const validateFile = useCallback((file: File, options: UploadOptions = {}): string | null => {
    const maxSizeMB = options.maxSizeMB || DEFAULT_MAX_SIZE_MB;
    const allowedTypes = options.allowedTypes || DEFAULT_ALLOWED_TYPES;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }

    return null;
  }, []);

  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions = {}
  ): Promise<UploadResult> => {
    // Validate file
    const validationError = validateFile(file, options);
    if (validationError) {
      setUploadState({ isUploading: false, progress: 0, error: validationError });
      return { success: false, error: validationError };
    }

    setUploadState({ isUploading: true, progress: 0, error: null });

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // Update progress
      if (options.onProgress) {
        options.onProgress(30);
      }
      setUploadState(prev => ({ ...prev, progress: 30 }));

      // Generate unique media ID for this upload
      const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Upload to vault with authorization (includes sender signature)
      console.log('[ByteCaveUpload] Uploading file with authorization:', file.name, 'Size:', file.size, 'bytes');
      const cid = await vaultService.uploadMedia(data, mediaId);

      console.log('[ByteCaveUpload] Upload successful, CID:', cid);

      // Update progress
      if (options.onProgress) {
        options.onProgress(80);
      }
      setUploadState(prev => ({ ...prev, progress: 80 }));

      // Generate HTTP gateway URL using vault primary node
      const { getVaultPrimaryNode } = require('../store/settingsStore');
      const vaultUrl = getVaultPrimaryNode() || 'http://localhost:3004';
      const gatewayUrl = `${vaultUrl}/blob/${cid}`;

      console.log('[ByteCaveUpload] Gateway URL:', gatewayUrl);

      // Complete
      if (options.onProgress) {
        options.onProgress(100);
      }
      setUploadState({ isUploading: false, progress: 100, error: null });

      return {
        success: true,
        cid,
        url: gatewayUrl
      };

    } catch (error: any) {
      console.error('[ByteCaveUpload] Upload failed:', error);
      const errorMessage = error.message || 'Upload failed';
      setUploadState({ isUploading: false, progress: 0, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [validateFile]);

  const uploadImage = useCallback(async (
    file: File,
    options: Omit<UploadOptions, 'allowedTypes'> = {}
  ): Promise<UploadResult> => {
    return uploadFile(file, {
      ...options,
      allowedTypes: DEFAULT_ALLOWED_TYPES
    });
  }, [uploadFile]);

  const reset = useCallback(() => {
    setUploadState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    uploadFile,
    uploadImage,
    validateFile,
    reset,
    ...uploadState
  };
};
