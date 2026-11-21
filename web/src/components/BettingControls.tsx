'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Coins, Sparkles, CheckCircle } from 'lucide-react';
import { useLang } from '@/i18n';

interface BettingControlsProps {
  amount: number;
  setAmount: (amt: number) => void;
  onBet: (direction: 'UP' | 'DOWN') => void;
  upOdds: number;
  downOdds: number;
  isLocked: boolean;
  userCurrentBet?: { direction: 'UP' | 'DOWN'; amount: number } | null;
  minBet: number;
  isLightning?: boolean;
}

export function BettingControls({
  amount,
  setAmount,
  onBet,
  upOdds,
  downOdds,
  isLocked,
  userCurrentBet,
  minBet,
  isLightning,
}: BettingControlsProps) {
  const { L } = useLang();
  const quickAmounts = isLightning ? [0.02, 0.04, 0.06, 0.08, 0.1] : [0.01, 0.03, 0.05, 0.08, 0.1];
  const upPayout = (amount * upOdds).toFixed(3);
  const downPayout = (amount * downOdds).toFixed(3);

  return (
    <div className="w-full rounded-2xl p-5 bg-[#151128]/90 border border-purple-500/20 shadow-xl backdrop-blur-md">
      {/* Bet Amount Selector */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-300 font-mono mb-2">
          <span className="flex items-center gap-1.5 font-bold">
            <Coins className="w-4 h-4 text-[#836EF9]" />
            {L('下注金额 (MON)', 'WAGER AMOUNT (MON)')}
          </span>
          <span className="text-gray-400">{L(`最低下注：${minBet} MON`, `Min Bet: ${minBet} MON`)}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-2">
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              disabled={isLocked}
              className={`py-2 rounded-xl font-mono text-xs font-bold transition-all ${
                amount === amt
                  ? 'bg-[#836EF9] text-white shadow-[0_0_15px_rgba(131,110,249,0.5)] border border-purple-400'
                  : 'bg-purple-950/40 text-purple-200 border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-900/30'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {amt}
            </button>
          ))}
        </div>
      </div>

      {/* Current Position Status (if bet already placed) */}
      {userCurrentBet && (
        <div className="mb-4 p-3 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">{L('你已下注：', 'Your Active Position:')}</span>
            <span className={`font-black font-mono px-2 py-0.5 rounded text-[11px] ${
              userCurrentBet.direction === 'UP' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'
            }`}>
              {userCurrentBet.direction} ({userCurrentBet.amount} MON)
            </span>
          </div>
          <span className="text-gray-400 font-mono text-[11px]">{L('亚秒级确认', 'Sub-second confirmed')}</span>
        </div>
      )}

      {/* Action Buttons: BULL / BEAR */}
      <div className="grid grid-cols-2 gap-4">
        {/* BET UP BUTTON */}
        <button
          onClick={() => onBet('UP')}
          disabled={isLocked || !!userCurrentBet}
          className="group relative p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-[0.98] text-white font-black shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
            <span className="text-[13px] sm:text-base tracking-wide flex items-center gap-1.5">
              <span>{L('看涨 / UP', 'BULL / UP')}</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
            <span className="bg-black/40 text-emerald-300 font-mono text-xs px-2 py-0.5 rounded-full border border-emerald-400/30">
              {upOdds.toFixed(2)}x
            </span>
          </div>
          <div className="text-left text-[11px] font-mono text-emerald-100/80 font-normal">
            {L('预计回报：', 'Est. Return: ')}<strong className="text-white font-bold">{upPayout} MON</strong>
          </div>
        </button>

        {/* BET DOWN BUTTON */}
        <button
          onClick={() => onBet('DOWN')}
          disabled={isLocked || !!userCurrentBet}
          className="group relative p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 active:scale-[0.98] text-white font-black shadow-lg shadow-rose-950/50 border border-rose-400/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
            <span className="text-[13px] sm:text-base tracking-wide flex items-center gap-1.5">
              <span>{L('看跌 / DOWN', 'BEAR / DOWN')}</span>
              <ArrowDownRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
            </span>
            <span className="bg-black/40 text-rose-300 font-mono text-xs px-2 py-0.5 rounded-full border border-rose-400/30">
              {downOdds.toFixed(2)}x
            </span>
          </div>
          <div className="text-left text-[11px] font-mono text-rose-100/80 font-normal">
            {L('预计回报：', 'Est. Return: ')}<strong className="text-white font-bold">{downPayout} MON</strong>
          </div>
        </button>
      </div>

      {isLocked && !userCurrentBet && (
        <div className="mt-3 text-center text-xs text-amber-400 font-mono animate-pulse">
          {L('⏳ 本局已锁定，正在结算…', '⏳ Betting locked for this round. Resolving outcome...')}
        </div>
      )}
    </div>
  );
}
