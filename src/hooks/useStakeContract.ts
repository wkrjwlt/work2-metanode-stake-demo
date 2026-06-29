// src/hooks/useStakeContract.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useBlockNumber } from "wagmi";
import { parseEther, formatEther } from "viem";
import { CONTRACT_ADDRESS, STAKE_ABI, ETH_PID } from "../assets/abis/stake";

/**
 * useStakeContract - 读取 + 写入封装
 * 兼容性：
 * - 避免直接使用 BigInt 字面量 (0n) —— 使用 BigInt(0) 以便在 target < ES2020 时也能通过编译
 * - 在调用 publicClient / walletClient 前做存在性检查，避免 "possibly undefined" 报错
 */
export function useStakeContract() {
  const { address, isConnected } = useAccount();

  // 可能为 undefined，需在使用前校验
  const publicClient = usePublicClient(); // 只读 client（viem client）
  const {data:walletClient} = useWalletClient(); // 钱包签名 client（用于写交易）
  const block = useBlockNumber({ watch: false });

  const [stakedWei, setStakedWei] = useState<bigint>(BigInt(0));
  const [requestAmountWei, setRequestAmountWei] = useState<bigint>(BigInt(0));
  const [pendingWithdrawWei, setPendingWithdrawWei] = useState<bigint>(BigInt(0));
  const [loadingReads, setLoadingReads] = useState(false);
  const [balanceWei, setBalanceWei] = useState<bigint>(BigInt(0));



const fetchReads = useCallback(async () => {
  // 正在加载中直接退出，防止并发重复请求
  if (loadingReads) return;

  if (!publicClient || !address) {
    setStakedWei(BigInt(0));
    setRequestAmountWei(BigInt(0));
    setPendingWithdrawWei(BigInt(0));
    setBalanceWei(BigInt(0));
    return;
  }

  setLoadingReads(true);
    try {
      // 1. 获取钱包原生ETH余额
      let userBalance = BigInt(0);
      try {
        userBalance = await publicClient.getBalance({ address });
      } catch (e) {
        userBalance = BigInt(0);
      }
      setBalanceWei(userBalance);
      // 读取 stakingBalance
      console.log("调用参数 pid:", ETH_PID, "user:", address,"CONTRACT_ADDRESS：",CONTRACT_ADDRESS)
      const staked = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: STAKE_ABI,
        functionName: "stakingBalance",
        args: [BigInt(ETH_PID), address],
      });
      console.log('执行了stakingBalance----',staked);
      
      // 读取 withdrawAmount
      const withdrawRes = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: STAKE_ABI,
        functionName: "withdrawAmount",
        args: [BigInt(ETH_PID), address],
      });

      const stakedBn: bigint = BigInt(staked ?? BigInt(0));

      // 解析 withdraw 返回（兼容 tuple / object）
      let reqBn = BigInt(0);
      let pendingBn = BigInt(0);
      try {
        if (Array.isArray(withdrawRes)) {
          reqBn = BigInt(withdrawRes[0] ?? BigInt(0));
          pendingBn = BigInt(withdrawRes[1] ?? BigInt(0));
        } else if (withdrawRes && typeof withdrawRes === "object" && "0" in (withdrawRes as any)) {
          reqBn = BigInt((withdrawRes as any)[0] ?? BigInt(0));
          pendingBn = BigInt((withdrawRes as any)[1] ?? BigInt(0));
        } else {
          reqBn = BigInt((withdrawRes as any).requestAmount ?? (withdrawRes as any)[0] ?? BigInt(0));
          pendingBn = BigInt((withdrawRes as any).pendingWithdrawAmount ?? (withdrawRes as any)[1] ?? BigInt(0));
        }
      } catch (e) {
        reqBn = BigInt(0);
        pendingBn = BigInt(0);
      }

      setStakedWei(stakedBn);
      setRequestAmountWei(reqBn);
      setPendingWithdrawWei(pendingBn);
    } catch (err: any) {
      // 识别“返回0x空数据”的特有错误
      const isEmptyData =
        (err && err.cause && (err.cause as any).data === "0x") ||
        (err && typeof err.message === "string" && err.message.includes('returned no data ("0x")'));
      if (isEmptyData) {
        // 用户无质押，直接置0，不打印报错干扰控制台
        setStakedWei(BigInt(0));
      } else {
        console.error("fetchReads error", err);
      }
    } finally {
      setLoadingReads(false);
    }
}, [publicClient, address, loadingReads]);

  // 缓存fetch函数，避免依赖频繁变化
