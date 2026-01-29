import React, { useState } from 'react';
import { X, Users, Percent, AlertCircle, CheckCircle, Download, TrendingUp, Wallet, Copy, Upload } from 'lucide-react';
import { ethers } from 'ethers';
import { generateMerkleTree, calculateDistribution, getDistributionSummary, AirdropRecipient } from '../../utils/merkleTree';
import { LoadingState } from '../Spinner';

interface DistributeTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: string;
  ownerAddress: string;
  onDistribute: (merkleRoot: string, ownerPercentage: number, bondingCurvePercentage: number, recipients: AirdropRecipient[]) => Promise<void>;
  distributionSet?: boolean; // If true, show read-only view
}

export const DistributeTokenModal: React.FC<DistributeTokenModalProps> = ({
  isOpen,
  onClose,
  tokenAddress,
  tokenName,
  tokenSymbol,
  totalSupply,
  ownerAddress,
  onDistribute,
  distributionSet = false
}) => {
  const [ownerPercentage, setOwnerPercentage] = useState(5);
  const [bondingCurvePercentage, setBondingCurvePercentage] = useState(50);
  const [recipientAddresses, setRecipientAddresses] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingDistribution, setIsLoadingDistribution] = useState(false);
  const [merkleData, setMerkleData] = useState<{
    root: string;
    recipients: AirdropRecipient[];
    ownerPercentage?: number;
    bondingCurvePercentage?: number;
    totalSupply?: string;
    airdropAmount?: string; // Actual airdrop amount from contract
  } | null>(null);

  // Load existing distribution data from localStorage and contract
  React.useEffect(() => {
    const loadDistributionData = async () => {
      if (isOpen && distributionSet) {
        setIsLoadingDistribution(true);
        
        // Load recipient data from localStorage
        const storageKey = `airdrop_${tokenAddress.toLowerCase()}`;
        const airdropData = localStorage.getItem(storageKey);
        
        let recipients: AirdropRecipient[] = [];
        if (airdropData) {
          const data = JSON.parse(airdropData);
          recipients = data.recipients || [];
        }
        
        // Fetch distribution info from the smart contract
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const tokenContract = new ethers.Contract(
            tokenAddress,
            [
              'function totalSupply() view returns (uint256)',
              'function getDistributionInfo() view returns (uint256 owner_, uint256 platform_, uint256 airdrop_, uint256 bondingCurve_, bool isSet_)'
            ],
            provider
          );
          
          const [ownerAllocated, platformAllocated, airdropAllocated, bondingCurveAllocated, isSet] = 
            await tokenContract.getDistributionInfo();
          const supply = await tokenContract.totalSupply();
          
          if (isSet) {
            // Calculate percentages from on-chain amounts
            const supplyNum = parseFloat(ethers.formatUnits(supply, 18));
            const ownerPercentage = (parseFloat(ethers.formatUnits(ownerAllocated, 18)) / supplyNum) * 100;
            const bondingCurvePercentage = (parseFloat(ethers.formatUnits(bondingCurveAllocated, 18)) / supplyNum) * 100;
            const airdropAmount = ethers.formatUnits(airdropAllocated, 18);
            
            console.log('📊 Distribution data from contract:', {
              ownerAllocated: ethers.formatUnits(ownerAllocated, 18),
              platformAllocated: ethers.formatUnits(platformAllocated, 18),
              airdropAllocated: ethers.formatUnits(airdropAllocated, 18),
              bondingCurveAllocated: ethers.formatUnits(bondingCurveAllocated, 18),
              totalSupply: ethers.formatUnits(supply, 18),
              recipients: recipients.length
            });
            
            setMerkleData({
              root: 'loaded',
              recipients,
              ownerPercentage,
              bondingCurvePercentage,
              totalSupply: ethers.formatUnits(supply, 18),
              airdropAmount
            });
          } else {
            // Fallback to localStorage data if available
            setMerkleData({
              root: 'loaded',
              recipients,
              ownerPercentage: undefined,
              bondingCurvePercentage: undefined,
              totalSupply: undefined
            });
          }
        } catch (error) {
          console.error('Error fetching distribution info from contract:', error);
          // Fallback to localStorage only
          setMerkleData({
            root: 'loaded',
            recipients,
            ownerPercentage: undefined,
            bondingCurvePercentage: undefined,
            totalSupply: undefined
          });
        } finally {
          setIsLoadingDistribution(false);
        }
      }
    };
    
    loadDistributionData();
  }, [isOpen, distributionSet, tokenAddress]);

  if (!isOpen) return null;

  const handleDistribute = async () => {
    try {
      setError('');
      setIsDistributing(true);

      // Parse recipient addresses
      const addresses = recipientAddresses
        .split(',')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0);

      if (addresses.length === 0) {
        setError('Please enter at least one recipient address');
        return;
      }

      // Validate addresses
      for (const addr of addresses) {
        if (!ethers.isAddress(addr)) {
          setError(`Invalid address: ${addr}`);
          return;
        }
      }

      // Check if owner address is in recipient list
      const ownerInList = addresses.some(addr => addr.toLowerCase() === ownerAddress.toLowerCase());
      if (ownerInList) {
        setError('Owner address cannot be in the recipient list. You will receive your allocation (owner percentage) automatically.');
        return;
      }

      // Calculate distribution (only airdrop recipients)
      const recipients = calculateDistribution(
        totalSupply,
        ownerPercentage,
        bondingCurvePercentage,
        addresses
      );

      // Generate merkle tree
      const { merkleRoot, proofs, recipients: finalRecipients } = generateMerkleTree(recipients);

      // Store merkle data for download
      setMerkleData({
        root: merkleRoot,
        recipients: finalRecipients,
        ownerPercentage,
        bondingCurvePercentage,
        totalSupply
      });

      // Save proofs and distribution details to localStorage for claiming
      localStorage.setItem(
        `airdrop_${tokenAddress.toLowerCase()}`,
        JSON.stringify({ 
          merkleRoot, 
          proofs, 
          recipients: finalRecipients,
          ownerPercentage,
          bondingCurvePercentage,
          totalSupply,
          timestamp: new Date().toISOString()
        })
      );

      // Call contract to set distribution
      await onDistribute(merkleRoot, ownerPercentage, bondingCurvePercentage, finalRecipients);

      // Store distribution data in localStorage (not on vault nodes)
      const distributionData = {
        tokenName,
        tokenSymbol,
        totalSupply,
        merkleRoot,
        recipients: finalRecipients.map(r => ({
          address: r.address,
          amount: r.amount,
          proof: proofs[r.address.toLowerCase()] || []
        })),
        ownerPercentage,
        bondingCurvePercentage,
        timestamp: new Date().toISOString()
      };

      const storageData = JSON.parse(
        localStorage.getItem(`airdrop_${tokenAddress.toLowerCase()}`) || '{}'
      );
      storageData.distributionData = distributionData;
      localStorage.setItem(
        `airdrop_${tokenAddress.toLowerCase()}`,
        JSON.stringify(storageData)
      );
      console.log('✅ Distribution data stored locally');

      setSuccess(true);
    } catch (err: any) {
      console.error('Distribution error:', err);
      setError(err.message || 'Failed to distribute tokens');
    } finally {
      setIsDistributing(false);
    }
  };

  const downloadMerkleData = () => {
    if (!merkleData) return;

    const data = {
      tokenAddress,
      tokenName,
      tokenSymbol,
      merkleRoot: merkleData.root,
      recipients: merkleData.recipients,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tokenSymbol}_airdrop_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!merkleData || !merkleData.recipients) return;

    // Create CSV header
    const header = 'Address,Amount,Token Symbol\n';
    
    // Create CSV rows
    const rows = merkleData.recipients
      .map(r => `${r.address},${r.amount},${tokenSymbol}`)
      .join('\n');
    
    const csv = header + rows;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tokenSymbol}_distribution_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTokenToWallet = async () => {
    try {
      const wasAdded = await (window as any).ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: 18,
            image: '', // Optional: Add token logo URL if available
          },
        },
      });

      if (wasAdded) {
        console.log('Token added to wallet!');
      }
    } catch (error) {
      console.error('Failed to add token to wallet:', error);
      setError('Failed to add token to wallet. Please add it manually.');
    }
  };

  const totalRecipients = recipientAddresses.split(',').filter(a => a.trim()).length;
  const summary = getDistributionSummary(totalSupply, ownerPercentage, bondingCurvePercentage, totalRecipients);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/95 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold neon-text-cyan uppercase tracking-wider font-mono">
              {distributionSet ? 'Distribution Details' : 'Distribute Tokens'}
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-mono">
              {tokenName} ({tokenSymbol})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {distributionSet ? (
            /* Read-only view for existing distribution */
            <div className="py-4">
              {isLoadingDistribution ? (
                /* Loading State */
                <LoadingState 
                  message="Fetching allocation details from blockchain..." 
                  className="py-12"
                />
              ) : (
                <>
                  <div className="text-center mb-6">
                    <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold neon-text-cyan mb-2 uppercase tracking-wider font-mono">Distribution Complete</h3>
                    <p className="text-gray-300 font-mono">
                      Token distribution has been set on-chain. Recipients can now claim their tokens.
                    </p>
                  </div>
              
              {/* Token Info Card */}
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6 mb-6">
                <h4 className="font-bold text-purple-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                  <Wallet className="w-5 h-5 text-purple-400" />
                  Token Information
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-bold text-purple-400 mb-1 uppercase tracking-wider font-mono">Token Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-gray-900/50 border border-purple-500/30 px-3 py-2 rounded flex-1 text-purple-300">
                        {tokenAddress}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(tokenAddress);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="p-2 hover:bg-purple-500/10 rounded transition-colors"
                        title={copied ? 'Copied!' : 'Copy address'}
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-purple-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={addTokenToWallet}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/50 text-purple-400 rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
                  >
                    <Wallet className="w-5 h-5" />
                    Add {tokenSymbol} to MetaMask
                  </button>
                </div>
              </div>

              {merkleData && merkleData.recipients && (
                <>
                  {/* Complete Allocation Breakdown */}
                  {(() => {
                    console.log('🎨 Rendering with merkleData:', {
                      hasOwnerPercentage: merkleData.ownerPercentage !== undefined,
                      hasBondingCurve: merkleData.bondingCurvePercentage !== undefined,
                      hasTotalSupply: !!merkleData.totalSupply,
                      hasAirdropAmount: !!merkleData.airdropAmount,
                      airdropAmount: merkleData.airdropAmount,
                      recipientsCount: merkleData.recipients.length
                    });
                    return null;
                  })()}
                  {merkleData.ownerPercentage !== undefined && merkleData.bondingCurvePercentage !== undefined && merkleData.totalSupply ? (
                    /* Complete allocation breakdown */
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-green-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        Complete Allocation Breakdown
                      </h4>
                      <div className="space-y-3">
                        {/* Total Supply */}
                        <div className="flex justify-between items-center pb-3 border-b border-green-500/20">
                          <span className="text-sm font-bold text-gray-300 uppercase tracking-wider font-mono">Total Supply</span>
                          <span className="text-lg font-bold text-green-400 font-mono">
                            {parseFloat(merkleData.totalSupply).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                        
                        {/* Owner Allocation */}
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-bold text-gray-300 font-mono">Owner Allocation</span>
                            <span className="text-xs text-gray-500 ml-2 font-mono">({merkleData.ownerPercentage}%)</span>
                          </div>
                          <span className="text-base font-bold text-gray-200 font-mono">
                            {(parseFloat(merkleData.totalSupply) * merkleData.ownerPercentage / 100).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                        
                        {/* Platform Fee */}
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-bold text-gray-300 font-mono">Platform Fee</span>
                            <span className="text-xs text-gray-500 ml-2 font-mono">(1%)</span>
                          </div>
                          <span className="text-base font-bold text-gray-200 font-mono">
                            {(parseFloat(merkleData.totalSupply) * 1 / 100).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                        
                        {/* Bonding Curve */}
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-bold text-gray-300 font-mono">Bonding Curve</span>
                            <span className="text-xs text-gray-500 ml-2 font-mono">({merkleData.bondingCurvePercentage}%)</span>
                          </div>
                          <span className="text-base font-bold text-gray-200 font-mono">
                            {(parseFloat(merkleData.totalSupply) * merkleData.bondingCurvePercentage / 100).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                        
                        {/* Airdrop */}
                        <div className="flex justify-between items-center pb-3 border-b border-green-500/20">
                          <div>
                            <span className="text-sm font-bold text-gray-300 font-mono">Airdrop</span>
                            <span className="text-xs text-gray-500 ml-2 font-mono">
                              ({(100 - merkleData.ownerPercentage - 1 - merkleData.bondingCurvePercentage).toFixed(1)}%)
                            </span>
                          </div>
                          <span className="text-base font-bold text-gray-200 font-mono">
                            {merkleData.airdropAmount ? parseFloat(merkleData.airdropAmount).toLocaleString() : merkleData.recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                        
                        {/* Recipients Count */}
                        {/* <div className="flex justify-between items-center pt-2">
                          <span className="text-sm font-medium text-gray-700">Total Recipients</span>
                          <span className="text-lg font-bold text-green-600">{merkleData.recipients.length}</span>
                        </div> */}
                      </div>
                    </div>
                  ) : (
                    /* Fallback for old distributions without saved percentages */
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-yellow-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                        <AlertCircle className="w-5 h-5 text-yellow-400" />
                        Distribution Information
                      </h4>
                      <p className="text-sm text-gray-300 mb-4 font-mono">
                        This distribution was created before detailed allocation tracking was implemented. 
                        Only airdrop recipient data is available.
                      </p>
                      <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-gray-300 font-mono">Total Airdrop Amount</span>
                          <span className="text-lg font-bold text-yellow-400 font-mono">
                            {merkleData.recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()} {tokenSymbol}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 font-mono">
                        💡 New distributions will include complete allocation breakdown (owner, platform, bonding curve, and airdrop percentages).
                      </p>
                    </div>
                  )}

                  {/* Distribution Summary Card (Simplified) */}
                  {merkleData.recipients.length > 0 ? (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-yellow-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                        <Users className="w-5 h-5 text-yellow-400" />
                        Airdrop Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-mono font-bold">Recipients</p>
                          <p className="text-2xl font-bold text-yellow-400 font-mono">{merkleData.recipients.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-mono font-bold">Per Recipient</p>
                          <p className="text-2xl font-bold text-yellow-400 font-mono">
                            {((merkleData.airdropAmount ? parseFloat(merkleData.airdropAmount) : merkleData.recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0)) / merkleData.recipients.length).toLocaleString()}
                          </p>
                          <p className="text-sm text-yellow-400 font-mono">{tokenSymbol}</p>
                        </div>
                      </div>
                    </div>
                  ) : merkleData.airdropAmount && parseFloat(merkleData.airdropAmount) > 0 ? (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-6">
                      <h4 className="font-bold text-yellow-400 mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                        <Users className="w-5 h-5 text-yellow-400" />
                        Airdrop Summary
                      </h4>
                      <p className="text-sm text-gray-300 mb-3 font-mono">
                        Recipient details are only available to the token deployer. The total airdrop allocation is shown above.
                      </p>
                      <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-mono font-bold">Total Airdrop Amount</p>
                        <p className="text-2xl font-bold text-yellow-400 font-mono">
                          {parseFloat(merkleData.airdropAmount).toLocaleString()} {tokenSymbol}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Recipients List - Only show if we have recipients */}
                  {merkleData.recipients.length > 0 && (
                    <div className="bg-gray-800/50 rounded-lg mb-6">
                      <div className="px-4 py-3 border-b border-cyan-500/20 bg-gray-900/50">
                        <h4 className="font-bold text-cyan-400 uppercase tracking-wider font-mono">Recipients ({merkleData.recipients.length})</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-900/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Address</th>
                              <th className="px-4 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-700/30">
                            {merkleData.recipients.map((recipient, idx) => (
                              <tr key={idx} className="hover:bg-gray-700/20">
                                <td className="px-4 py-2 text-sm font-mono text-gray-300">
                                  {recipient.address.slice(0, 6)}...{recipient.address.slice(-4)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-bold text-cyan-400 font-mono">
                                  {parseFloat(recipient.amount).toLocaleString()} {tokenSymbol}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Download Buttons */}
              <div className="space-y-3">
                <button
                  onClick={downloadCSV}
                  disabled={!merkleData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/30 hover:border-green-500/50 text-green-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono uppercase tracking-wider"
                >
                  <Download className="w-5 h-5" />
                  Download CSV
                </button>
                <button
                  onClick={downloadMerkleData}
                  disabled={!merkleData}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono uppercase tracking-wider"
                >
                  <Download className="w-5 h-5" />
                  Download JSON (Merkle Data)
                </button>
                <button
                  onClick={onClose}
                  className="w-full px-6 py-3 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
                </>
              )}
            </div>
          ) : success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold neon-text-cyan mb-2 uppercase tracking-wider font-mono">Distribution Complete!</h3>
              <p className="text-gray-300 mb-6 font-mono">
                Merkle root has been set. Recipients can now claim their tokens.
              </p>
              
              <button
                onClick={downloadMerkleData}
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all font-bold font-mono uppercase tracking-wider"
              >
                <Download className="w-5 h-5" />
                Download Distribution Data
              </button>
              
              {/* <button
                onClick={onClose}
                className="block w-full mt-4 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button> */}
            </div>
          ) : (
            <>
              {/* Total Supply Info */}
              <div className="bg-cyan-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-cyan-400 uppercase tracking-wider font-mono">Total Supply</span>
                </div>
                <p className="text-2xl font-bold text-cyan-400 font-mono">
                  {parseFloat(totalSupply).toLocaleString()} {tokenSymbol}
                </p>
              </div>

              {/* Owner Percentage */}
              <div>
                <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  <Percent className="w-4 h-4 inline mr-1" />
                  Your Allocation (0-10%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={ownerPercentage}
                  onChange={(e) => setOwnerPercentage(Math.min(10, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                  disabled={isDistributing}
                />
                <p className="text-sm text-gray-300 mt-1 font-mono">
                  You will receive: {summary.owner.toLocaleString()} {tokenSymbol}
                </p>
                <p className="text-xs text-cyan-400 mt-1 font-mono">
                  ℹ️ You receive this automatically - don't add your address to recipients below
                </p>
              </div>

              {/* Bonding Curve Percentage */}
              <div>
                <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Bonding Curve Allocation (0-60%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  value={bondingCurvePercentage}
                  onChange={(e) => setBondingCurvePercentage(Math.min(60, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors"
                  disabled={isDistributing}
                />
                <p className="text-sm text-gray-300 mt-1 font-mono">
                  For sale: {summary.bondingCurve.toLocaleString()} {tokenSymbol}
                </p>
              </div>

              {/* Platform Fee */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-300 font-mono">
                  <strong className="text-gray-200">Platform Fee:</strong> 1% ({summary.platform.toLocaleString()} {tokenSymbol})
                </p>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  Automatically sent to GroupFactory owner
                </p>
              </div>

              {/* Recipient Addresses */}
              <div>
                <label className="block text-xs font-bold neon-text-cyan uppercase tracking-wider mb-2 font-mono">
                  Recipient Addresses (comma-separated)
                </label>
                <textarea
                  value={recipientAddresses}
                  onChange={(e) => setRecipientAddresses(e.target.value)}
                  placeholder="0x123..., 0x456..., 0x789..."
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-900/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 hover:border-cyan-500/50 font-mono text-sm transition-colors resize-none"
                  disabled={isDistributing}
                />
                <p className="text-sm text-gray-300 mt-1 font-mono">
                  {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} • 
                  {totalRecipients > 0 && ` ${summary.perRecipient.toLocaleString()} ${tokenSymbol} each`}
                </p>
              </div>

              {/* Distribution Summary */}
              {totalRecipients > 0 && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="font-bold text-green-400 mb-2 uppercase tracking-wider font-mono">Distribution Summary</h4>
                  <div className="space-y-1 text-sm text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span>Owner ({ownerPercentage}%):</span>
                      <span className="font-bold text-green-400">{summary.owner.toLocaleString()} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform (1%):</span>
                      <span className="font-bold text-green-400">{summary.platform.toLocaleString()} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bonding Curve ({bondingCurvePercentage}%):</span>
                      <span className="font-bold text-green-400">{summary.bondingCurve.toLocaleString()} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Airdrop ({summary.airdropPercentage.toFixed(1)}%):</span>
                      <span className="font-bold text-green-400">{summary.airdrop.toLocaleString()} {tokenSymbol}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-green-500/30 font-bold text-green-400">
                      <span>Total:</span>
                      <span>{parseFloat(totalSupply).toLocaleString()} {tokenSymbol}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400 font-mono">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isDistributing}
                  className="flex-1 px-6 py-3 bg-gray-700/50 hover:border-gray-500/50 text-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={isDistributing || totalRecipients === 0}
                  className="flex-1 px-6 py-3 bg-cyan-500/10 hover:border-cyan-500/50 neon-text-cyan rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold font-mono uppercase tracking-wider"
                >
                  {isDistributing ? 'Distributing...' : 'Distribute Tokens'}
                </button>
              </div>

              {/* Info */}
              <div className="bg-cyan-900/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-bold mb-1 text-cyan-400 uppercase tracking-wider font-mono">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 font-mono">
                      <li>A merkle tree is generated from the distribution</li>
                      <li>The merkle root is stored on-chain</li>
                      <li>Recipients can claim their tokens with a proof</li>
                      <li>Each address can only claim once</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
