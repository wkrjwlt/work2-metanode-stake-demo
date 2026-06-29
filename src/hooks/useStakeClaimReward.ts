import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useEffect, useMemo } from 'react';
import { formatUnits } from 'viem';
// 统一引入项目全局合约配置（和你现有连接文件保持一致）
import { CONTRACT_ADDRESS, STAKE_ABI } from '../assets/abis/stake';

type UseStakeClaimRewardParams = {
  pid: number; // 质押池子ID
  account?: `0x${string}`; // 当前连接钱包地址
  rewardDecimals: number; // MetaNode奖励代币小数位（通常18）
};

/**
 * 质押挖矿领取奖励统一钩子
 * 读取：待领奖励、领取全局开关、挖矿是否结束
 * 计算：是否满足领取条件 canClaim
 * 执行：claim交易，包含加载、回执、错误处理
 */
export function useStakeClaimReward({
  pid,
  account,
  rewardDecimals,
}: UseStakeClaimRewardParams) {
  const contractConfig = {
    address: CONTRACT_ADDRESS,
    abi: STAKE_ABI,
  } as const;

  // ========== 只读合约数据（和现有文件readContract写法完全统一） ==========
  // 1. 用户当前池子待领取奖励 pendingMetaNode(pid, user)
  const {
    data: pendingRewardBig,
    isLoading: loadingPending,
    error: readPendingErr,
    refetch: refetchPendingReward,
  } = useReadContract({
    ...contractConfig,
    functionName: 'pendingMetaNode',
    args: [BigInt(pid), account ?? '0x0000000000000000000000000000000000000000'],
    query: {
      enabled: !!account, // 钱包连接后才查询
    },
  });

  // 2. 查询全局是否开启领取 claim开关 pauseClaim 反向判断
  const {
    data: claimPaused,
    isLoading: loadingClaimSwitch,
    error: readSwitchErr,
    refetch: refetchClaimSwitch,
  } = useReadContract({
    ...contractConfig,
    functionName: 'claimPaused',
    query: {
      enabled: true,
    },
  });

  // 3. 查询挖矿结束区块、当前链高度判断挖矿是否结束（简化）
  const {
    data: endBlock,
    isLoading: loadingBlock,
    error: readBlockErr,
  } = useReadContract({
    ...contractConfig,
    functionName: 'endBlock',
  });

  const {
    data: MetaNode,
    isLoading: loadingTokenAddr,
    error: readTokenAddrErr,
    refetch: refetchTokenAddress,
  } = useReadContract({
    ...contractConfig,
    functionName: 'MetaNode',
  });

  console.log('执行了rewardTokenAddress---',MetaNode);
  
  // ========== 聚合计算状态 ==========
  // 格式化奖励 字符串展示
  const pendingRewardFormatted = useMemo(() => {
    if (!pendingRewardBig) return '0';
    return formatUnits(pendingRewardBig, rewardDecimals);
  }, [pendingRewardBig, rewardDecimals]);

  // 是否能领取奖励聚合条件
  const canClaim = useMemo(() => {
    if (!account) return false;
    if (claimPaused === true) return false; // 管理员关闭领取
    if (!pendingRewardBig || pendingRewardBig <= 0n) return false;
    return true;
  }, [account, claimPaused, pendingRewardBig]);

  // 全局读取加载态合并
  const isReadLoading = useMemo(() => {
    return loadingPending || loadingClaimSwitch || loadingBlock;
  }, [loadingPending, loadingClaimSwitch, loadingBlock]);

  // 读取错误合并
  const readError = useMemo(() => {
    return readPendingErr || readSwitchErr || readBlockErr;
  }, [readPendingErr, readSwitchErr, readBlockErr]);

  // ========== 写合约：执行领取奖励 claim(pid) 对齐原有writeContractAsync写法 ==========
  const {
    writeContractAsync,
    data: claimTxHash,
    isPending: claimWriting,
    error: claimWriteErr,
    reset: resetClaimTx,
  } = useWriteContract();

  // 等待交易上链回执
  const {
    isLoading: claimConfirming,
    isSuccess: claimSuccess,
    error: claimReceiptErr,
  } = useWaitForTransactionReceipt({
    hash: claimTxHash,
    query: {
      enabled: !!claimTxHash,
    },
  });

  // 领取总加载状态：签名中 / 区块确认中
  const claimLoading = claimWriting || claimConfirming;

  // 统一执行领取函数
  const claimReward = async () => {
    if (!account) throw new Error('请先连接钱包');
    if (!canClaim) throw new Error('暂无法领取奖励');
    try {
      // 和现有项目write调用格式保持完全一致
      const txHash = await writeContractAsync({
        ...contractConfig,
        functionName: 'claim',
        args: [BigInt(pid)],
      });
      return txHash;
    } catch (err) {
      console.error('领取奖励交易失败', err);
      throw err;
    }
  };

  // 领取成功后自动刷新奖励数据
  useEffect(() => {
    if (claimSuccess) {
      refetchPendingReward();
      refetchClaimSwitch();
    }
  }, [claimSuccess, refetchPendingReward, refetchClaimSwitch]);

  // 合并交易错误
  const claimError = claimWriteErr || claimReceiptErr;

  return {
    // 原始链上数据 bigint
    pendingRewardBig: pendingRewardBig ?? 0n,
    // 格式化可读奖励
    pendingRewardFormatted,
    rewardTokenAddress: MetaNode as `0x${string}` | undefined,
    // 全局领取开关状态
    isClaimOpen: claimPaused !== true,
    // 是否满足领取条件
    canClaim,
    // 读取状态
    isReadLoading,
    readError,
    // 领取交易相关
    claimReward, // 执行领取函数
    claimTxHash,
    claimLoading,
    claimSuccess,
    claimError,
    resetClaimTx, // 重置交易状态
    // 刷新只读数据
    refetchAllData: () => {
      refetchPendingReward();
      refetchClaimSwitch();
      refetchTokenAddress();
    },
  };
}