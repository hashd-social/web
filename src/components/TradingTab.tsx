import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TrendingUp, TrendingDown, ArrowUpDown, Rocket, Users, Activity, DollarSign } from 'lucide-react';
import { PriceChart } from './PriceChart';
import { useNotify } from './Toast';

interface TradingTabProps {
  bondingCurveAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  userAddress: string;
  isOwner: boolean;
}

interface PoolStats {
  price: string;
  supply: string;
  poolBalance: string;
  volume: string;
  holders: string;
  buys: string;
  sells: string;
  graduated: boolean;
}

export const TradingTab: React.FC<TradingTabProps> = ({
  bondingCurveAddress,
  tokenAddress,
  tokenSymbol,
  tokenName,
  userAddress,
  isOwner,
}) => {
  const notify = useNotify();
  const [isBuying, setIsBuying] = useState(true);
  const [amount, setAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [slippage, setSlippage] = useState('1');
  const [isTrading, setIsTrading] = useState(false);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [userBalance, setUserBalance] = useState('0');
  const [canGraduate, setCanGraduate] = useState(false);
  const [isGraduating, setIsGraduating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pool stats
  useEffect(() => {
    loadPoolStats();
    loadUserBalance();
    const interval = setInterval(() => {
      loadPoolStats();
      loadUserBalance();
    }, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [bondingCurveAddress, userAddress]);

  const loadPoolStats = async () => {
    try {
      const { contractService } = await import('../utils/contracts');
      const stats = await contractService.getBondingCurveStats(bondingCurveAddress);
      setPoolStats(stats);
      
      const canGrad = await contractService.canGraduate(bondingCurveAddress);
      setCanGraduate(canGrad);
    } catch (err) {
      console.error('Error loading pool stats:', err);
    }
  };

  const loadUserBalance = async () => {
    try {
      const { contractService } = await import('../utils/contracts');
      const balance = await contractService.getTokenBalance(tokenAddress, userAddress);
      setUserBalance(balance);
    } catch (err) {
      console.error('Error loading user balance:', err);
    }
  };

  const handleAmountChange = async (value: string) => {
    setAmount(value);
    if (!value || isNaN(parseFloat(value))) {
      setEthAmount('');
      return;
    }

    try {
      const { contractService } = await import('../utils/contracts');
      const tokenAmount = ethers.parseUnits(value, 18);
      
      if (isBuying) {
        const cost = await contractService.getBuyPrice(bondingCurveAddress, tokenAmount.toString());
        setEthAmount(ethers.formatEther(cost));
      } else {
        const proceeds = await contractService.getSellPrice(bondingCurveAddress, tokenAmount.toString());
        setEthAmount(ethers.formatEther(proceeds));
      }
    } catch (err) {
      console.error('Error calculating price:', err);
    }
  };

  const handleEthAmountChange = async (value: string) => {
    setEthAmount(value);
    // Note: Calculating token amount from ETH requires binary search
    // For now, users should input token amount
  };

  const handleTrade = async () => {
    if (!amount || !ethAmount) {
      setError('Please enter an amount');
      return;
    }

    setIsTrading(true);
    setError(null);

    try {
      const { contractService } = await import('../utils/contracts');
      const tokenAmount = ethers.parseUnits(amount, 18);
      const slippagePercent = parseFloat(slippage);

      if (isBuying) {
        const ethCost = ethers.parseEther(ethAmount);
        const minTokens = (tokenAmount * BigInt(100 - slippagePercent)) / BigInt(100);
        
        await contractService.buyTokens(
          bondingCurveAddress,
          minTokens.toString(),
          ethCost.toString()
        );
        
        notify.success(`Successfully bought ${amount} ${tokenSymbol}!`);
      } else {
        const minEth = (ethers.parseEther(ethAmount) * BigInt(100 - slippagePercent)) / BigInt(100);
        
        await contractService.sellTokens(
          bondingCurveAddress,
          tokenAmount.toString(),
          minEth.toString()
        );
        
        notify.success(`Successfully sold ${amount} ${tokenSymbol}!`);
      }

      setAmount('');
      setEthAmount('');
      await loadPoolStats();
      await loadUserBalance();
    } catch (err: any) {
      console.error('Trade error:', err);
      setError(err.message || 'Transaction failed');
    } finally {
      setIsTrading(false);
    }
  };

  const handleGraduate = async () => {
    if (!window.confirm('Are you sure you want to initiate graduation to Uniswap? This cannot be undone.')) {
      return;
    }

    setIsGraduating(true);
    setError(null);

    try {
      const { contractService } = await import('../utils/contracts');
      await contractService.initiateGraduation(bondingCurveAddress);
      
      notify.success('Graduation initiated! The relayer will complete the Uniswap migration shortly.');
      await loadPoolStats();
    } catch (err: any) {
      console.error('Graduation error:', err);
      setError(err.message || 'Graduation failed');
    } finally {
      setIsGraduating(false);
    }
  };

  if (!poolStats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (poolStats.graduated) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-8 text-center">
        <Rocket className="w-16 h-16 text-primary-600 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-neutral-900 mb-2">Graduated to Uniswap! 🎉</h3>
        <p className="text-neutral-600 mb-4">
          This token has graduated from the bonding curve and is now trading on Uniswap.
        </p>
        <a
          href={`https://app.uniswap.org/#/swap?outputCurrency=${tokenAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Trade on Uniswap
        </a>
      </div>
    );
  }

  const progressPercent = (parseFloat(poolStats.poolBalance) / 10) * 100; // 10 ETH graduation threshold

  return (
    <div className="space-y-6">
      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-600 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Price
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {parseFloat(ethers.formatEther(poolStats.price)).toFixed(8)} ETH
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-600 text-sm mb-1">
            <Activity className="w-4 h-4" />
            Pool Balance
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {parseFloat(poolStats.poolBalance).toFixed(4)} ETH
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-600 text-sm mb-1">
            <Users className="w-4 h-4" />
            Holders
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {poolStats.holders}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center gap-2 text-neutral-600 text-sm mb-1">
            <ArrowUpDown className="w-4 h-4" />
            Volume
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {parseFloat(poolStats.volume).toFixed(2)} ETH
          </div>
        </div>
      </div>

      {/* Graduation Progress */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg border border-primary-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-primary-900">Graduation Progress</span>
          </div>
          <span className="text-sm font-medium text-primary-700">
            {poolStats.poolBalance} / 10 ETH
          </span>
        </div>
        <div className="w-full bg-primary-200 rounded-full h-3 mb-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          ></div>
        </div>
        <p className="text-sm text-primary-700">
          {progressPercent >= 100
            ? '🎉 Ready to graduate to Uniswap!'
            : `${(100 - progressPercent).toFixed(1)}% until graduation`}
        </p>
        
        {isOwner && canGraduate && (
          <button
            onClick={handleGraduate}
            disabled={isGraduating}
            className="mt-4 w-full border-2 border-primary-600 text-primary-600 py-3 px-4 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            {isGraduating ? 'Initiating...' : 'Initiate Graduation'}
          </button>
        )}
      </div>

      {/* Price Chart */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Price Chart</h3>
        <PriceChart bondingCurveAddress={bondingCurveAddress} />
      </div>

      {/* Trading Interface */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-900">Trade {tokenSymbol}</h3>
          <div className="text-sm text-neutral-600">
            Balance: <span className="font-semibold text-neutral-900">{parseFloat(userBalance).toFixed(2)} {tokenSymbol}</span>
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsBuying(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isBuying
                ? 'bg-green-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Buy
          </button>
          <button
            onClick={() => setIsBuying(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              !isBuying
                ? 'bg-red-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {isBuying ? 'You buy' : 'You sell'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                step="0.01"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium">
                {tokenSymbol}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowUpDown className="w-5 h-5 text-neutral-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {isBuying ? 'You pay' : 'You receive'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={ethAmount}
                readOnly
                placeholder="0.0"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-neutral-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 font-medium">
                ETH
              </div>
            </div>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {['0.5', '1', '2', '5'].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  slippage === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-20 px-3 py-2 border border-neutral-300 rounded-lg text-sm text-center"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Trade Button */}
        <button
          onClick={handleTrade}
          disabled={isTrading || !amount || !ethAmount}
          className="w-full bg-primary-600 text-white py-4 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTrading
            ? 'Processing...'
            : isBuying
            ? `Buy ${tokenSymbol}`
            : `Sell ${tokenSymbol}`}
        </button>

        {/* Trade Info */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-700">Current Price</span>
            <span className="font-medium text-blue-900">
              {parseFloat(ethers.formatEther(poolStats.price)).toFixed(8)} ETH
            </span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-700">Creator Fee</span>
            <span className="font-medium text-blue-900">1%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">Slippage Tolerance</span>
            <span className="font-medium text-blue-900">{slippage}%</span>
          </div>
        </div>
      </div>

      {/* Trading Stats */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Trading Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-neutral-600 mb-1">Total Buys</div>
            <div className="text-xl font-bold text-green-600">{poolStats.buys}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-600 mb-1">Total Sells</div>
            <div className="text-xl font-bold text-red-600">{poolStats.sells}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-600 mb-1">Tokens Sold</div>
            <div className="text-xl font-bold text-neutral-900">
              {parseFloat(ethers.formatUnits(poolStats.supply, 18)).toFixed(0)}
            </div>
          </div>
          <div>
            <div className="text-sm text-neutral-600 mb-1">Total Volume</div>
            <div className="text-xl font-bold text-neutral-900">
              {parseFloat(poolStats.volume).toFixed(2)} ETH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
