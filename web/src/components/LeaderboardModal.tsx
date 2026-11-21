'use client';

import React from 'react';
import { X, Trophy, Flame, Coins, Crown, Gift } from 'lucide-react';
import { useLang } from '@/i18n';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  jackpotAmount: number;
}

export function LeaderboardModal({
  isOpen,
  onClose,
  jackpotAmount,
}: LeaderboardModalProps) {
  const { L } = useLang();
  if (!isOpen) return null;

  const mockStreaks = [
    { rank: 1, address: '0x8a3F...49b2', streak: 5, profit: '4.820 MON', tag: L('已掏空奖池 💥', 'CLEARED JACKPOT 💥') },
    { rank: 2, address: '0x4f12...e81c', streak: 4, profit: '2.450 MON', tag: L('连胜火热 🔥', 'HOT STREAK 🔥') },
    { rank: 3, address: '0x7b99...a103', streak: 3, profit: '1.180 MON', tag: L('20% 奖池得主', '20% POT WINNER') },
    { rank: 4, address: '0x1c44...77d9', streak: 2, profit: '0.640 MON', tag: L('进行中', 'ACTIVE') },
    { rank: 5, address: '0x99e0...55ab', streak: 2, profit: '0.420 MON', tag: L('进行中', 'ACTIVE') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#151128] border border-purple-500/30 shadow-2xl p-6 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Demo Data Banner */}
        <div className="mb-4 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between">
          <span className="font-bold flex items-center gap-1.5">
            <span>⚠️ Demo data · 演示示例数据（主网/测试网历史记录统计）</span>
          </span>
          <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
            {L('示例', 'Simulated')}
          </span>
        </div>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-purple-900/60 border border-purple-500/40 text-yellow-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2">
              <span>{L('冠军榜 & 大奖池', 'HALL OF CHAMPIONS & JACKPOT')}</span>
              <Crown className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs text-gray-400">{L('全球连胜排行与大奖池目标', 'Global win-streak rankings and collective jackpot goals')}</p>
          </div>
        </div>

        {/* Jackpot Rules Callout */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-black/60 to-amber-950/80 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider flex items-center gap-1.5">
              <Gift className="w-4 h-4" /> {L('大奖池规则', 'JACKPOT MECHANICS')}
            </span>
            <span className="font-mono text-sm font-black text-white">
              {L(`当前奖池：${jackpotAmount.toFixed(3)} MON`, `Current Pool: ${jackpotAmount.toFixed(3)} MON`)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-amber-400 font-bold">{L('🔥 3 连胜', '🔥 3-Win Streak')}</span>
              <p className="text-[11px] text-gray-400 mt-0.5">{L('领取累积奖池的 20% 加成！', 'Claims 20% bonus from the accumulated pool!')}</p>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <span className="text-rose-400 font-bold">{L('💥 5 连胜', '💥 5-Win Streak')}</span>
              <p className="text-[11px] text-gray-400 mt-0.5">{L('掏空整个大奖池的 100%！', 'Empties 100% of the entire global jackpot pool!')}</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-gray-400 px-3 flex justify-between">
            <span>{L('玩家', 'CHAMPION')}</span>
            <div className="flex gap-8">
              <span>{L('连胜', 'WIN STREAK')}</span>
              <span>{L('总盈利', 'TOTAL PROFIT')}</span>
            </div>
          </div>

          {mockStreaks.map((item) => (
            <div
              key={item.address}
              className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 transition-all font-mono text-xs"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-black ${
                  item.rank === 1 ? 'text-amber-400 text-sm' : item.rank === 2 ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  #{item.rank}
                </span>
                <div>
                  <span className="text-white font-bold">{item.address}</span>
                  <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/20">
                    {item.tag}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{L(`${item.streak} 连胜`, `${item.streak}x`)}</span>
                </div>
                <div className="text-emerald-400 font-bold">
                  +{item.profit}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#836EF9] hover:bg-[#735ce4] text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            {L('返回游戏', 'Back to Game')}
          </button>
        </div>
      </div>
    </div>
  );
}
