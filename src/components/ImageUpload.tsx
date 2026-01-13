/**
 * ImageUpload Component
 * 
 * Reusable image upload component with ByteCave P2P storage integration.
 * Features drag-and-drop, preview, and progress tracking.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { useByteCaveUpload } from '../hooks/useByteCaveUpload';

interface ImageUploadProps {
  onImageUploaded: (url: string, cid: string) => void;
  currentImageUrl?: string;
  disabled?: boolean;
  maxSizeMB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  currentImageUrl,
  disabled = false,
  maxSizeMB = 5
}) => {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, isUploading, progress, error, reset } = useByteCaveUpload();

  const handleFileSelect = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to ByteCave with authorization
    const result = await uploadImage(file, {
      maxSizeMB,
      onProgress: (prog) => {
        console.log('[ImageUpload] Upload progress:', prog);
      }
    });

    if (result.success && result.url && result.cid) {
      onImageUploaded(result.url, result.cid);
    }
  }, [disabled, isUploading, uploadImage, maxSizeMB, onImageUploaded]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-3">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-cyan-500/50'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          ${preview ? 'p-2' : 'p-8'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-white font-mono">{progress}%</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            {isUploading ? (
              <div className="space-y-3">
                <Loader className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
                <p className="text-sm text-gray-400 font-mono">Uploading to ByteCave... {progress}%</p>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="p-4 bg-cyan-500/10 rounded-full">
                    <Upload className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-cyan-400 font-mono mb-1">
                    Click or drag image here
                  </p>
                  <p className="text-xs text-gray-500 font-mono">
                    Max {maxSizeMB}MB • JPG, PNG, GIF, WebP
                  </p>
                  <p className="text-xs text-cyan-500/60 font-mono mt-2">
                    Stored on ByteCave P2P network
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-xs text-red-400 font-mono">{error}</p>
        </div>
      )}
    </div>
  );
};
