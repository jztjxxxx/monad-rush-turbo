'use client';

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatEther, parseEther, createPublicClient, http } from 'viem';
import { monadTestnet } from '@/config/wagmi';
import { Navbar } from '@/components/Navbar';
import { TugOfWarBar } from '@/components/TugOfWarBar';
import { PriceChart } from '@/components/PriceChart';
import { BettingControls } from '@/components/BettingControls';
import { LightningBanner } from '@/components/LightningBanner';
import { LeaderboardModal } from '@/components/LeaderboardModal';
import { Flame, Sparkles, CheckCircle2, AlertCircle, Zap, Award, Crown } from 'lucide-react';
import contractData from '@/contracts/MonadRushTurbo.json';

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || contractData.address) as `0x${string}`;
const CONTRACT_ABI = contractData.abi as any;

// Read-only client for the unclaimed-winnings scanner (QuickNode: batch-friendly)
const claimScanClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://rpc-testnet.monadinfra.com', { batch: true }),
});

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: balanceData, refetch: refetchBalance } = useBalance({ address });
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  // Mode: Default is Onchain Mode! Guest mode is backup only.
  const [guestMode, setGuestMode] = useState<boolean>(false);
  const [guestBalance, setGuestBalance] = useState<number>(100.0);
  const [guestAddress] = useState<string>('0x50C5...89de');
  const [guestStreak, setGuestStreak] = useState<number>(0); // 3) Initial streak is 0
  const [guestRoundId, setGuestRoundId] = useState<number>(1); // 4) Guest round id increments
  const [guestBet, setGuestBet] = useState<{
    direction: 'UP' | 'DOWN';
    amount: number;
    roundId: number;
  } | null>(null);

  // 2) Guest mode simulated pools & starting jackpot
  const [guestUpPool, setGuestUpPool] = useState<number>(0.32);
  const [guestDownPool, setGuestDownPool] = useState<number>(0.18);
  const [guestJackpot, setGuestJackpot] = useState<number>(1.25);

  // Time & Timing (Standard 30s, Lightning 10s)
  const STANDARD_DURATION = 30.0;
  const LIGHTNING_DURATION = 10.0;
  const [isLightning, setIsLightning] = useState<boolean>(false);
  const [roundsUntilLightning, setRoundsUntilLightning] = useState<number>(4);
  const [timeLeft, setTimeLeft] = useState<number>(STANDARD_DURATION);
  const [status, setStatus] = useState<'BETTING' | 'LOCKED' | 'RESOLVING'>('BETTING');

  // Pricing
  const [currentPrice, setCurrentPrice] = useState<number>(96520.0);
  const [lockPrice, setLockPrice] = useState<number>(96520.0);
  const [priceHistory, setPriceHistory] = useState<number[]>([
    96480, 96495, 96510, 96505, 96515, 96525, 96518, 96520
  ]);
  const hasInitializedFirstPrice = useRef<boolean>(false);
  const lastPriceAtRef = useRef<number>(0); // timestamp of last LIVE Binance price (staleness guard)

  // Onchain Pools: strictly 0 if 0 onchain (no random numbers)
  const [onchainUpPool, setOnchainUpPool] = useState<number>(0);
  const [onchainDownPool, setOnchainDownPool] = useState<number>(0);
  const [onchainJackpotDisplay, setOnchainJackpotDisplay] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<number>(0.05);

  // Modals & UI alerts
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 5) Onchain Claim Tracking: only claimable when previous round confirmed resolved onchain
  const [lastOnchainBetRoundId, setLastOnchainBetRoundId] = useState<number | null>(null);

  // Unclaimed-winnings scanner: derived purely from chain state, survives refresh
  const [claimableRounds, setClaimableRounds] = useState<{ roundId: number; amount: number; position: number; payout: number }[]>([]);
  const [claimingRoundId, setClaimingRoundId] = useState<number | null>(null);

  // Locks & Deduplication Refs
  const isExecutingRef = useRef<boolean>(false);
  const lastWaitingPromptRoundRef = useRef<number>(0); // 6) Non-operator waiting prompt once per round
  const lastResolvedRoundRef = useRef<number>(-1); // 1) Prevent duplicate settlement for same roundId
  const resolveRetryRef = useRef<() => void>(() => {}); // latest handleResolveRound, for price-feed-wait retries

  // ----------------------------------------------------
  // Wagmi Read Contracts (1-second polling on Monad)
  // ----------------------------------------------------
  const { data: contractOperator } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'operator',
  });

  const { data: contractOwner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'owner',
  });

  const isOperator = !!address && (
    (typeof contractOperator === 'string' && address.toLowerCase() === contractOperator.toLowerCase()) ||
    (typeof contractOwner === 'string' && address.toLowerCase() === contractOwner.toLowerCase())
  );

  const { data: onchainRoundId, refetch: refetchRoundId } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'currentRoundId',
    query: { refetchInterval: 1000 },
  });

  // 4) Active Round ID: guestRoundId in guest mode, onchainRoundId in onchain mode
  const activeRoundId = guestMode
    ? guestRoundId
    : onchainRoundId
    ? Number(onchainRoundId)
    : 1;

  // Onchain lightning countdown derived from the chain round id (refresh-proof):
  // lightning rounds are roundIds divisible by 5.
  const onchainRoundsUntilLightning = (() => {
    const d = (5 - (activeRoundId % 5)) % 5;
    return d === 0 ? 5 : d;
  })();

  const { data: onchainJackpot, refetch: refetchJackpot } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'totalJackpotPool',
    query: { refetchInterval: 1000 },
  });

  const { data: onchainRoundStats, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getRoundStats',
    args: [BigInt(activeRoundId)],
    query: { refetchInterval: 1000 },
  });

  const { data: onchainUserBet, refetch: refetchUserBet } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserRoundBet',
    args: [BigInt(activeRoundId), address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && isConnected, refetchInterval: 1000 },
  });

  // 5) Read previous round bet to verify resolution & claimability
  const { data: previousRoundUserBet, refetch: refetchPreviousBet } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserRoundBet',
    args: [BigInt(lastOnchainBetRoundId ?? 0), address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && isConnected && !!lastOnchainBetRoundId, refetchInterval: 1000 },
  });

  const { data: onchainStreak, refetch: refetchStreak } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'winStreaks',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address && isConnected, refetchInterval: 1500 },
  });

  // Sound generator
  const playSound = (freq = 440) => {
    try {
      if (typeof window === 'undefined') return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#836EF9', '#00F59B', '#FFD700', '#FF3366'],
    });
  };

  // ----------------------------------------------------
  // Binance BTCUSDT Live Price Stream
  // ----------------------------------------------------
  useEffect(() => {
    let ws: WebSocket | null = null;
    let fallbackInterval: any = null;

    const connectBinanceWS = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data && data.c) {
              const newPrice = parseFloat(data.c);
              lastPriceAtRef.current = Date.now();
              setCurrentPrice(newPrice);
              setPriceHistory((prev) => [...prev.slice(-30), newPrice]);
              // 1) Initialize first lock price with live BTC price
              if (!hasInitializedFirstPrice.current) {
                hasInitializedFirstPrice.current = true;
                setLockPrice(newPrice);
              }
            }
          } catch {}
        };
        ws.onerror = () => {
          startFallbackPolling();
        };
        ws.onclose = () => {
          // Silent socket drop: keep prices fresh via REST polling
          startFallbackPolling();
        };
      } catch {
        startFallbackPolling();
      }
    };

    const startFallbackPolling = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        try {
          const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
          const data = await res.json();
          if (data && data.price) {
            const p = parseFloat(data.price);
            lastPriceAtRef.current = Date.now();
            setCurrentPrice(p);
            setPriceHistory((prev) => [...prev.slice(-30), p]);
            if (!hasInitializedFirstPrice.current) {
              hasInitializedFirstPrice.current = true;
              setLockPrice(p);
            }
          }
        } catch {
          // Micro walk fallback if offline
          setCurrentPrice((prev) => {
            const delta = (Math.random() - 0.495) * 4.5;
            const next = +(prev + delta).toFixed(2);
            setPriceHistory((h) => [...h.slice(-30), next]);
            return next;
          });
        }
      }, 1500);
    };

    connectBinanceWS();

    return () => {
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  // ----------------------------------------------------
  // Sync Onchain Stats & timeLeft strictly from contract
  // ----------------------------------------------------
  useEffect(() => {
    if (!guestMode && onchainRoundStats && Array.isArray(onchainRoundStats)) {
      const stats = onchainRoundStats as any;
      const up = Number(formatEther(stats[0] ?? 0n));
      const down = Number(formatEther(stats[1] ?? 0n));
      
      // 3) Real pools: 0 displays 0, NO random filling in onchain mode!
      setOnchainUpPool(up);
      setOnchainDownPool(down);

      const isLt = Boolean(stats[6]);
      setIsLightning(isLt);

      // 2) Onchain timeLeft drives countdown
      const chainTimeLeft = Number(stats[7] ?? 0n);
      setTimeLeft(chainTimeLeft);

      const totalDur = isLt ? LIGHTNING_DURATION : STANDARD_DURATION;
      const lockDur = totalDur * (1 / 3);
      const isResolved = Boolean(stats[11]);

      if (isResolved) {
        setStatus('RESOLVING');
      } else if (chainTimeLeft <= lockDur && chainTimeLeft > 0) {
        setStatus('LOCKED');
      } else if (chainTimeLeft === 0) {
        setStatus('LOCKED');
      } else {
        setStatus('BETTING');
      }

      const chainLockPrice = Number(stats[8] ?? 0n);
      if (chainLockPrice > 0) {
        setLockPrice(chainLockPrice / 100);
      }
    }
  }, [onchainRoundStats, guestMode]);

  // 3) Jackpot pool: 0 displays 0 (0n !== undefined)
  useEffect(() => {
    if (!guestMode && onchainJackpot !== undefined && onchainJackpot !== null) {
      setOnchainJackpotDisplay(Number(formatEther(onchainJackpot as bigint)));
    }
  }, [onchainJackpot, guestMode]);

  // 1) Toggle Guest Mode: Set lock price to current real-time price & set initial simulated pools
  const toggleGuestMode = () => {
    const nextMode = !guestMode;
    setGuestMode(nextMode);
    if (nextMode) {
      setLockPrice(currentPrice);
      setTimeLeft(STANDARD_DURATION);
      setStatus('BETTING');
      setGuestUpPool(+(0.25 + Math.random() * 0.35).toFixed(3));
      setGuestDownPool(+(0.15 + Math.random() * 0.25).toFixed(3));
      setGuestStreak(0);
      setToastMessage('🛠️ Switched to Backup Guest Demo Mode (simulated pools enabled)');
    } else {
      setToastMessage('⛓️ Switched to Onchain Wagmi Mode (strictly real chain data)');
      refetchStats();
      refetchRoundId();
      refetchJackpot();
    }
  };

  // Pools & Dynamic Odds
  const currentUpPool = guestMode ? guestUpPool : onchainUpPool;
  const currentDownPool = guestMode ? guestDownPool : onchainDownPool;
  const currentJackpot = guestMode ? guestJackpot : onchainJackpotDisplay;

  const totalPool = currentUpPool + currentDownPool;
  const netPool = totalPool * 0.95;
  const upPercent = totalPool > 0 ? (currentUpPool / totalPool) * 100 : 50;
  const upOdds = currentUpPool > 0 ? netPool / currentUpPool : 2.0;
  const downOdds = currentDownPool > 0 ? netPool / currentDownPool : 2.0;

  // ----------------------------------------------------
  // Timer: Smoothly decrements timeLeft
  // ----------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return Math.max(0, +(prev - 0.2).toFixed(1));
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------------
  // 3) Trigger settlement when timeLeft reaches 0 via dedicated useEffect
  // ----------------------------------------------------
  useEffect(() => {
    if (timeLeft === 0 && status !== 'RESOLVING') {
      handleResolveRound();
    }
  }, [timeLeft, status]);

  // Keep a ref to the latest settlement handler so the price-feed guard
  // below can retry with fresh state once the live price arrives.
  useEffect(() => {
    resolveRetryRef.current = () => { void handleResolveRound(); };
  });

  // ----------------------------------------------------
  // Round Settlement (Operator executes onchain; Non-operator waits)
  // ----------------------------------------------------
  const handleResolveRound = async () => {
    // 1) Prevent duplicate settlement for the same round
    if (lastResolvedRoundRef.current === activeRoundId) return;
    // SAFETY: never settle onchain with the placeholder seed price (96520).
    // If no live Binance price has arrived yet (e.g. page just refreshed and
    // this round was already expired), wait and retry WITHOUT latching
    // lastResolvedRoundRef, so settlement proceeds once the feed syncs.
    if (!guestMode && isOperator && (!hasInitializedFirstPrice.current || Date.now() - lastPriceAtRef.current > 5000)) {
      setToastMessage('⏳ Waiting for live BTC price feed before onchain settlement...');
      setTimeout(() => { resolveRetryRef.current(); }, 1500);
      return;
    }
    lastResolvedRoundRef.current = activeRoundId;

    // 1. Onchain Mode Settlement
    if (!guestMode) {
      if (isOperator) {
        if (isExecutingRef.current) return;
        isExecutingRef.current = true;
        try {
          const btcPriceCents = BigInt(Math.round(currentPrice * 100));
          const nextIsLightning = ((activeRoundId + 1) % 5 === 0); // every 5th round, derived from the chain round id
          setToastMessage(`👑 [Operator] Calling executeRound onchain (BTC: $${currentPrice.toFixed(2)})...`);
          
          await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            chainId: monadTestnet.id,
            functionName: 'executeRound',
            args: [btcPriceCents, btcPriceCents, nextIsLightning],
          });

          setToastMessage(`✅ [Operator] executeRound confirmed on Monad Testnet! Next round active.`);
          refetchRoundId();
          refetchStats();
          refetchJackpot();
          refetchStreak();
          refetchBalance();

        } catch (err: any) {
          console.error('Operator executeRound error:', err);
          // Release the settlement latch so this round can be retried —
          // a rejected popup must not wedge the round for this session.
          lastResolvedRoundRef.current = -1;
          setToastMessage(`⚠️ [Operator] executeRound failed: ${err.shortMessage || err.message} — retrying in 4s...`);
          setTimeout(() => { resolveRetryRef.current(); }, 4000);
        } finally {
          setTimeout(() => {
            isExecutingRef.current = false;
          }, 4000);
        }
      } else {
        // 6) Non-operator: ONLY prompt ONCE per round!
        if (lastWaitingPromptRoundRef.current !== activeRoundId) {
          lastWaitingPromptRoundRef.current = activeRoundId;
          setToastMessage(`⏳ Round #${activeRoundId} ended. Waiting for operator onchain settlement...`);
        }
      }
      return;
    }

    // 2. Backup Guest Mode Settlement
    setStatus('RESOLVING');
    const isUp = currentPrice > lockPrice;
    const isDown = currentPrice < lockPrice;
    const winningDir: 'UP' | 'DOWN' | 'DRAW' = isUp ? 'UP' : isDown ? 'DOWN' : 'DRAW';

    // 2) Immediately capture and clear guestBet so subsequent ticks can never re-reward!
    const currentGuestBet = guestBet;
    setGuestBet(null);

    // Accumulate 5% fee in guest jackpot if not draw
    if (winningDir !== 'DRAW') {
      setGuestJackpot((j) => +(j + totalPool * 0.05).toFixed(3));
    }

    if (currentGuestBet && currentGuestBet.roundId === activeRoundId) {
      if (winningDir === 'DRAW') {
        setGuestBalance((b) => +(b + currentGuestBet.amount).toFixed(3));
        setToastMessage(`🤝 Exact tie (Draw)! Refunded ${currentGuestBet.amount} MON. No 5% fee taken.`);
      } else if (currentGuestBet.direction === winningDir) {
        const mult = winningDir === 'UP' ? upOdds : downOdds;
        const win = +(currentGuestBet.amount * mult).toFixed(3);
        setGuestBalance((b) => +(b + win).toFixed(3));
        const newStreak = guestStreak + 1;
        setGuestStreak(newStreak);
        playSound(880);
        triggerConfetti();

        if (newStreak === 3) {
          const bonus = +(guestJackpot * 0.2).toFixed(3);
          setGuestJackpot((j) => Math.max(0, +(j - bonus).toFixed(3)));
          setGuestBalance((b) => +(b + bonus).toFixed(3));
          setToastMessage(`🔥 3-WIN STREAK! Won ${win} MON + 20% Jackpot Bonus (+${bonus} MON)!`);
        } else if (newStreak >= 5) {
          const grand = guestJackpot;
          setGuestJackpot(0.2);
          setGuestBalance((b) => +(b + grand).toFixed(3));
          setGuestStreak(0);
          setToastMessage(`💥 5-WIN STREAK! EMPTIED ENTIRE JACKPOT (+${grand.toFixed(3)} MON)!`);
        } else {
          setToastMessage(`🎉 WON ${win} MON! (${mult.toFixed(2)}x Dynamic Odds)`);
        }
      } else {
        setGuestStreak(0);
        playSound(220);
        setToastMessage(`❌ Round Lost. Streak reset to 0.`);
      }
    }

    setTimeout(() => {
      // 1) Use current real-time BTC price as lockPrice for new round
      setLockPrice(currentPrice);
      setTimeLeft(isLightning ? LIGHTNING_DURATION : STANDARD_DURATION);
      setStatus('BETTING');
      
      // 4) Increment guest round id
      setGuestRoundId((r) => r + 1);

      // 2) Generate fresh simulated bets for simulated players in guest mode
      setGuestUpPool(+(0.2 + Math.random() * 0.4).toFixed(3));
      setGuestDownPool(+(0.15 + Math.random() * 0.3).toFixed(3));

      if (isLightning) {
        setIsLightning(false);
        setRoundsUntilLightning(4);
      } else {
        setRoundsUntilLightning((r) => {
          if (r <= 1) {
            setIsLightning(true);
            return 4;
          }
          return r - 1;
        });
      }
    }, 1500);
  };

  // ----------------------------------------------------
  // Bet Actions (Onchain & Guest)
  // ----------------------------------------------------
  const handleBet = async (direction: 'UP' | 'DOWN') => {
    if (status !== 'BETTING') return;

    if (guestMode) {
      if (guestBalance < betAmount) {
        alert('Insufficient guest balance! Resetting to 100 MON.');
        setGuestBalance(100);
        return;
      }
      setGuestBalance((b) => +(b - betAmount).toFixed(3));
      setGuestBet({ direction, amount: betAmount, roundId: activeRoundId });
      playSound(direction === 'UP' ? 523 : 349);

      // Add to simulated pool
      if (direction === 'UP') setGuestUpPool((p) => +(p + betAmount).toFixed(3));
      else setGuestDownPool((p) => +(p + betAmount).toFixed(3));

      setToastMessage(`⚡ Guest Bet confirmed: Placed ${betAmount} MON on ${direction}`);
      return;
    }

    // Onchain Mode with Wagmi
    if (!isConnected) {
      setToastMessage('⚠️ Please connect your Web3 wallet first, or switch to Backup Guest Demo mode!');
      return;
    }

    try {
      const val = parseEther(betAmount.toString());
      setToastMessage(`⏳ Sending transaction to Monad Testnet (400ms finality)...`);
      if (direction === 'UP') {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          chainId: monadTestnet.id,
          functionName: 'betUp',
          args: [BigInt(activeRoundId)],
          value: val,
        });
      } else {
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          chainId: monadTestnet.id,
          functionName: 'betDown',
          args: [BigInt(activeRoundId)],
          value: val,
        });
      }
      // Record bet round id for claim verification
      setLastOnchainBetRoundId(activeRoundId);
      playSound(587);
      setToastMessage(`✅ Bet placed onchain! Fast confirmation on Monad!`);
      refetchStats();
      refetchUserBet();
      refetchBalance();
    } catch (err: any) {
      console.error(err);
      setToastMessage(`❌ Onchain transaction rejected: ${err.shortMessage || err.message}`);
    }
  };

  // ----------------------------------------------------
  // 5) Onchain Claim Action: Verified resolved onchain
  // ----------------------------------------------------
  const prevBetCast = previousRoundUserBet as any;
  const isPreviousRoundClaimable =
    !guestMode &&
    isConnected &&
    lastOnchainBetRoundId !== null &&
    (onchainRoundId ? Number(onchainRoundId) > lastOnchainBetRoundId : false) &&
    prevBetCast &&
    Number(prevBetCast[1]) > 0 &&
    !prevBetCast[2];

  const handleClaim = async () => {
    if (!isConnected || !lastOnchainBetRoundId) return;
    try {
      setToastMessage(`⏳ Claiming round #${lastOnchainBetRoundId} onchain...`);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        chainId: monadTestnet.id,
        functionName: 'claim',
        args: [BigInt(lastOnchainBetRoundId)],
      });
      setLastOnchainBetRoundId(null);
      setToastMessage(`✅ Claim executed onchain! (Marked claimed & streak updated)`);
      refetchStreak();
      refetchJackpot();
      refetchBalance();
      refetchPreviousBet();
    } catch (err: any) {
      console.error(err);
      setToastMessage(`❌ Claim failed: ${err.shortMessage || err.message}`);
    }
  };

  // ----------------------------------------------------
  // Unclaimed-winnings scanner: scans recent rounds onchain for this
  // wallet's resolved-but-unclaimed bets. Chain-derived, so it works
  // after refresh and on any device (unlike lastOnchainBetRoundId).
  // ----------------------------------------------------
  useEffect(() => {
    if (guestMode || !isConnected || !address) {
      setClaimableRounds([]);
      return;
    }
    let cancelled = false;
    const scan = async () => {
      try {
        const cur = Number(await claimScanClient.readContract({
          address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'currentRoundId',
        } as any));
        const from = Math.max(1, cur - 100);
        const ids: number[] = [];
        for (let r = cur - 1; r >= from; r--) ids.push(r);
        const found: { roundId: number; amount: number; position: number; payout: number }[] = [];
        await Promise.all(ids.map(async (r) => {
          try {
            const bet: any = await claimScanClient.readContract({
              address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'getUserRoundBet',
              args: [BigInt(r), address],
            } as any);
            const amount = Number(bet[1]) / 1e18;
            if (!bet || amount <= 0 || bet[2]) return;
            const stats: any = await claimScanClient.readContract({
              address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: 'getRoundStats',
              args: [BigInt(r)],
            } as any);
            if (!stats[11]) return; // round not resolved yet
            const winner = Number(stats[10]);
            const pos = Number(bet[0]);
            const total = Number(stats[2]) / 1e18;
            const sidePool = (pos === 1 ? Number(stats[0]) : Number(stats[1])) / 1e18;
            let payout = 0;
            if (winner === 0) payout = amount; // tie / one-sided: full refund
            else if (winner === pos && sidePool > 0) payout = (amount * total * 0.95) / sidePool;
            if (payout <= 0) return; // hide losing rounds: nothing to collect, avoids confusing players
            found.push({ roundId: r, amount, position: pos, payout });
          } catch {}
        }));
        if (!cancelled) setClaimableRounds(found.sort((a, b) => b.roundId - a.roundId));
      } catch {}
    };
    scan();
    const iv = setInterval(scan, 8000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [guestMode, isConnected, address]);

  const handleClaimRound = async (roundId: number) => {
    if (!isConnected) return;
    try {
      setClaimingRoundId(roundId);
      setToastMessage(`⏳ Claiming round #${roundId} onchain...`);
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        chainId: monadTestnet.id,
        functionName: 'claim',
        args: [BigInt(roundId)],
      });
      setClaimableRounds((prev) => prev.filter((c) => c.roundId !== roundId));
      setToastMessage(`✅ Round #${roundId} claimed!`);
      refetchStreak();
      refetchJackpot();
      refetchBalance();
    } catch (err: any) {
      console.error(err);
      setToastMessage(`❌ Claim failed: ${err.shortMessage || err.message}`);
    } finally {
      setClaimingRoundId(null);
    }
  };

  // Trigger Lightning Mode on demand for pitch demo
  const triggerLightningManual = async () => {
    if (!guestMode) {
      if (isOperator) {
        try {
          const btcPriceCents = BigInt(Math.round(currentPrice * 100));
          setToastMessage(`⚡ [Operator] Triggering onchain 10s Lightning Round...`);
          await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            chainId: monadTestnet.id,
            functionName: 'triggerLightningRound',
            args: [btcPriceCents],
          });
          setToastMessage(`✅ [Operator] Lightning Round triggered onchain!`);
          refetchRoundId();
          refetchStats();
          return;
        } catch (err: any) {
          setToastMessage(`⚠️ Failed to trigger lightning onchain: ${err.shortMessage || err.message}`);
        }
      } else {
        setToastMessage(`⚡ Only the contract operator (${(contractOperator as string)?.slice(0, 6)}...) can trigger onchain lightning. Switch to Backup Guest Demo to test offline!`);
        return;
      }
    }

    // Guest mode trigger
    setIsLightning(true);
    setLockPrice(currentPrice);
    setTimeLeft(LIGHTNING_DURATION);
    setStatus('BETTING');
    playSound(659);
    setToastMessage('⚡ TURBO LIGHTNING MODE ACTIVATED! 10-second adrenaline round starts NOW!');
  };

  // Display user stats
  const activeUserStreak = guestMode ? guestStreak : onchainStreak !== undefined ? Number(onchainStreak as any) : 0;
  const userBetCast = onchainUserBet as any;
  const activeUserBet = guestMode
    ? guestBet
    : userBetCast && Number(userBetCast[1]) > 0
    ? {
        direction: Number(userBetCast[0]) === 1 ? ('UP' as const) : ('DOWN' as const),
        amount: Number(formatEther(userBetCast[1])),
      }
    : null;

  return (
    <main className="min-h-screen w-full overflow-x-clip flex flex-col justify-between">
      {/* Navbar */}
      <Navbar
        jackpotAmount={currentJackpot}
        userStreak={activeUserStreak}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        guestMode={guestMode}
        guestBalance={guestBalance}
        guestAddress={guestAddress}
        onToggleGuestMode={toggleGuestMode}
      />

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Mode & Operator Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#130f28]/90 border border-purple-500/20 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full ${guestMode ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
            <span className="text-gray-300">MODE:</span>
            <span className={`px-2 py-0.5 rounded font-black ${
              guestMode ? 'bg-amber-950 text-amber-300 border border-amber-500/30' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
            }`}>
              {guestMode ? '🛠️ BACKUP GUEST DEMO MODE' : '⛓️ ONCHAIN WAGMI MODE (DEFAULT)'}
            </span>

            {/* Operator Badge */}
            {isOperator && !guestMode && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold">
                <Crown className="w-3.5 h-3.5 text-yellow-400" /> OPERATOR WALLET CONNECTED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">CONTRACT:</span>
            <a
              href={`https://testnet.monadscan.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#836EF9] hover:text-white underline font-bold"
            >
              {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            </a>

            {/* Manual Settle Button for Operator */}
            {isOperator && !guestMode && status === 'LOCKED' && (
              <button
                onClick={handleResolveRound}
                disabled={isTxPending}
                className="px-2.5 py-1 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-[11px]"
              >
                Settle Round Now
              </button>
            )}

            <button
              onClick={toggleGuestMode}
              className="ml-2 px-2.5 py-1 rounded bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-400/30 text-[11px]"
            >
              {guestMode ? 'Switch to Onchain' : 'Switch to Guest Demo'}
            </button>
          </div>
        </div>

        {/* Floating Notification Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-purple-900/90 border border-purple-400 text-white font-mono text-xs shadow-2xl flex items-center justify-between animate-bounce">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-gray-300 hover:text-white text-xs underline font-sans ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 5) Claim Bar: ONLY lights up when previous round is confirmed resolved onchain! */}
        {isPreviousRoundClaimable && !claimableRounds.some((c) => c.roundId === lastOnchainBetRoundId) && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-900/90 to-purple-900/90 border border-emerald-400 text-white flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-300" />
              <span>Round #{lastOnchainBetRoundId} confirmed resolved on Monad! (Losers can also claim without revert)</span>
            </div>
            <button
              onClick={handleClaim}
              disabled={isTxPending}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-wider"
            >
              {isTxPending ? 'Claiming...' : `Claim Round #${lastOnchainBetRoundId}`}
            </button>
          </div>
        )}

        {/* Unclaimed rounds panel: chain-scanned, survives refresh */}
        {!guestMode && isConnected && claimableRounds.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-400/60 text-white flex flex-col gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-300" />
              <span className="font-bold uppercase tracking-wider">Unclaimed Rounds / 待领取</span>
            </div>
            {claimableRounds.map((c) => (
              <div key={c.roundId} className="flex items-center justify-between gap-2">
                <span>
                  Round #{c.roundId} · {c.position === 1 ? 'UP' : 'DOWN'} · Bet {c.amount.toFixed(3)} MON · Est. payout ≈ {c.payout.toFixed(3)} MON
                </span>
                <button
                  onClick={() => handleClaimRound(c.roundId)}
                  disabled={claimingRoundId === c.roundId || isTxPending}
                  className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {claimingRoundId === c.roundId ? 'Claiming...' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 1. Lightning Round Banner (3-min Pitch Demo Trigger) */}
        <LightningBanner
          isLightning={isLightning}
          onTriggerLightning={triggerLightningManual}
          roundsUntilLightning={guestMode ? roundsUntilLightning : onchainRoundsUntilLightning}
        />

        {/* 2. Dynamic Odds Tug-of-War Bar (Core Feature 1) */}
        <TugOfWarBar
          upPool={currentUpPool}
          downPool={currentDownPool}
          upOdds={upOdds}
          downOdds={downOdds}
          upPercent={upPercent}
          isLightning={isLightning}
        />

        {/* 3. Grid: Price Chart & Betting Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Real-time Price Chart (Binance BTC/USDT live) */}
          <div className="lg:col-span-7">
            <PriceChart
              roundId={activeRoundId}
              currentPrice={currentPrice}
              lockPrice={lockPrice}
              priceHistory={priceHistory}
              timeLeft={timeLeft}
              totalTime={isLightning ? LIGHTNING_DURATION : STANDARD_DURATION}
              isLightning={isLightning}
              status={status}
              symbol="BTC / USDT"
            />
          </div>

          {/* Right: Betting Controls & Stakes (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <BettingControls
              amount={betAmount}
              setAmount={setBetAmount}
              onBet={handleBet}
              upOdds={upOdds}
              downOdds={downOdds}
              isLocked={status !== 'BETTING'}
              userCurrentBet={activeUserBet}
              minBet={isLightning ? 0.002 : 0.001}
              isLightning={isLightning}
            />

            {/* Streak & Jackpot Progress Widget (Core Feature 2) */}
            <div className="p-4 rounded-2xl bg-[#151128]/90 border border-purple-500/20 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  WIN STREAK JACKPOT PROGRESS
                </span>
                <span className="font-mono font-bold text-amber-300">{activeUserStreak} / 5</span>
              </div>

              {/* 5-step milestone bar */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-2 rounded-full transition-all ${
                      activeUserStreak >= step
                        ? step === 5
                          ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                          : step >= 3
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-[#836EF9]'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                <span>Streak: {activeUserStreak}x</span>
                {activeUserStreak >= 5 ? (
                  <span className="text-rose-400 font-bold">💥 READY TO CLEAN ENTIRE JACKPOT</span>
                ) : activeUserStreak >= 3 ? (
                  <span className="text-amber-400 font-bold">🔥 20% POT BONUS UNLOCKED</span>
                ) : (
                  <span>Win 3 for 20% Pot, Win 5 for 100% Pot</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <footer className="border-t border-purple-500/20 bg-[#0e0b1f]/90 py-4 px-4 text-center text-xs text-gray-400 font-mono">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Built on Monad Testnet · 30s Standard / 10s Lightning · Binance Live BTC Feed · Dynamic Tug-of-War</span>
          </div>
          <div>
            Contract: <a href={`https://testnet.monadscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer" className="text-purple-300 hover:text-white underline">{CONTRACT_ADDRESS.slice(0, 10)}...</a>
          </div>
        </div>
      </footer>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        jackpotAmount={currentJackpot}
      />
    </main>
  );
}