const fetchRef = useRef(fetchReads);
fetchRef.current = fetchReads;
  // 仅在 publicClient 可用、已连接并且 address 可用时触发读取，并且响应区块变化（实时）
  useEffect(() => {
    if (!publicClient || !isConnected || !address) return;
    void fetchRef.current();
    // 依赖 publicClient 以确保当 client 从 undefined 变为可用时会重新触发
  }, [publicClient, address, isConnected]);

  // 格式化字符串用于 UI（formatEther 接受 bigint）
  const stakedEth = useMemo(() => formatEther(stakedWei), [stakedWei]);
  const requestAmountEth = useMemo(() => formatEther(requestAmountWei), [requestAmountWei]);
  const pendingWithdrawEth = useMemo(() => formatEther(pendingWithdrawWei), [pendingWithdrawWei]);
  const processingWei = requestAmountWei > pendingWithdrawWei ? (requestAmountWei - pendingWithdrawWei) : BigInt(0);
  const processingEth = useMemo(() => formatEther(processingWei), [processingWei]);
  const balanceEth = useMemo(() => formatEther(balanceWei), [balanceWei]);

  // ---------- 写操作 ----------
  // 所有写操作在执行前都要确保 walletClient 可用
  async function depositETH(amountEth: string, onStatus?: (status: string, info?: any) => void) {
    if (!walletClient) throw new Error("Wallet client not available");
    if (!publicClient) throw new Error("Public client not available");
    const value = parseEther(amountEth);
    try {
      onStatus?.("sending");
      // walletClient.writeContract 在你的版本上可能需要 as any 来绕开类型不完全匹配
      const hash = await walletClient.writeContract({
        abi: STAKE_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "depositETH",
        value,
      });
      onStatus?.("sent", { hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      onStatus?.("confirmed", { receipt });
      await fetchReads();
      return { hash, receipt };
    } catch (err) {
      onStatus?.("error", err);
      throw err;
    }
  }

  async function unstake(amountEth: string, onStatus?: (status: string, info?: any) => void) {
    if (!walletClient) throw new Error("Wallet client not available");
    if (!publicClient) throw new Error("Public client not available");
    const amount = parseEther(amountEth);
    try {
      onStatus?.("sending");
      const hash = await walletClient.writeContract({
        abi: STAKE_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "unstake",
        args: [BigInt(ETH_PID), amount],
      });
      onStatus?.("sent", { hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      onStatus?.("confirmed", { receipt });
      await fetchReads();
      return { hash, receipt };
    } catch (err) {
      onStatus?.("error", err);
      throw err;
    }
  }

  async function withdraw(onStatus?: (status: string, info?: any) => void) {
    if (!walletClient) throw new Error("Wallet client not available");
    if (!publicClient) throw new Error("Public client not available");
    try {
      onStatus?.("sending");
      const hash = await walletClient.writeContract({
        abi: STAKE_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "withdraw",
        args: [BigInt(ETH_PID)],
      });
      onStatus?.("sent", { hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      onStatus?.("confirmed", { receipt });
      await fetchReads();
      return { hash, receipt };
    } catch (err) {
      onStatus?.("error", err);
      throw err;
    }
  }

  async function claim(onStatus?: (status: string, info?: any) => void) {
    if (!walletClient) throw new Error("Wallet client not available");
    if (!publicClient) throw new Error("Public client not available");
    try {
      onStatus?.("sending");
      const hash = await walletClient.writeContract({
        abi: STAKE_ABI,
        address: CONTRACT_ADDRESS,
        functionName: "claim",
        args: [BigInt(ETH_PID)],
      });
      onStatus?.("sent", { hash });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      onStatus?.("confirmed", { receipt });
      await fetchReads();
      return { hash, receipt };
    } catch (err) {
      onStatus?.("error", err);
      throw err;
    }
  }

  return {
    // raw wei
    stakedWei,
    requestAmountWei,
    pendingWithdrawWei,
    processingWei,
    balanceWei,
    // formatted strings
    stakedEth,
    requestAmountEth,
    pendingWithdrawEth,
    processingEth,
    balanceEth,
    loadingReads,
    refetchReads: fetchReads,
    // writes
    depositETH,
    unstake,
    withdraw,
    claim,
  };
}