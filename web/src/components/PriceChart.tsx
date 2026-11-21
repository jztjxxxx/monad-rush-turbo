'use client';

import React, { useMemo } from 'react';
import { Timer, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLang } from '@/i18n';

interface PriceChartProps {
  roundId: number;
  currentPrice: number;
  lockPrice: number;
  priceHistory: number[];
  timeLeft: number;
  totalTime: number;
  isLightning?: boolean;
  status: 'BETTING' | 'LOCKED' | 'RESOLVING';
  symbol?: string;
}

export function PriceChart({
  roundId,
  currentPrice,
  lockPrice,
  priceHistory,
  timeLeft,
  totalTime,
  isLightning,
  status,
  symbol = 'BTC / USDT',
}: PriceChartProps) {
  const { L } = useLang();
  const isUp = currentPrice >= lockPrice;
  const priceDiff = currentPrice - lockPrice;
  const priceDiffPercent = lockPrice > 0 ? (priceDiff / lockPrice) * 100 : 0;

  const formatPrice = (val: number) => {
    if (!val) return '0.00';
    if (val >= 100) {
      return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val.toFixed(4);
  };

  // Simple SVG polyline coordinate mapping
  const points = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return '';
    const min = Math.min(...priceHistory) * 0.9997;
    const max = Math.max(...priceHistory) * 1.0003;
    const range = max - min || 1;
    const width = 600;
    const height = 180;

    return priceHistory
      .map((p, idx) => {
        const x = (idx / (priceHistory.length - 1)) * width;
        const y = height - ((p - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }, [priceHistory]);

  const lockY = useMemo(() => {
    if (!priceHistory || priceHistory.length < 2) return 90;
    const min = Math.min(...priceHistory) * 0.9997;
    const max = Math.max(...priceHistory) * 1.0003;
    const range = max - min || 1;
    const height = 180;
    return height - ((lockPrice - min) / range) * height;
  }, [priceHistory, lockPrice]);

  return (
    <div className={`relative w-full rounded-2xl p-5 border overflow-hidden ${
      isLightning
        ? 'bg-gradient-to-b from-[#240611] to-[#120309] border-red-500/40 shadow-[0_0_30px_rgba(255,40,80,0.25)]'
        : 'bg-[#151128]/90 border-purple-500/20 shadow-2xl backdrop-blur-md'
    }`}>
      {/* Top Bar with Round Info and Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 min-w-0">
          <span className="font-mono text-xs md:text-sm font-black px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-500/30 text-purple-300">
            {L(`第 ${roundId} 局`, `ROUND #${roundId}`)}
          </span>

          {isLightning && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs font-black tracking-wider uppercase animate-pulse">
              <Zap className="w-3.5 h-3.5 fill-red-400 text-red-400" /> {L('10 秒闪电局', '10s LIGHTNING ROUND')}
            </span>
          )}

          <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            status === 'BETTING'
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
              : status === 'LOCKED'
              ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
              : 'bg-purple-950/60 border border-purple-500/40 text-purple-300 animate-pulse'
          }`}>
            {status === 'BETTING' && <CheckCircle2 className="w-3.5 h-3.5" />}
            {status === 'LOCKED' && <AlertTriangle className="w-3.5 h-3.5" />}
            {status === 'BETTING' ? L('下注中', 'BETTING') : status === 'LOCKED' ? L('已锁定', 'LOCKED') : L('结算中', 'RESOLVING')}
          </span>
        </div>

        {/* Live Countdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/60 border border-white/10 font-mono text-sm md:text-base font-black">
            <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-purple-400'}`} />
            <span className={timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}>
              {timeLeft.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <div className="min-w-0">
          <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
            <span>{L(`${symbol} · 币安实时`, `${symbol} BINANCE LIVE`)}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-white">
              ${formatPrice(currentPrice)}
            </span>
            <span className={`text-xs md:text-sm font-mono font-bold ${
              isUp ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {isUp ? '+' : ''}{priceDiff >= 100 ? priceDiff.toFixed(2) : priceDiff.toFixed(4)} ({isUp ? '+' : ''}{priceDiffPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-400 font-mono">{L('锁定参考价', 'LOCKED REFERENCE PRICE')}</div>
          <div className="text-sm md:text-base font-mono font-bold text-gray-200">
            ${formatPrice(lockPrice)}
          </div>
        </div>
      </div>

      {/* SVG Sparkline Graph */}
      <div className="relative w-full h-[180px] bg-black/40 rounded-xl border border-white/5 overflow-hidden">
        {/* Horizontal Lock Price Target Line */}
        <div
          style={{ top: `${lockY}px` }}
          className="absolute left-0 right-0 border-b border-dashed border-purple-400/50 z-0 pointer-events-none flex justify-end pr-2"
        >
          <span className="text-[10px] font-mono text-purple-300 bg-black/80 px-1 rounded -translate-y-2">
            LOCK: ${formatPrice(lockPrice)}
          </span>
        </div>

        <svg
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
          className="w-full h-full relative z-10"
        >
          <defs>
            <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F59B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00F59B" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3366" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FF3366" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Line Stroke */}
          <polyline
            fill="none"
            stroke={isUp ? '#00F59B' : '#FF3366'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>

        {/* Current Point Dot */}
        <div
          className={`absolute right-2 z-20 w-3 h-3 rounded-full ${
            isUp ? 'bg-emerald-400 shadow-[0_0_12px_#10b981]' : 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
          } animate-ping`}
          style={{ top: `${points.split(' ').pop()?.split(',')[1] || 90}px` }}
        />
      </div>
    </div>
  );
}
