/**
 * useByteCaveUpload Hook
 * 
 * Reusable hook for uploading files to ByteCave storage network via P2P.
 * Uses direct P2P connection to nodes instead of HTTP gateway.
 */

import { useState, useCallback } from 'react';
import { useByteCaveClient } from './useByteCaveClient';
import { ethers } from 'ethers';

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
  const { client, isConnected } = useByteCaveClient();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null
  });

  const validateFile = useCallback((file: File, options: UploadOptions = {}): string | null => {
    // Hard limit: 5MB maximum file size
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const maxSize = Math.min(options.maxSizeMB ? options.maxSizeMB * 1024 * 1024 : MAX_FILE_SIZE, MAX_FILE_SIZE);
    
    const allowedTypes = options.allowedTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'application/pdf'
    ];

    // Check file size (5MB hard limit)
    if (file.size > MAX_FILE_SIZE) {
      return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 5MB`;
    }

    if (file.size > maxSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(0)}MB`;
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
    // Check if client is available
    if (!client || !isConnected) {
      const error = 'ByteCave P2P client not connected. Please wait for connection.';
      setUploadState({ isUploading: false, progress: 0, error });
      return { success: false, error };
    }

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

      console.log('[ByteCaveUpload] Step 1: File read complete, size:', data.length, 'bytes');

      // Get signer from MetaMask for authorization
      let signer;
      try {
        console.log('[ByteCaveUpload] Step 2: Getting MetaMask signer...');
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          signer = await provider.getSigner();
          console.log('[ByteCaveUpload] Step 2: Signer obtained:', await signer.getAddress());
        }
      } catch (err) {
        console.warn('[ByteCaveUpload] Could not get signer, uploading without authorization:', err);
      }

      // Upload via P2P using ByteCave client
      console.log('[ByteCaveUpload] Step 3: Starting P2P upload...', file.name, 'Size:', file.size, 'bytes');
      console.log('[ByteCaveUpload] Client connected:', isConnected, 'Peer count:', (client as any)?.getPeerCount?.() || 0);
      
      const result = await (client as any).store(data, file.type, signer);
      
      console.log('[ByteCaveUpload] Step 4: P2P store returned:', result);

      if (!result.success) {
        throw new Error(result.error || 'P2P upload failed');
      }

      console.log('[ByteCaveUpload] P2P upload successful, CID:', result.cid);

      // Update progress
      if (options.onProgress) {
        options.onProgress(80);
      }
      setUploadState(prev => ({ ...prev, progress: 80 }));

      // Generate HTTP gateway URL - use default localhost endpoint
      // TODO: Get actual node HTTP endpoint from peer info when available
      const gatewayUrl = `http://localhost:5001/blob/${result.cid}`;

      console.log('[ByteCaveUpload] Gateway URL:', gatewayUrl);

      // Complete
      if (options.onProgress) {
        options.onProgress(100);
      }
      setUploadState({ isUploading: false, progress: 100, error: null });

      return {
        success: true,
        cid: result.cid,
        url: gatewayUrl
      };

    } catch (error: any) {
      console.error('[ByteCaveUpload] Upload failed:', error);
      const errorMessage = error.message || 'Upload failed';
      setUploadState({ isUploading: false, progress: 0, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [client, isConnected, validateFile]);

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
