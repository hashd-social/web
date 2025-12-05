import React, { useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';

interface PriceChartProps {
  bondingCurveAddress: string;
}

interface TradeEvent {
  timestamp: number;
  price: number;
  type: 'buy' | 'sell';
  ethAmount: number;
  tokenAmount: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ bondingCurveAddress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [trades, setTrades] = useState<TradeEvent[]>([]);
  const [timeRange, setTimeRange] = useState<'1H' | '24H' | '7D' | 'ALL'>('24H');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTradeHistory();
  }, [bondingCurveAddress, timeRange]);

  useEffect(() => {
    if (trades.length > 0 && canvasRef.current) {
      drawChart();
    }
  }, [trades]);

  const loadTradeHistory = async () => {
    setIsLoading(true);
    try {
      const { contractService } = await import('../utils/contracts');
      const events = await contractService.getBondingCurveEvents(bondingCurveAddress);
      
      // Filter by time range
      const now = Date.now() / 1000;
      let cutoff = 0;
      switch (timeRange) {
        case '1H':
          cutoff = now - 3600;
          break;
        case '24H':
          cutoff = now - 86400;
          break;
        case '7D':
          cutoff = now - 604800;
          break;
        case 'ALL':
          cutoff = 0;
          break;
      }

      const filteredTrades = events
        .filter((e: any) => e.timestamp >= cutoff)
        .map((e: any) => ({
          timestamp: e.timestamp,
          price: parseFloat(ethers.formatEther(e.price)),
          type: e.type,
          ethAmount: parseFloat(ethers.formatEther(e.ethAmount)),
          tokenAmount: parseFloat(ethers.formatUnits(e.tokenAmount, 18)),
        }));

      setTrades(filteredTrades);
    } catch (err) {
      console.error('Error loading trade history:', err);
      // Generate sample data for development
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleData = () => {
    // Generate sample bonding curve data for visualization
    const sampleTrades: TradeEvent[] = [];
    const now = Date.now() / 1000;
    
    for (let i = 0; i < 50; i++) {
      const timestamp = now - (50 - i) * 600; // 10 min intervals
      const supply = i * 1000000;
      const price = (supply / 1e18) ** 2 * 1e9 / 1e9; // Quadratic curve
      
      sampleTrades.push({
        timestamp,
        price,
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        ethAmount: Math.random() * 0.1,
        tokenAmount: Math.random() * 10000,
      });
    }
    
    setTrades(sampleTrades);
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (trades.length === 0) return;

    // Calculate bounds
    const prices = trades.map((t) => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange * i) / 5;
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(8), padding - 5, y + 4);
    }

    // Draw price line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    trades.forEach((trade, i) => {
      const x = padding + ((width - 2 * padding) * i) / (trades.length - 1);
      const y =
        padding +
        (height - 2 * padding) * (1 - (trade.price - minPrice) / priceRange);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw trade markers
    trades.forEach((trade, i) => {
      const x = padding + ((width - 2 * padding) * i) / (trades.length - 1);
      const y =
        padding +
        (height - 2 * padding) * (1 - (trade.price - minPrice) / priceRange);

      ctx.fillStyle = trade.type === 'buy' ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw current price indicator
    const lastTrade = trades[trades.length - 1];
    const lastX = width - padding;
    const lastY =
      padding +
      (height - 2 * padding) * (1 - (lastTrade.price - minPrice) / priceRange);

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Current price label
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${lastTrade.price.toFixed(8)} ETH`,
      lastX + 10,
      lastY + 5
    );
  };

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['1H', '24H', '7D', 'ALL'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative bg-neutral-50 rounded-lg border border-neutral-200 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-neutral-500">
            No trading data available yet
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            width={800}
            height={300}
            className="w-full"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-neutral-600">Buy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-neutral-600">Sell</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-neutral-600">Current Price</span>
        </div>
      </div>

      {/* Recent Trades */}
      {trades.length > 0 && (
        <div className="bg-white rounded-lg border border-neutral-200 p-4">
          <h4 className="font-semibold text-neutral-900 mb-3">Recent Trades</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trades.slice(-10).reverse().map((trade, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm py-2 border-b border-neutral-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.type === 'buy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {trade.type.toUpperCase()}
                  </span>
                  <span className="text-neutral-600">
                    {trade.tokenAmount.toFixed(2)} tokens
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-neutral-900">
                    {trade.ethAmount.toFixed(6)} ETH
                  </div>
                  <div className="text-xs text-neutral-500">
                    @ {trade.price.toFixed(8)} ETH
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
