import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Loader2 as Loader, Download, Check, Copy, Send, ChevronDown, Upload, CheckCircle, Globe, Users, Coins, Award } from 'lucide-react';
import { encryptContent, PostContent, AccessLevel, uploadToVault } from '../services/ipfs/groupPosts';
import { ethers } from 'ethers';
import { useByteCaveContext } from '@gethashd/bytecave-browser';

interface ProgressStep {
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

interface CreatePostProps {
  groupTokenAddress: string;
  groupPostsAddress: string;
  groupKey: string;
  userAddress: string;
  onPostCreated: (contentHash: string, accessLevel: number) => Promise<void>;
  onComplete?: () => void;
  hasNFT?: boolean;
  hasToken?: boolean;
  isMember?: boolean;
  relayerUrl?: string;
  hashIdToken?: string;
}

export default function CreatePost({
  groupTokenAddress,
  groupPostsAddress,
  groupKey,
  userAddress,
  onPostCreated,
  onComplete,
  hasNFT = false,
  hasToken = false,
  isMember = false,
  relayerUrl,
  hashIdToken
}: CreatePostProps) {
  const { store } = useByteCaveContext();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(AccessLevel.MEMBERS_ONLY);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Manual upload mode
  const [showManualMode, setShowManualMode] = useState(false);
  const [encryptedContent, setEncryptedContent] = useState<Uint8Array | null>(null);
  const [contentHash, setContentHash] = useState<string>('');
  const [manualCID, setManualCID] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Encrypt content locally
  const handleEncryptLocally = async () => {
    if (!title.trim()) {
      setError('Post must have a title');
      return;
    }
    
    if (!text.trim() && !image) {
      setError('Post must have text or an image');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const content: PostContent = {
        title: title.trim(),
        text: text.trim(),
        image: image || undefined,
        timestamp: Date.now(),
        author: userAddress
      };

      // Encrypt content
      const encrypted = await encryptContent(content, groupKey);
      setEncryptedContent(encrypted);

      // Compute content hash
      const hash = ethers.keccak256(encrypted);
      setContentHash(hash);

      setShowManualMode(true);
    } catch (err) {
      console.error('Encryption error:', err);
      setError(err instanceof Error ? err.message : 'Failed to encrypt');
    } finally {
      setIsUploading(false);
    }
  };

  // Download encrypted content as file
  const handleDownloadEncrypted = () => {
    if (!encryptedContent) return;

    const arrayBuffer = encryptedContent.buffer.slice(encryptedContent.byteOffset, encryptedContent.byteOffset + encryptedContent.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `post-${contentHash.slice(0, 10)}.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy encrypted content as base64
  const handleCopyEncrypted = async () => {
    if (!encryptedContent) return;

    const base64 = btoa(String.fromCharCode(...Array.from(encryptedContent)));
    await navigator.clipboard.writeText(base64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit with manual CID
  const handleManualSubmit = async () => {
    if (!manualCID.trim()) {
      setError('Please enter the content CID');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onPostCreated(manualCID, accessLevel);

      // Reset form
      setText('');
      setImage(null);
      setAccessLevel(AccessLevel.MEMBERS_ONLY);
      setShowManualMode(false);
      setEncryptedContent(null);
      setManualCID('');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsUploading(false);
    }
  };

  const updateStep = (index: number, status: ProgressStep['status'], message?: string) => {
    setProgressSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, message } : step
    ));
  };

  // Auto upload via relayer
  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim() && !image) {
      setError('Post must have text or an image');
      return;
    }

    if (!relayerUrl) {
      setError('Relayer not configured. Use manual upload instead.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setShowProgress(true);
    
    // Initialize progress steps
    setProgressSteps([
      { label: 'Encrypting content', status: 'active', message: 'Encrypting with group key...' },
      { label: 'Registering content', status: 'pending' },
      { label: 'Uploading to ByteCave', status: 'pending' },
      { label: 'Publishing post', status: 'pending' }
    ]);

    try {
      // Step 1: Prepare content and encrypt
      const content: PostContent = {
        title: title.trim(),
        text: text.trim(),
        image: image || undefined,
        timestamp: Date.now(),
        author: userAddress
      };

      const encrypted = await encryptContent(content, groupKey);
      
      // Calculate CID for on-chain registration
      const arrayBuffer = encrypted.buffer.slice(encrypted.byteOffset, encrypted.byteOffset + encrypted.byteLength) as ArrayBuffer;
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const cid = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      updateStep(0, 'complete', 'Content encrypted');

      // Step 2: Register content on-chain (GroupPosts.createPost registers in ContentRegistry)
      updateStep(1, 'active', 'Please sign the transaction...');
      
      if (!hashIdToken) {
        throw new Error('No HASHD ID found. Please register a HASHD ID first.');
      }
      
      // Call GroupPosts.createPost - this registers the CID in ContentRegistry
      await onPostCreated(cid, accessLevel);
      updateStep(1, 'complete', 'Content registered on-chain');

      // Step 3: Upload to ByteCave vault via P2P (now authorized by on-chain registration)
      updateStep(2, 'active', 'Uploading to ByteCave P2P...');
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const storeResult = await store(encrypted, 'application/octet-stream', signer, Number(hashIdToken));
      
      if (!storeResult.success || !storeResult.cid) {
        throw new Error(storeResult.error || 'Failed to upload to ByteCave');
      }
      
      // Verify the CID matches what we registered
      if (storeResult.cid !== cid) {
        console.warn('⚠️ ByteCave CID mismatch:', { expected: cid, received: storeResult.cid });
      }
      
      updateStep(2, 'complete', `Uploaded: ${storeResult.cid.slice(0, 8)}...`);

      // Step 4: Complete
      updateStep(3, 'active', 'Finalizing...');
      updateStep(3, 'complete', 'Post published successfully!');

      // Reset form
      setText('');
      setTitle('');
      setImage(null);
      setAccessLevel(AccessLevel.MEMBERS_ONLY);
      setShowProgress(false);
      setProgressSteps([]);
      
      // Notify parent that everything is complete - this will close modal and refresh feed
      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      console.error('Error creating post:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create post';
      setError(errorMessage);
      
      // Mark current step as error
      const activeIndex = progressSteps.findIndex(s => s.status === 'active');
      if (activeIndex >= 0) {
        updateStep(activeIndex, 'error', errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Show message if not a member
  if (!isMember) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-yellow-400 mb-2 uppercase tracking-wider font-mono">Join Guild to Post</h3>
            <p className="text-sm text-gray-300">
              You must be a member of this guild to create posts. Click the "Join Guild" button above.
            </p>

          </div>
        </div>
      </div>
    );
  }

  if (showManualMode && encryptedContent) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold neon-text-cyan mb-4 uppercase tracking-wider font-mono">Manual Upload Mode</h3>
        
        <div className="space-y-6">
          {/* Content Hash */}
          <div>
            <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
              Content Hash (SHA-256)
            </label>
            <code className="block p-3 bg-gray-900/50 rounded text-xs break-all text-cyan-400 font-mono">
              {contentHash}
            </code>
          </div>

          {/* Download Encrypted File */}
          <div>
            <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
              Step 1: Download Encrypted Content
            </label>
            <button
              onClick={handleDownloadEncrypted}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all font-bold font-mono text-sm"
            >
              <Download className="w-4 h-4" />
              Download .enc file
            </button>
            <p className="text-sm text-gray-400 mt-2 font-mono">
              Or copy as base64:
            </p>
            <button
              onClick={handleCopyEncrypted}
              className="flex items-center gap-2 px-4 py-2 mt-2 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all font-bold font-mono text-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Base64'}
            </button>
          </div>

          {/* Upload Instructions */}
          <div className="bg-cyan-900/20 rounded-lg p-4">
            <h4 className="font-bold text-cyan-400 mb-2 uppercase tracking-wider font-mono text-sm">Step 2: Upload to ByteCave</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300 font-mono">
              <li>Download the encrypted file</li>
              <li>Upload to ByteCave vault node</li>
              <li>Copy the content CID (64-character hex string)</li>
              <li>Paste the CID below</li>
            </ol>
          </div>

          {/* CID Input */}
          <div>
            <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
              Step 3: Enter Content CID
            </label>
            <input
              type="text"
              value={manualCID}
              onChange={(e) => setManualCID(e.target.value)}
              placeholder="Qm... or bafy..."
              className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded font-mono text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleManualSubmit}
              disabled={isUploading || !manualCID.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold font-mono text-sm"
            >
              <Send className="w-4 h-4" />
              {isUploading ? 'Creating Post...' : 'Create Post'}
            </button>
            <button
              onClick={() => {
                setShowManualMode(false);
                setEncryptedContent(null);
                setManualCID('');
              }}
              className="px-4 py-2 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all font-bold font-mono text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleAutoSubmit} className="space-y-6">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
          className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
          disabled={isUploading}
          maxLength={200}
        />
        
        {/* Text Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? (optional)"
          className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors resize-none"
          rows={5}
          disabled={isUploading}
        />

        {/* Image Preview */}
        {image && (
          <div className="mt-3 relative">
            <img
              src={image}
              alt="Upload preview"
              className="max-h-64 rounded-lg"
            />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded font-mono text-sm">
            {error}
          </div>
        )}

        {/* Access Level Dropdown */}
        <div className="mt-4">
          <label className="text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 block font-mono">Who can view this post?</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => !isUploading && setShowDropdown(!showDropdown)}
              disabled={isUploading}
              className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white hover:border-cyan-500/50 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm transition-colors flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {accessLevel === AccessLevel.PUBLIC && <><Globe className="w-4 h-4 text-cyan-400" /> Public - Anyone can view</>}
                {accessLevel === AccessLevel.MEMBERS_ONLY && <><Users className="w-4 h-4 text-cyan-400" /> Guild members Only</>}
                {accessLevel === AccessLevel.TOKEN_HOLDERS && <><Coins className="w-4 h-4 text-purple-400" /> Token Holders</>}
                {accessLevel === AccessLevel.NFT_HOLDERS && <><Award className="w-4 h-4 text-yellow-400" /> NFT Holders</>}
              </span>
              <ChevronDown className={`w-5 h-5 text-cyan-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-lg shadow-2xl shadow-cyan-500/20 overflow-hidden z-10">
                <button
                  type="button"
                  onClick={() => {
                    setAccessLevel(AccessLevel.PUBLIC);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 border-b border-cyan-500/10 transition-colors flex items-center gap-2 font-mono text-sm text-white"
                >
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Public - Anyone can view</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setAccessLevel(AccessLevel.MEMBERS_ONLY);
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-cyan-500/10 border-b border-cyan-500/10 transition-colors flex items-center gap-2 font-mono text-sm text-white"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Guild members Only</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (hasToken) {
                      setAccessLevel(AccessLevel.TOKEN_HOLDERS);
                      setShowDropdown(false);
                    }
                  }}
                  disabled={!hasToken}
                  className={`w-full px-4 py-3 text-left border-b border-cyan-500/10 transition-colors flex items-center gap-2 font-mono text-sm ${
                    hasToken 
                      ? 'hover:bg-purple-500/10 text-white' 
                      : 'opacity-50 cursor-not-allowed text-gray-500'
                  }`}
                >
                  <Coins className="w-4 h-4 text-purple-400" />
                  <span>Token Holders {!hasToken && '(You need tokens)'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (hasNFT) {
                      setAccessLevel(AccessLevel.NFT_HOLDERS);
                      setShowDropdown(false);
                    }
                  }}
                  disabled={!hasNFT}
                  className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2 font-mono text-sm ${
                    hasNFT 
                      ? 'hover:bg-yellow-500/10 text-white' 
                      : 'opacity-50 cursor-not-allowed text-gray-500'
                  }`}
                >
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span>NFT Holders {!hasNFT && '(You need NFT)'}</span>
                </button>
              </div>
            )}
          </div>
          {accessLevel === AccessLevel.TOKEN_HOLDERS && !hasToken && (
            <p className="text-xs text-yellow-400 mt-1 font-mono">⚠️ You need to hold tokens to create token-gated posts</p>
          )}
          {accessLevel === AccessLevel.NFT_HOLDERS && !hasNFT && (
            <p className="text-xs text-yellow-400 mt-1 font-mono">⚠️ You need to hold an NFT to create NFT-gated posts</p>
          )}
        </div>

        {/* Image Upload Section */}
        <div className="mt-4 pt-4 border-t border-cyan-500/20">
          <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">Add Image (Optional)</label>
          <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            <span className="text-sm text-gray-400 font-mono">Click to upload image</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-end gap-2">
          {/* Manual Upload Button */}
          <button
            type="button"
            onClick={handleEncryptLocally}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold font-mono text-sm"
          >
            <Upload className="w-4 h-4" />
            Manual Upload
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || (!text.trim() && !image)}
            className="cyber-button relative flex items-center justify-center gap-2 px-6 py-2 text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isUploading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Progress Modal */}
      {showProgress && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50 rounded-lg">
          <div className="w-full h-full flex flex-col p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-md font-bold neon-text-cyan uppercase tracking-wider font-mono">Creating Post...</h3>
              {!isUploading && (
                <button
                  onClick={() => {
                    setShowProgress(false);
                    setProgressSteps([]);
                    setError(null);
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {progressSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {step.status === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : step.status === 'active' ? (
                      <Loader className="w-5 h-5 text-primary-500 animate-spin" />
                    ) : step.status === 'error' ? (
                      <X className="w-5 h-5 text-red-500" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold font-mono text-sm ${
                      step.status === 'complete' ? 'text-green-400' :
                      step.status === 'active' ? 'neon-text-cyan' :
                      step.status === 'error' ? 'text-red-400' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    {step.message && (
                      <p className="text-sm text-gray-400 mt-1 font-mono">{step.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 font-mono">{error}</p>
                <button
                  onClick={() => {
                    setShowProgress(false);
                    setProgressSteps([]);
                    setError(null);
                  }}
                  className="mt-2 text-sm text-red-400 hover:text-red-300 font-bold font-mono"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
