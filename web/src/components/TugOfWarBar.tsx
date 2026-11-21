'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Zap, Flame } from 'lucide-react';

interface TugOfWarBarProps {
  upPool: number;
  downPool: number;
  upOdds: number;
  downOdds: number;
  upPercent: number;
  isLightning?: boolean;
}

export function TugOfWarBar({
  upPool,
  downPool,
  upOdds,
  downOdds,
  upPercent,
  isLightning,
}: TugOfWarBarProps) {
  const downPercent = 100 - upPercent;

  return (
    <div className={`w-full rounded-2xl p-5 border transition-all duration-300 ${
      isLightning 
        ? 'bg-gradient-to-b from-[#2a0815] to-[#15040a] border-red-500/50 glow-lightning' 
        : 'bg-[#151128]/90 border-purple-500/20 backdrop-blur-md'
    }`}>
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 text-xs md:text-sm font-semibold tracking-wider uppercase">
        <div className="flex items-center gap-2 text-emerald-400">
          <TrendingUp className="w-4 h-4" />
          <span>BULLS (UP)</span>
          <span className="text-white font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
            {upPool.toFixed(3)} MON
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-200">
          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 animate-pulse" />
          <span className="text-xs font-bold">DYNAMIC ODDS PULL</span>
        </div>

        <div className="flex items-center gap-2 text-rose-400">
          <span className="text-white font-mono bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
            {downPool.toFixed(3)} MON
          </span>
          <span>BEARS (DOWN)</span>
          <TrendingDown className="w-4 h-4" />
        </div>
      </div>

      {/* Main Tug-Of-War Progress Bar */}
      <div className="relative h-12 w-full rounded-xl overflow-hidden bg-black/60 p-1 border border-white/10 flex items-center shadow-inner">
        {/* Green UP Side */}
        <div
          style={{ width: `${upPercent}%` }}
          className="h-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 transition-all duration-500 flex items-center justify-start pl-3 rounded-l-lg relative group"
        >
          <div className="flex items-center gap-1.5 font-black text-xs md:text-sm text-black drop-shadow-sm select-none">
            <span>{upPercent.toFixed(1)}%</span>
            <span className="bg-black/80 text-emerald-300 text-[11px] px-1.5 py-0.5 rounded font-mono border border-emerald-400/30">
              {upOdds.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Center Tension Puck */}
        <div
          style={{ left: `calc(${upPercent}% - 14px)` }}
          className="absolute z-10 w-7 h-7 rounded-full bg-white shadow-[0_0_15px_#fff] border-2 border-[#16122d] flex items-center justify-center transition-all duration-500"
        >
          <div className="w-2 h-2 rounded-full bg-[#836EF9] animate-ping" />
        </div>

        {/* Red DOWN Side */}
        <div
          style={{ width: `${downPercent}%` }}
          className="h-full bg-gradient-to-l from-rose-600 via-rose-500 to-rose-400 transition-all duration-500 flex items-center justify-end pr-3 rounded-r-lg relative group"
        >
          <div className="flex items-center gap-1.5 font-black text-xs md:text-sm text-white drop-shadow-sm select-none">
            <span className="bg-black/80 text-rose-300 text-[11px] px-1.5 py-0.5 rounded font-mono border border-rose-400/30">
              {downOdds.toFixed(2)}x
            </span>
            <span>{downPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Dynamic Odds Commentary / Underdog Callout */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          {upOdds > downOdds && (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium animate-pulse">
              <Flame className="w-3.5 h-3.5" /> High Underdog Odds on UP ({upOdds.toFixed(2)}x)!
            </span>
          )}
          {upOdds <= downOdds && (
            <span>Base multiplier: <strong className="text-white font-mono">{upOdds.toFixed(2)}x</strong></span>
          )}
        </div>

        <div className="text-center font-mono text-[11px] text-purple-300/80">
          Total Pot: <span className="text-white font-bold">{(upPool + downPool).toFixed(3)} MON</span> (5% Jackpot)
        </div>

        <div className="flex items-center gap-1 text-right">
          {downOdds > upOdds && (
            <span className="inline-flex items-center gap-1 text-rose-400 font-medium animate-pulse">
              <Flame className="w-3.5 h-3.5" /> High Underdog Odds on DOWN ({downOdds.toFixed(2)}x)!
            </span>
          )}
          {downOdds <= upOdds && (
            <span>Base multiplier: <strong className="text-white font-mono">{downOdds.toFixed(2)}x</strong></span>
          )}
        </div>
      </div>
    </div>
  );
}
