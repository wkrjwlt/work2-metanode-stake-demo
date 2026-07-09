---
name: dynamic-cooldown-display
description: 动态冷却期倒计时显示功能实现说明
metadata:
  type: project
---

# 动态冷却期倒计时显示功能

## 功能概述

在解除质押页面实现动态显示冷却期倒计时，帮助用户了解何时可以提取解质押的 ETH。

## 实现细节

### 1. 新增状态变量（useStakeContract.ts）

- `remainingCooldownSeconds`: 剩余冷却时间（秒）
- `avgBlockTime`: 平均区块时间（默认12秒，实际动态计算）

### 2. 倒计时计算逻辑

**核心流程：**
1. 通过事件日志查询最近的 `RequestUnstake` 事件
2. 获取请求发起的区块号和时间戳
3. 计算解锁时间 = 发起时间 + (锁定区块数 × 平均区块时间)
4. 剩余时间 = 解锁时间 - 当前时间
5. 每秒更新倒计时显示

**公式：**
```
解锁时间 = requestBlockTimestamp + unstakeLockedBlocks × avgBlockTime
剩余时间 = max(0, 解锁时间 - 当前时间)
```

### 3. UI 显示优化

**三种状态显示：**
- ✅ **可立即提取**: 绿色高亮，显示"可以提取"按钮
- ⏳ **冷却期中**: 显示动态倒计时（时:分:秒）
- ⦿ **无待提取**: 显示标准冷却期说明

**新增组件：**
- 处理中提现卡片：显示正在冷却期的金额和倒计时
- 动态提示信息：根据状态智能提示
- 平均区块时间显示：帮助用户理解冷却期计算

### 4. 关键改进

**智能判断逻辑：**
```typescript
hasPendingWithdraw = pendingWithdrawEth > 0  // 有可提取金额
hasProcessingWithdraw = processingEth > 0    // 有处理中金额
canWithdrawNow = hasPendingWithdraw && remainingCooldownSeconds <= 0
isWaitingCooldown = hasProcessingWithdraw && remainingCooldownSeconds > 0
```

**实时更新：**
- 每秒自动更新倒计时显示
- 解质押成功后立即刷新数据
- 自动触发事件查询获取最新状态

## 相关文件

- [src/hooks/useStakeContract.ts](src/hooks/useStakeContract.ts) - 核心逻辑实现
- [src/pages/withdrawl/index.tsx](src/pages/withdrawl/index.tsx) - UI 显示优化
- [D:\web3\Advanced2-contract-stake\stake-contract\contracts\MetaNodeStake.sol](D:\web3\Advanced2-contract-stake\stake-contract\contracts\MetaNodeStake.sol) - 合约解质押逻辑

## 使用说明

1. 用户发起解质押（unstake）后，系统自动创建 `UnstakeRequest`
2. 页面显示处理中金额和实时倒计时
3. 冷却期结束后，状态自动切换为"可立即提取"
4. 用户点击提取按钮完成 withdraw 操作

## 注意事项

- 倒计时基于区块链事件计算，可能存在1-2分钟的误差
- 平均区块时间动态计算，反映当前网络状况
- 如果无法查询到事件，使用默认冷却期估算