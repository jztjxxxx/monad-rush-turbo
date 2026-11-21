'use client';

import React from 'react';
import { Zap, Flame, Sparkles } from 'lucide-react';

interface LightningBannerProps {
  isLightning: boolean;
  onTriggerLightning: () => void;
  roundsUntilLightning: number;
}

export function LightningBanner({
  isLightning,
  onTriggerLightning,
  roundsUntilLightning,
}: LightningBannerProps) {
  return (
    <div className={`w-full rounded-2xl p-4 border transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-3 ${
      isLightning
        ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-red-500 shadow-[0_0_25px_rgba(244,63,94,0.4)] animate-pulse'
        : 'bg-[#181131]/60 border-purple-500/20'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl flex items-center justify-center ${
          isLightning ? 'bg-red-500 text-white shadow-[0_0_15px_#f43f5e]' : 'bg-purple-900/60 text-purple-300'
        }`}>
          <Zap className="w-5 h-5 fill-current" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm md:text-base tracking-wide text-white uppercase">
              {isLightning ? '⚡ TURBO LIGHTNING MODE ACTIVE!' : 'TURBO LIGHTNING CYCLES'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950 border border-purple-500/30 text-purple-300">
              10s ROUNDS · 2X MIN BET
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {isLightning
              ? 'Ultra-rapid 10-second settlement round! Highest tension dynamic odds.'
              : `Automatically triggers every 5 rounds (Next in: ${roundsUntilLightning} rounds), or trigger on-demand for pitch demo.`}
          </p>
        </div>
      </div>

      {/* Manual Demo Trigger Button */}
      <button
        onClick={onTriggerLightning}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-red-950/60 border border-red-400/50 flex items-center justify-center gap-2 transition-all active:scale-95"
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>⚡ Trigger Lightning Round (Demo)</span>
      </button>
    </div>
  );
}
