'use client';

import React from 'react';
import { Zap, Flame, Trophy, Wallet, ShieldCheck } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { monadTestnet } from '@/config/wagmi';

interface NavbarProps {
  jackpotAmount: number;
  userStreak: number;
  onOpenLeaderboard: () => void;
  guestMode: boolean;
  guestBalance: number;
  guestAddress: string;
  onToggleGuestMode: () => void;
}

export function Navbar({
  jackpotAmount,
  userStreak,
  onOpenLeaderboard,
  guestMode,
  guestBalance,
  guestAddress,
  onToggleGuestMode,
}: NavbarProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({
    address: address,
  });

  const displayAddress = guestMode
    ? `${guestAddress.slice(0, 6)}...${guestAddress.slice(-4)}`
    : address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const displayBalance = guestMode
    ? guestBalance.toFixed(3)
    : balanceData
    ? Number(balanceData.formatted).toFixed(3)
    : '0.000';

  return (
    <header className="w-full border-b border-purple-500/20 bg-[#0e0b1f]/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-tr from-[#836EF9] to-[#A0055D] p-0.5 flex items-center justify-center glow-purple">
            <div className="w-full h-full bg-[#0e0b1f] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-[#836EF9] fill-[#836EF9]" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-[#836EF9] whitespace-nowrap">
                MONAD RUSH
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest bg-rose-500 text-white uppercase shadow-[0_0_10px_#f43f5e]">
                TURBO
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="truncate">Monad 测试网 (10143)<span className="hidden md:inline"> · 400ms 亚秒级出块</span></span>
            </div>
          </div>
        </div>

        {/* Center Jackpot Marquee */}
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-black/80 to-rose-950/70 border border-purple-500/30 shadow-[0_0_20px_rgba(131,110,249,0.2)]">
          <div className="flex items-center gap-1.5 text-yellow-400">
            <Flame className="w-4 h-4 fill-yellow-400 animate-bounce" />
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              累积大奖池
            </span>
          </div>
          <span className="font-mono text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500">
            {jackpotAmount.toFixed(3)} MON
          </span>
          <span className="text-[10px] text-yellow-300/70 font-mono bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/30">
            5 连胜掏空奖池 💥
          </span>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak Indicator */}
          {userStreak > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold animate-pulse">
              <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
              <span>{userStreak} 连胜</span>
              {userStreak >= 3 && (
                <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-black">
                  {userStreak >= 5 ? '大奖已解锁' : '20% 奖池档'}
                </span>
              )}
            </div>
          )}

          {/* Leaderboard button */}
          <button
            onClick={onOpenLeaderboard}
            className="p-2 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-200 hover:text-white hover:border-purple-400 transition-all"
            title="排行榜与连胜"
          >
            <Trophy className="w-4 h-4" />
          </button>

          {/* Wallet / Demo Mode Button */}
          {displayAddress ? (
            <div className="flex items-center gap-2 bg-[#1a1438] border border-purple-500/30 rounded-xl p-1 pl-3">
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-white">
                  {displayBalance} MON
                </div>
                <div className="text-[10px] font-mono text-purple-300/70">
                  {displayAddress}
                </div>
              </div>
              <button
                onClick={() => {
                  if (guestMode) onToggleGuestMode();
                  else disconnect();
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-900/40 hover:bg-rose-900/40 text-xs font-medium text-gray-300 hover:text-rose-200 border border-purple-500/20 transition-all"
              >
                {guestMode ? '退出演示' : '断开连接'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleGuestMode}
                className="px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs shadow-md border border-amber-400/40 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">游客演示</span>
                <span className="sm:hidden">演示</span>
              </button>

              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#836EF9] to-[#6345ec] hover:from-[#9582ff] hover:to-[#7458ff] text-white font-bold text-xs shadow-md glow-purple transition-all flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">连接钱包</span>
                <span className="sm:hidden">连接</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
