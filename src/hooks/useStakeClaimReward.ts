import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { formatUnits, createPublicClient, createWalletClient, custom, http } from 'viem';
import { sepolia } from 'wagmi/chains';
import { useWallet } from '@wkrjwlt/walletkit';
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
  const { chainId: wltChainId } = useWallet();

  const contractConfig = {
    address: CONTRACT_ADDRESS,
    abi: STAKE_ABI,
  } as const;

  // 为 WLT 钱包在 Sepolia 上创建专用 client（与 useStakeContract 保持一致）
  const sepoliaClient = useMemo(() => {
    if (wltChainId === 11155111) {
      return createPublicClient({
        chain: sepolia,
        transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
      });
    }
    return null;
  }, [wltChainId]);

  // WLT 钱包的 walletClient（用于写操作）
  const walletClient = useMemo(() => {
    if (account && (window as any).wltwallet) {
      return createWalletClient({
        account: account as `0x${string}`,
        chain: sepolia,
        transport: custom((window as any).wltwallet),
      });
    }
    return null;
  }, [account]);

  // ========== 直接读取合约数据（兼容 WLT 钱包） ==========
  const [pendingRewardBig, setPendingRewardBig] = useState<bigint | undefined>(undefined);
  const [claimPaused, setClaimPaused] = useState<boolean | undefined>(undefined);
  const [endBlock, setEndBlock] = useState<bigint | undefined>(undefined);
  const [metaNodeAddr, setMetaNodeAddr] = useState<string | undefined>(undefined);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingClaimSwitch, setLoadingClaimSwitch] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);
  const [loadingTokenAddr, setLoadingTokenAddr] = useState(false);
  const [readPendingErr, setReadPendingErr] = useState<Error | null>(null);
  const [readSwitchErr, setReadSwitchErr] = useState<Error | null>(null);
  const [readBlockErr, setReadBlockErr] = useState<Error | null>(null);
  const [readTokenAddrErr, setReadTokenAddrErr] = useState<Error | null>(null);

  // 防止旧请求覆盖新数据
  const fetchIdRef = useRef(0);

  const fetchReads = useCallback(async () => {
    const thisFetchId = ++fetchIdRef.current;

    const setIfLatest = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      if (fetchIdRef.current === thisFetchId) setter(value);
    };

    const client = sepoliaClient;
    if (!client || !account) {
      setIfLatest(setPendingRewardBig, undefined);
      setIfLatest(setClaimPaused, undefined);
      setIfLatest(setEndBlock, undefined);
      setIfLatest(setMetaNodeAddr, undefined);
      return;
    }

    // 1. 读取待领取奖励
    setIfLatest(setLoadingPending, true);
    try {
      const pending = await client.readContract({
        ...contractConfig,
        functionName: 'pendingMetaNode',
        args: [BigInt(pid), account],
      });
      setIfLatest(setPendingRewardBig, pending as bigint);
    } catch (e: any) {
      setIfLatest(setReadPendingErr, e);
      setIfLatest(setPendingRewardBig, BigInt(0));
    } finally {
      setIfLatest(setLoadingPending, false);
    }

    // 2. 读取 claim 开关
    setIfLatest(setLoadingClaimSwitch, true);
    try {
      const paused = await client.readContract({
        ...contractConfig,
        functionName: 'claimPaused',
      });
      setIfLatest(setClaimPaused, paused as boolean);
    } catch (e: any) {
      setIfLatest(setReadSwitchErr, e);
    } finally {
      setIfLatest(setLoadingClaimSwitch, false);
    }

    // 3. 读取 endBlock
    setIfLatest(setLoadingBlock, true);
    try {
      const end = await client.readContract({
        ...contractConfig,
        functionName: 'endBlock',
      });
      setIfLatest(setEndBlock, end as bigint);
    } catch (e: any) {
      setIfLatest(setReadBlockErr, e);
    } finally {
      setIfLatest(setLoadingBlock, false);
    }

    // 4. 读取 MetaNode 地址
    setIfLatest(setLoadingTokenAddr, true);
    try {
      const addr = await client.readContract({
        ...contractConfig,
        functionName: 'MetaNode',
      });
      setIfLatest(setMetaNodeAddr, addr as string);
    } catch (e: any) {
      setIfLatest(setReadTokenAddrErr, e);
    } finally {
      setIfLatest(setLoadingTokenAddr, false);
    }
  }, [sepoliaClient, account, pid]);

  // 缓存 fetch 函数
  const fetchRef = useRef(fetchReads);
  fetchRef.current = fetchReads;

  // 当钱包连接且 client 可用时触发读取
  useEffect(() => {
    if (!sepoliaClient || !account) return;
    void fetchRef.current();
  }, [sepoliaClient, account]);

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

  // ========== 写合约：执行领取奖励 claim(pid) ==========
  const [claimTxHash, setClaimTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [claimWriting, setClaimWriting] = useState(false);
  const [claimConfirming, setClaimConfirming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimWriteErr, setClaimWriteErr] = useState<Error | null>(null);
  const [claimReceiptErr, setClaimReceiptErr] = useState<Error | null>(null);

  // 领取总加载状态：签名中 / 区块确认中
  const claimLoading = claimWriting || claimConfirming;

  // 统一执行领取函数
  const claimReward = async () => {
    if (!account) throw new Error('请先连接钱包');
    if (!canClaim) throw new Error('暂无法领取奖励');
    if (!walletClient || !sepoliaClient) throw new Error('钱包客户端未就绪');

    setClaimWriting(true);
    setClaimSuccess(false);
    setClaimWriteErr(null);
    setClaimReceiptErr(null);

    try {
      // 1. 签名并发送交易
      const hash = await walletClient.writeContract({
        ...contractConfig,
        functionName: 'claim',
        args: [BigInt(pid)],
      });
      setClaimTxHash(hash);
      setClaimWriting(false);
      setClaimConfirming(true);

      // 2. 等待交易确认
      const receipt = await sepoliaClient.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
      });
      setClaimConfirming(false);
      setClaimSuccess(true);

      // 3. 刷新数据
      fetchRef.current();

      return hash;
    } catch (err: any) {
      setClaimWriting(false);
      setClaimConfirming(false);
      if (claimWriting) {
        setClaimWriteErr(err);
      } else {
        setClaimReceiptErr(err);
      }
      console.error('领取奖励交易失败', err);
      throw err;
    }
  };

  // 合并交易错误
  const claimError = claimWriteErr || claimReceiptErr;

  const resetClaimTx = () => {
    setClaimTxHash(undefined);
    setClaimWriting(false);
    setClaimConfirming(false);
    setClaimSuccess(false);
    setClaimWriteErr(null);
    setClaimReceiptErr(null);
  };

  return {
    // 原始链上数据 bigint
    pendingRewardBig: pendingRewardBig ?? 0n,
    // 格式化可读奖励
    pendingRewardFormatted,
    rewardTokenAddress: metaNodeAddr as `0x${string}` | undefined,
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
      fetchRef.current();
    },
  };
}
