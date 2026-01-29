import React, { useState, useEffect } from 'react';
import { Inbox, Key, Eye, EyeOff } from 'lucide-react';
import { ethers } from 'ethers';
import { NeonModal } from './NeonModal';
import { MailboxInfo, SimpleKeyManager, SimpleCryptoUtils } from '../../utils/crypto-simple';
import { CreationProgress, IncompleteRegistration } from '../../hooks/useMailboxCreation';
import { contractService } from '../../utils/contracts';
import { parseErrorMessage } from '../../utils/errorParser';

interface MailboxModalProps {
  show: boolean;
  modalContext: 'initial' | 'switch' | 'create';
  incompleteRegistration: IncompleteRegistration | null;
  creationProgress: CreationProgress | null;
  loading: boolean;
  error: string | null;
  userAddress: string;
  onClose: () => void;
  onSubmit: (pin: string, accountName: string, domain: string, isCreatingNew: boolean) => void;
  onSwitch: (pin: string) => void;
}

export const MailboxModal: React.FC<MailboxModalProps> = ({
  show,
  modalContext,
  incompleteRegistration,
  creationProgress,
  loading,
  error,
  userAddress,
  onClose,
  onSubmit,
  onSwitch,
}) => {
  // Internal state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newMailboxPin, setNewMailboxPin] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('hashd');
  const [availableDomains, setAvailableDomains] = useState<string[]>(['hashd']);
  const [accountNameError, setAccountNameError] = useState('');
  const [pinError, setPinError] = useState('');
  const [mailboxes, setMailboxes] = useState<MailboxInfo[]>([]);
  const [calculatedFee, setCalculatedFee] = useState<string | null>(null);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [isFirstAccountEligible, setIsFirstAccountEligible] = useState<boolean | null>(null);
  const [nameAvailability, setNameAvailability] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [otherDomainsAvailability, setOtherDomainsAvailability] = useState<Record<string, boolean>>({});
  const [showPin, setShowPin] = useState(false);
  
  const isWaitlistMode = process.env.REACT_APP_WAITLIST_MODE === 'true';

  // Helper function to check if user is eligible for first account benefits
  const checkFirstAccountEligibility = async () => {
    try {
      const currentMailboxes = SimpleKeyManager.getMailboxList();
      
      // Check blockchain for existing named accounts
      let hasOnChainNamedAccounts = false;
      try {
        // Validate userAddress before making blockchain call
        if (!userAddress || userAddress === '') {
          console.log('⚠️ No user address available, skipping blockchain check');
          hasOnChainNamedAccounts = false;
        } else {
          console.log(`🔍 Checking blockchain for named accounts for address: ${userAddress}`);
          const namedAccounts = await contractService.getOwnerHashIDs(userAddress);
          hasOnChainNamedAccounts = namedAccounts.length > 0;
          console.log(`🔗 Blockchain check - Named accounts: ${namedAccounts.length}`, namedAccounts);
        }
      } catch (error) {
        console.log('Could not check blockchain named accounts:', error);
        hasOnChainNamedAccounts = false;
      }
      
      const isFirstAccount = currentMailboxes.length === 0 && !hasOnChainNamedAccounts;
      setIsFirstAccountEligible(isFirstAccount);
      return isFirstAccount;
    } catch (error) {
      console.error('Error checking first account eligibility:', error);
      setIsFirstAccountEligible(false);
      return false;
    }
  };

  // Helper function to check name availability
  const checkNameAvailability = async (name: string, domain: string) => {
    if (!name || name.length < 2) {
      setNameAvailability(null);
      return;
    }

    setIsCheckingAvailability(true);
    setNameAvailability('checking');

    try {
      // Check if name is available on blockchain
      const isAvailable = await contractService.isNameAvailable(name, domain);
      setNameAvailability(isAvailable ? 'available' : 'taken');
      
      console.log(`🔍 Name availability check: "${name}.${domain}" is ${isAvailable ? 'available' : 'taken'}`);
    } catch (error) {
      console.error('Failed to check name availability:', error);
      setNameAvailability(null);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Check availability across all other domains
  const checkOtherDomainsAvailability = async (name: string) => {
    if (!name || name.length < 2) {
      setOtherDomainsAvailability({});
      return;
    }

    try {
      const results: Record<string, boolean> = {};
      
      // Check all domains except the selected one
      const otherDomains = availableDomains.filter(d => d !== selectedDomain);
      
      await Promise.all(
        otherDomains.map(async (domain) => {
          try {
            const isAvailable = await contractService.isNameAvailable(name, domain);
            results[domain] = isAvailable;
          } catch (error) {
            console.error(`Failed to check availability for ${domain}:`, error);
          }
        })
      );
      
      setOtherDomainsAvailability(results);
    } catch (error) {
      console.error('Failed to check other domains availability:', error);
    }
  };

  // Fetch available domains on mount
  useEffect(() => {

    if (isWaitlistMode) return
    const fetchDomains = async () => {
      try {
        const domains = await contractService.getAvailableDomains();
        if (domains.length > 0) {
          setAvailableDomains(domains);
          // Set default to 'hashd' if available, otherwise first domain
          if (domains.includes('hashd')) {
            setSelectedDomain('hashd');
          } else {
            setSelectedDomain(domains[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch available domains:', error);
        // Keep default 'hashd'
      }
    };
    fetchDomains();
  }, []);

  // Load mailboxes and reset state when modal opens/closes
  useEffect(() => {
    if (show && userAddress) {
      // Load mailboxes from localStorage
      setMailboxes(SimpleKeyManager.getMailboxList());
      // Check first account eligibility
      checkFirstAccountEligibility();
    } else if (show && !userAddress) {
      // If modal is open but no userAddress yet, just load mailboxes
      setMailboxes(SimpleKeyManager.getMailboxList());
      setIsFirstAccountEligible(null);
    } else {
      // Reset form state when closing
      setIsCreatingNew(false);
      setNewMailboxPin('');
      setNewAccountName('');
      setAccountNameError('');
      setPinError('');
      setCalculatedFee(null);
      setIsCalculatingFee(false);
      setIsFirstAccountEligible(null);
      setNameAvailability(null);
      setIsCheckingAvailability(false);
    }
  }, [show, userAddress]);

  // Reset to access mode when switching contexts
  useEffect(() => {
    if (modalContext === 'switch') {
      setIsCreatingNew(false);
    } else if (modalContext === 'create') {
      setIsCreatingNew(true);
    }
  }, [modalContext]);

  if (!show) return null;

  // Handler for account name changes with validation and fee calculation
  const handleAccountNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Check for uppercase characters
    if (/[A-Z]/.test(input)) {
      setAccountNameError('Uppercase letters not allowed. Use lowercase only.');
    } else {
      setAccountNameError('');
    }
    
    // Convert to lowercase and remove invalid characters
    const name = input.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    setNewAccountName(name);
    
    // Check length limit
    if (input.length > 15) {
      setAccountNameError('Maximum 15 characters allowed.');
    }
    
    // Check name availability and calculate fee for this name length
    if (name.length > 0) {
      // Check availability for selected domain
      checkNameAvailability(name, selectedDomain);
      
      // Check availability across all other domains
      checkOtherDomainsAvailability(name);
      
      setIsCalculatingFee(true);
      try {
        const fee = await contractService.calculateNameFee(name, selectedDomain);
        
        // Check if this is truly the first account by checking both local storage AND blockchain
        const currentMailboxes = SimpleKeyManager.getMailboxList();
        
        // Check blockchain for existing named accounts for this wallet
        let hasOnChainNamedAccounts = false;
        try {
          // Validate userAddress before making blockchain call
          if (!userAddress || userAddress === '') {
            console.log('⚠️ No user address available, skipping blockchain check');
            hasOnChainNamedAccounts = false;
          } else {
            console.log(`🔍 Checking blockchain for named accounts for address: ${userAddress}`);
            // Get all named accounts for this wallet address from blockchain
            const namedAccounts = await contractService.getOwnerHashIDs(userAddress);
            hasOnChainNamedAccounts = namedAccounts.length > 0;
            console.log(`🔗 Blockchain check - Named accounts: ${namedAccounts.length}`, namedAccounts);
          }
        } catch (error) {
          console.log('Could not check blockchain named accounts:', error);
          // If we can't check blockchain, assume they might have accounts (safer approach)
          hasOnChainNamedAccounts = false;
        }
        
        // First account eligibility: no local mailboxes AND no on-chain named accounts
        const isFirstAccount = currentMailboxes.length === 0 && !hasOnChainNamedAccounts;
        const isFreeEligible = isFirstAccount && name.length >= 5;
        
        // Store first account eligibility for use in help text
        setIsFirstAccountEligible(isFirstAccount);
        
        console.log(`📊 Account eligibility check:`);
        console.log(`  - Local mailboxes: ${currentMailboxes.length}`);
        console.log(`  - On-chain named accounts: ${hasOnChainNamedAccounts ? 'Yes' : 'No'}`);
        console.log(`  - Name length: ${name.length}`);
        console.log(`  - Is first account: ${isFirstAccount}`);
        console.log(`  - Free eligible: ${isFreeEligible}`);
        
        if (isFreeEligible) {
          setCalculatedFee('FREE');
        } else {
          setCalculatedFee(ethers.formatEther(fee) + ' ETH');
        }
        console.log(`💰 Fee for "${name}": ${ethers.formatEther(fee)} ETH (Free eligible: ${isFreeEligible})`);
      } catch (error) {
        console.error('Failed to calculate fee:', error);
        setCalculatedFee(null);
      } finally {
        setIsCalculatingFee(false);
      }
    } else {
      setCalculatedFee(null);
    }
  };

  // Handler for domain changes - recalculate fee and check availability
  const handleDomainChange = async (domain: string) => {
    setSelectedDomain(domain);
    
    // Recalculate fee and check availability if name is entered
    if (newAccountName.length > 0) {
      checkNameAvailability(newAccountName, domain);
      checkOtherDomainsAvailability(newAccountName);
      
      setIsCalculatingFee(true);
      try {
        const fee = await contractService.calculateNameFee(newAccountName, domain);
        const currentMailboxes = SimpleKeyManager.getMailboxList();
        
        let hasOnChainNamedAccounts = false;
        if (userAddress) {
          try {
            const namedAccounts = await contractService.getOwnerHashIDs(userAddress);
            hasOnChainNamedAccounts = namedAccounts.length > 0;
          } catch (error) {
            console.log('Could not check blockchain named accounts:', error);
          }
        }
        
        const isFirstAccount = currentMailboxes.length === 0 && !hasOnChainNamedAccounts;
        const isFreeEligible = isFirstAccount && newAccountName.length >= 5;
        
        if (isFreeEligible) {
          setCalculatedFee('FREE');
        } else {
          setCalculatedFee(ethers.formatEther(fee) + ' ETH');
        }
      } catch (error) {
        console.error('Failed to calculate fee:', error);
        setCalculatedFee(null);
      } finally {
        setIsCalculatingFee(false);
      }
    }
  };

  // Handler for PIN changes with validation
  const handlePinChange = (pin: string) => {
    const cleanPin = pin.replace(/\D/g, '').slice(0, 8);
    setNewMailboxPin(cleanPin);
    
    // Only check localStorage during typing (fast, no signature required)
    if ((isCreatingNew || modalContext === 'create') && cleanPin.length >= 4) {
      checkLocalPinAvailability(cleanPin, newAccountName);
    } else {
      setPinError('');
    }
  };

  // Check PIN availability in localStorage only (fast, no wallet signature)
  const checkLocalPinAvailability = (pin: string, accountName: string) => {
    if (pin.length < 4 || !userAddress) {
      setPinError('');
      return;
    }

    try {
      const existingMailboxes = SimpleKeyManager.getMailboxList(userAddress);
      const localDuplicate = existingMailboxes.find(m => m.pin === pin && m.name !== accountName);
      if (localDuplicate) {
        setPinError(`This PIN is already used for "${localDuplicate.name}"`);
      } else {
        setPinError('');
      }
    } catch (error) {
      console.error('Error checking PIN:', error);
    }
  };

  // Handler for PIN keydown (Enter key)
  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newMailboxPin.length >= 4) {
      handleSubmit();
    }
  };

  // Handler for form submission
  const handleSubmit = () => {
    if (modalContext === 'switch' || (!isCreatingNew && modalContext === 'initial')) {
      onSwitch(newMailboxPin);
    } else if (isCreatingNew || modalContext === 'create') {
      // For bare accounts, use empty string as account name
      const accountName = newAccountName || '';
      onSubmit(newMailboxPin, accountName, selectedDomain, isCreatingNew);
    }
  };

  // Handler for modal close
  const handleClose = () => {
    setIsCreatingNew(false);
    setNewMailboxPin('');
    setNewAccountName('');
    setAccountNameError('');
    setPinError('');
    setCalculatedFee(null);
    setIsCalculatingFee(false);
    onClose();
  };

  const getModalTitle = () => {
    if (modalContext === 'switch') return 'Switch Mailbox';
    if (isCreatingNew || modalContext === 'create') return 'Create Mailbox';
    return 'Access Mailbox';
  };

  const getModalIcon = () => {
    if (modalContext === 'switch') return Key;
    return Inbox;
  };

  const getModalDescription = () => {
    if (modalContext === 'switch')
      return 'Enter your PIN to access a different mailbox';
    if (isCreatingNew)
      return mailboxes.length === 0
        ? 'Create unlimited mailboxes! Choose a HashID (human-readable name, 5+ chars FREE for first account).'
        : 'Create additional mailbox. Named accounts have fees, bare accounts are always free.';
    return 'Enter your PIN to access your existing mailbox';
  };

  const IconComponent = getModalIcon();

  return (
    <NeonModal
      isOpen={show}
      onClose={onClose}
      title={getModalTitle()}
      icon={IconComponent}
      maxWidth="md"
    >
      <div className="p-6">
        <p className="text-sm text-gray-400 font-mono mb-6">{getModalDescription()}</p>

        {/* Progress Stepper */}
        {creationProgress && (
          <div className="mb-6">
            <div className="space-y-3">
              {creationProgress.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium font-mono ${
                      step.status === 'completed'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : step.status === 'active'
                        ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                        : step.status === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                        : 'bg-gray-800/50 text-gray-500'
                    }`}
                  >
                    {step.status === 'completed' ? '✓' : step.status === 'error' ? '✗' : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold font-mono ${
                        step.status === 'error'
                          ? 'text-red-400'
                          : step.status === 'completed'
                          ? 'text-green-400'
                          : step.status === 'active'
                          ? 'text-cyan-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-300 font-mono mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle between Access and Create */}
        {!creationProgress && modalContext !== 'switch' && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setIsCreatingNew(false);
                setNewMailboxPin('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold font-mono uppercase tracking-wider transition-all ${
                !isCreatingNew
                  ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-800/50 text-gray-400 hover:border-cyan-500/30'
              }`}
            >
              Access
            </button>
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setNewMailboxPin('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold font-mono uppercase tracking-wider transition-all ${
                isCreatingNew
                  ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                  : 'bg-gray-800/50 text-gray-400 hover:border-cyan-500/30'
              }`}
            >
              Create New
            </button>
          </div>
        )}

        {/* Error Display */}
        {!creationProgress && error && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400 font-mono">{parseErrorMessage(error)}</p>
          </div>
        )}

        {!creationProgress && (
          <div className="space-y-4 mb-6">
            {/* Account Name Field (only for creation) */}
            {(isCreatingNew || modalContext === 'create') && (
              <>


                <div>
                  <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
                    <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                    Name (Optional)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        name="username"
                        autoComplete="off"
                        value={newAccountName}
                        onChange={handleAccountNameChange}
                        placeholder="e.g., alexx, mike, alice123 (or leave empty)"
                        className={`w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none font-mono text-sm transition-all ${
                          !newAccountName 
                            ? 'border border-gray-600 hover:border-cyan-500/50 focus:border-cyan-500'
                            : nameAvailability === 'available'
                            ? 'border-2 border-green-500/50 bg-green-500/5 focus:border-green-500'
                            : nameAvailability === 'taken'
                            ? 'border-2 border-red-500/50 bg-red-500/5 focus:border-red-500'
                            : nameAvailability === 'checking'
                            ? 'border-2 border-yellow-500/50 bg-yellow-500/5 focus:border-yellow-500'
                            : 'border border-gray-600 hover:border-cyan-500/50 focus:border-cyan-500'
                        }`}
                        autoFocus={modalContext === 'create'}
                      />
                      {/* Availability indicator */}
                      {newAccountName && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {isCheckingAvailability ? (
                            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          ) : nameAvailability === 'available' ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✓</span>
                            </div>
                          ) : nameAvailability === 'taken' ? (
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">✗</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: '120px' }}>
                      <select
                        value={selectedDomain}
                        onChange={(e) => handleDomainChange(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white font-mono text-sm focus:border-cyan-500 focus:outline-none transition-colors cursor-pointer"
                      >
                        {availableDomains.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 font-mono mb-2">
                      {newAccountName ? 'Lowercase alphanumeric, underscores only. Max 15 chars.' : 'You can leave empty for now and link a HashID later.'}
                    </p>
                    {accountNameError && (
                      <p className="text-xs text-red-400 mt-1 font-medium font-mono">⚠️ {accountNameError}</p>
                    )}
                    {newAccountName && !accountNameError && (
                      <>
                 
                        {/* Availability status */}
                        {nameAvailability === 'checking' && (
                          <p className="text-xs text-yellow-400 mt-1 font-mono">
                            🔍 Checking availability...
                          </p>
                        )}
                        {nameAvailability === 'available' && (
                          <p className="text-xs text-green-400 mt-1 font-mono">
                            ✅ <strong>{newAccountName}@{selectedDomain}</strong> is available!
                          </p>
                        )}
                        {nameAvailability === 'taken' && (
                          <p className="text-xs text-red-400 mt-1 font-mono">
                            ❌ <strong>{newAccountName}.{selectedDomain}</strong> is already taken
                          </p>
                        )}
                        {/* Show availability on other domains */}
                        {Object.keys(otherDomainsAvailability).length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700/50">
                            <p className="text-xs text-gray-400 font-mono mb-1">Other domains:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(otherDomainsAvailability).map(([domain, isAvailable]) => (
                                <span
                                  key={domain}
                                  className={`text-xs font-mono px-2 py-1 rounded ${
                                    isAvailable
                                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                      : 'bg-gray-700/30 text-gray-500 border border-gray-600/30'
                                  }`}
                                >
                                  {isAvailable ? '✓' : '✗'} .{domain}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
    
                  </div>
                </div>

                {/* Incomplete Registration Warning */}
                {incompleteRegistration ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-500/50">
                        <span className="text-yellow-400 text-lg">⚠️</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-yellow-400 mb-1 font-mono uppercase">
                          Incomplete Registration Detected
                        </p>
                        <p className="text-xs text-gray-300 mb-2 font-mono">
                          <strong className="text-yellow-400">{incompleteRegistration.fullName}</strong> is already
                          registered and paid for, but the final step (key registration) was not completed.
                        </p>
                        <p className="text-xs text-yellow-300 font-medium font-mono">
                          ✅ No payment required - Enter your PIN to complete registration
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-cyan-500/10 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-cyan-400 font-mono">Registration fee:</span>
                      <span className="text-sm font-bold text-cyan-300 font-mono">
                        {!newAccountName ? (
                          <span className="text-purple-400">FREE (Bare Account)</span>
                        ) : isCalculatingFee ? (
                          <span className="animate-pulse">Calculating...</span>
                        ) : calculatedFee ? (
                          calculatedFee
                        ) : (
                          'Enter name to see fee'
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {!newAccountName
                        ? ''
                        : isFirstAccountEligible && newAccountName.length >= 5
                        ? '🎉 First named account with 5+ characters is FREE!'
                        : 'Named accounts require blockchain registration. Shorter names cost more.'}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* PIN Input */}
            <div>
              <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
                <div className="w-1 h-4 bg-cyan-500 rounded-full"></div>
                PIN Code (4-8 digits)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  name="mailbox-pin"
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  value={showPin ? newMailboxPin : '•'.repeat(newMailboxPin.length)}
                  onChange={(e) => {
                    // Only allow the actual value to be updated, not the masked version
                    if (showPin) {
                      handlePinChange(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle backspace and delete when masked
                    if (!showPin && (e.key === 'Backspace' || e.key === 'Delete')) {
                      e.preventDefault();
                      if (e.key === 'Backspace' && newMailboxPin.length > 0) {
                        handlePinChange(newMailboxPin.slice(0, -1));
                      }
                    } else if (!showPin && e.key.length === 1 && /[0-9]/.test(e.key)) {
                      e.preventDefault();
                      handlePinChange(newMailboxPin + e.key);
                    } else {
                      handlePinKeyDown(e);
                    }
                  }}
                  placeholder="Enter PIN"
                  className={`w-full px-4 py-3 pr-12 bg-gray-900/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-lg transition-colors ${
                    pinError ? 'border-red-500/50 bg-red-900/20' : 'border-cyan-500/30'
                  }`}
                  maxLength={8}
                  autoFocus={modalContext === 'switch' || modalContext === 'initial'}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {pinError ? (
                <p className="text-xs text-red-400 mt-1 font-mono">⚠️ {pinError}</p>
              ) : (
                <div className="mt-2 p-3 bg-cyan-500/10 rounded-lg">
                  <p className="text-xs text-cyan-300 font-mono">
                    <strong className="text-cyan-400">🔐 Security:</strong> Your PIN combines with your wallet
                    signature to create a unique encryption key pair.
                    {(isCreatingNew || modalContext === 'create') && (
                      <span> Choose a strong, unique PIN - each PIN creates a separate Mailbox with its own keys.</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!creationProgress && (
          <div className="flex gap-3 pt-4 border-cyan-500/20">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider font-mono transition-all bg-red-500/10 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                newMailboxPin.length < 4 ||
                !!pinError ||
                !!accountNameError ||
                isCalculatingFee ||
                isCheckingAvailability ||
                (!!newAccountName && nameAvailability === 'taken')
              }
              className="flex-1 px-6 py-2.5 bg-cyan-500/10 hover:border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 rounded-lg font-bold text-sm uppercase tracking-wider font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              )}
              {loading
                ? modalContext === 'switch'
                  ? 'Switching...'
                  : isCreatingNew || modalContext === 'create'
                  ? incompleteRegistration
                    ? 'Completing...'
                    : 'Creating...'
                  : 'Accessing...'
                : modalContext === 'switch'
                ? 'Switch'
                : isCreatingNew || modalContext === 'create'
                ? incompleteRegistration
                  ? 'Complete Registration'
                  : 'Create Mailbox'
                : 'Access Mailbox'}
            </button>
          </div>
        )}
      </div>
    </NeonModal>
  );
};
