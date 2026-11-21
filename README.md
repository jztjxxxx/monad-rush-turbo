# ⚡ MONAD RUSH TURBO

> **Sub-Second Dynamic Odds Prediction Game with Win-Streak Jackpots & 10s Lightning Rounds on Monad**

Built from scratch for the Monad Hackathon / Buildathon.

[![Monad Testnet](https://img.shields.io/badge/Monad%20Testnet-Chain%2010143-836EF9)](https://testnet.monadscan.com)
[![Block Time](https://img.shields.io/badge/Block%20Time-400ms-00F59B)](https://docs.monad.xyz)
[![Finality](https://img.shields.io/badge/Finality-800ms%20Instant-FF3366)](https://docs.monad.xyz)

---

## 🚀 为什么选择 Monad？(Why Monad)

在传统的以太坊或 L2 上，二元预测市场（如 Polymarket）往往只能做 15 分钟甚至几小时以上的大周期下注，因为出块慢、Gas 确认延迟，用户无法体验高频互赌的即时爽感。

**Monad Rush Turbo** 完全发挥了 Monad 的极限性能：
- **400ms 极速出块 & 800ms 最终确定性**：每一笔下注毫秒级确认，动态拔河条实时跳动。
- **动态赔率池 (Pari-Mutuel Engine)**：非做市商模式，观众之间互赌，人少的一方赔率飙升，诱发最后一秒大额极限反转！
- **极速 10s 闪电局 (Lightning Round)**：专为极致心跳与高频下注打造，全场脉冲红色闪电特效，演示时支持即时触发！

---

## 🌟 核心机制 (Core Features)

### 1. 动态赔率拔河 (Dynamic Odds Tug-of-War)
- **观众互赌机制**：总奖池根据双方下注金额动态再平衡（Total Pool = Up Pool + Down Pool）。
  $$\text{Odds}_{\text{UP}} = \frac{\text{Net Pool}}{\text{Up Pool}}, \quad \text{Odds}_{\text{DOWN}} = \frac{\text{Net Pool}}{\text{Down Pool}}$$
- **实时红绿拔河条**：每来一笔下注，拔河条与赔率倍数即时刷新，出现“高赔率冷门反打机会”，临近封盘最后一秒下注反超最刺激！

### 2. 连胜系统 + 累积大奖池 (Win Streaks & Progressive Jackpot)
- 每局抽取 **5% 进入全球累积大奖池 (Jackpot)**。
- 个人连胜追踪：
  - **连赢 3 局**：解锁奖池 **20% 额外加成**！
  - **连赢 5 局**：直接**掏空 100% 全球大奖池**！
- 全球风云榜（Hall of Champions）：实时竞逐最高盈利与最高连胜纪录 🔥。

### 3. 闪电局 (10s Lightning Rounds)
- 每 5 局自动进入 1 局 **10 秒闪电局**，最低下注要求翻倍，全场切换霓虹红闪电主题！
- **3分钟路演专属触发器**：页面内置 `⚡ Trigger Lightning Round (Demo)` 按钮，演示时可随时一键进入高潮，无需等待！

---

## 🛠️ 技术架构 (Architecture)

```
monad-rush-turbo/
├── contracts/               # 智能合约 (Foundry / Solc / Viem)
│   ├── MonadRushTurbo.sol   # 动态彩池、连胜判定、大奖池积累与闪电局核心逻辑
│   ├── artifacts/           # 编译产物 ABI & Bytecode
│   └── scripts/
│       ├── compile.js       # 自动化编译脚本
│       └── deploy.js        # Monad Testnet 部署脚本
└── web/                     # 现代化全栈前端 (Next.js 14 App Router)
    ├── src/
    │   ├── app/             # 主界面及游戏状态循环
    │   ├── components/      # 拔河条、实时价格折线图、下注面板、闪电模式横幅、榜单
    │   ├── config/          # Monad Testnet (Chain ID 10143) Wagmi/Viem 配置
    │   └── contracts/       # 前端直接调用的合约 ABI 与网络配置
    ├── tailwind.config.js   # Monad Purple 与 Cyberpunk 配色
    └── tsconfig.json        # 兼容 Viem/Wagmi BigInt 的 ES2020 目标
```

---

## ⚡ Monad Testnet 网络参数

- **Network Name**: Monad Testnet
- **Chain ID**: `10143` (`0x279f`)
- **Currency**: `MON`
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Explorer**: [https://testnet.monadscan.com](https://testnet.monadscan.com)
- **Faucet**: [https://faucet.monad.xyz](https://faucet.monad.xyz)

---

## 🏃 快速启动 (Quick Start)

### 1. 智能合约编译与部署
```bash
cd contracts
npm run compile
# 设置私钥并部署至 Monad Testnet
PRIVATE_KEY="0x..." node scripts/deploy.js
```

### 2. 运行前端应用
```bash
cd web
npm run dev
```
浏览器打开 `http://localhost:3000` 即可开始游戏。
