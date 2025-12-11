import React, { useState, useRef, useEffect } from 'react';
import { Shield, Mail, Wallet, Users, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WaitlistFormData {
  name: string;
  email: string;
  walletAddress: string;
  roles: string[];
  note?: string;
  xHandle?: string;
}

const ROLE_OPTIONS = [
  { id: 'developer', label: 'Developer', icon: '💻' },
  { id: 'community_builder', label: 'Community Builder', icon: '🌐' },
  { id: 'investor', label: 'Investor', icon: '💰' },
  { id: 'content_creator', label: 'Content Creator', icon: '✍️' },
  { id: 'early_adopter', label: 'Early Adopter', icon: '🚀' },
  { id: 'other', label: 'Other', icon: '👤' }
];

export const Waitlist: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<WaitlistFormData>({
    name: '',
    email: '',
    walletAddress: '',
    roles: [],
    note: '',
    xHandle: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email) {
      setErrorMessage('Name and email are required');
      setSubmitStatus('error');
      return;
    }


    if (formData.roles.length === 0) {
      setErrorMessage('Please select at least one role');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3002';
      const response = await fetch(`${apiUrl}/api/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join waitlist');
      }

      setSubmitStatus('success');
      // Reset form
      setFormData({
        name: '',
        email: '',
        walletAddress: '',
        roles: [],
        note: ''
      });
    } catch (error: any) {
      console.error('Waitlist submission error:', error);
      setErrorMessage(error.message || 'Failed to join waitlist. Please try again.');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 hex-grid">
        <div className="max-w-2xl w-full text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-8">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-4xl font-bold neon-text-cyan mb-6 font-cyberpunk">CHECK YOUR EMAIL!</h1>
          <p className="text-gray-400 text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Thank you! We've sent a verification email to confirm your address.
            <span className="block mt-4 text-cyan-400 font-bold">
              Please check your inbox and click the verification link to complete your registration.
            </span>
            {formData.walletAddress && (
              <span className="block mt-4 text-green-400">
                ✓ Your wallet address has been registered.
              </span>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-2xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden"
            >
              <ArrowLeft className="w-6 h-6" />
              RETURN TO HOME
            </button>
            <button
              onClick={() => setSubmitStatus('idle')}
              className="px-12 py-4 bg-gray-800/50 border border-cyan-500/30 hover:border-cyan-500/50 text-white rounded-lg relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden transition-all hover:bg-gray-800/70"
            >
              <Users className="w-6 h-6" />
              JOIN ANOTHER PERSON
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen p-4 hex-grid">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-mono">Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
      


            <div className="flex justify-center my-12">
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Animated glow rings */}
                <div className="absolute inset-0 rounded-full"></div>
         
                
                {/* Logo container */}
                <div className="relative w-48 h-48 flex items-center justify-center overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="Hashd Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            

          <h1 className="text-4xl font-bold neon-text-cyan mb-4 mt-4 font-cyberpunk">JOIN THE WAITLIST</h1>
          <div className="text-gray-300 text-lg space-y-3">
            <p className="leading-relaxed">
              Be among the first to experience <span className="text-cyan-400 font-semibold">truly private, decentralized communication</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🏷️</div>
                <h3 className="text-cyan-400 font-bold text-sm mb-1">EARLY HASHIDS</h3>
                <p className="text-gray-400 text-xs">Get priority access to HashIDs when they launch</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">💎</div>
                <h3 className="text-green-400 font-bold text-sm mb-1">TOKEN ALLOCATION</h3>
                <p className="text-gray-400 text-xs">Consideration for HASHD token distribution</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="text-orange-400 font-bold text-sm mb-1">BOOST REWARDS</h3>
                <p className="text-gray-400 text-xs">Share on X to increase your allocation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 backdrop-blur-sm">
          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Error</p>
                <p className="text-xs text-red-300/80 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Basic Information
            </h3>
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name or psuedonym"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="anon@proton.mail"
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

   <div>
              <label className="block text-sm font-medium text-cyan-400 mb-2">
                I am a... (Select all that apply) *
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-left flex items-center justify-between focus:border-cyan-500 focus:outline-none transition-colors"
                >
                  <span className="flex items-center gap-2">
                    {formData.roles.length === 0 ? (
                      <span className="text-gray-500">Select your roles...</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-cyan-400">{formData.roles.length} selected:</span>
                        <span className="text-gray-300">
                          {formData.roles.map(roleId => 
                            ROLE_OPTIONS.find(r => r.id === roleId)?.label
                          ).join(', ')}
                        </span>
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">{showRoleDropdown ? '▲' : '▼'}</span>
                </button>
                
                {showRoleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                    {ROLE_OPTIONS.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleToggle(role.id)}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-gray-800/50 ${
                          formData.roles.includes(role.id)
                            ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-500'
                            : 'text-gray-300'
                        }`}
                      >
                        <span className="text-xl">{role.icon}</span>
                        <span className="font-medium">{role.label}</span>
                        {formData.roles.includes(role.id) && (
                          <CheckCircle className="w-4 h-4 text-cyan-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>              
            </div>
          </div>

          {/* Social & Wallet */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-cyan-400" />
              Additional Information (Optional)
            </h3>
            <div className="space-y-6">
              {/* X Handle */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  X Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">@</span>
                  <input
                    type="text"
                    value={formData.xHandle}
                    onChange={(e) => setFormData(prev => ({ ...prev, xHandle: e.target.value }))}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                    maxLength={15}
                    pattern="[a-zA-Z0-9_]+"
                  />
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-cyan-400 mb-2">
                  Wallet Address
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={formData.walletAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, walletAddress: e.target.value }))}
                    placeholder="0x..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Don't worry if you don't have one yet. We can help you set up a wallet later if needed.<br/><b>We will require a wallet address at the point of any airdrop distribution</b>
                </p>
              </div>

  <div>
              <label className="block text-sm font-medium text-cyan-400 mb-2">
                Note
              </label>
            <textarea
              value={formData.note || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Tell us anything you'd like us to know..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.note?.length || 0}/500 characters
            </p>
            </div>              
            </div>
          </div>


          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-12 py-4 cyber-button relative inline-flex items-center justify-center gap-2 text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className={`w-6 h-6 ${isSubmitting ? 'animate-pulse' : ''}`} />
            {isSubmitting ? 'JOINING WAITLIST...' : 'JOIN WAITLIST'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            By joining the waitlist, you agree to receive updates about Hashd. We will never share your information.
          </p>
        </div>
      </div>
    </div>
  );
};
