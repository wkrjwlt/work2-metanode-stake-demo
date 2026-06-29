'use client'
import { useState } from 'react'
import CardBox from './components/CardBox'
import { useAccount } from 'wagmi';
import { useStakeContract } from '../../hooks/useStakeContract';

export default function WithdrawPage() {
  const { address, isConnected } = useAccount();
  const {
    stakedEth,
    requestAmountEth,
    pendingWithdrawEth,
    processingEth,
    loadingReads,
    unstake,
    withdraw,
  } = useStakeContract();

  const [unstakeAmount, setUnstakeAmount] = useState<string>("");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isUnstakeSubmitting, setIsUnstakeSubmitting] = useState(false);
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState(false);

  const onUnstake = async () => {
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }
    const parsed = Number(unstakeAmount);
    if (!unstakeAmount || isNaN(parsed) || parsed <= 0) {
      alert("请输入正确的解除质押数量（ETH）");
      return;
    }

    setIsUnstakeSubmitting(true);
    setTxStatus("准备发送");
    setTxHash(null);

    try {
      await unstake(unstakeAmount, (status, info) => {
        setTxStatus(status);
        if (status === "sent" && info?.hash) setTxHash(info.hash);
        if (status === "confirmed") {
          // 清空输入并提示
          setTimeout(() => setUnstakeAmount(""), 300);
        }
      });
    } catch (err: any) {
      console.error("unstake error", err);
      alert(err?.message ?? String(err));
    } finally {
      setIsUnstakeSubmitting(false);
    }
  };

  const onWithdraw = async () => {
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }

    setIsWithdrawSubmitting(true);
    setTxStatus("准备发送");
    setTxHash(null);

    try {
      await withdraw((status, info) => {
        setTxStatus(status);
        if (status === "sent" && info?.hash) setTxHash(info.hash);
      });
    } catch (err: any) {
      console.error("withdraw error", err);
      alert(err?.message ?? String(err));
    } finally {
      setIsWithdrawSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-[linear-gradient(#222831_1px,transparent_1px),linear-gradient(90deg,#222831_1px,transparent_1px)] bg-[size:24px_24px] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">提取资产</h1>
          <p className="text-gray-400">解除质押并提取你的 ETH</p>
        </div>

        {/* 主卡片容器 */}
        <div className="bg-slate-800/70 rounded-xl p-6 border border-slate-700">
          {/* 顶部三行数据卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <CardBox title="已质押金额" value={loadingReads ? "加载中..." : `${stakedEth} ETH`} />
            <CardBox title="可用的提现" value={loadingReads ? "加载中..." : `${requestAmountEth} ETH`} />
            <CardBox title="处理中的提现" value={loadingReads ? "加载中..." : `${processingEth} ETH`} />
          </div>

          {/* 解押区域 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">解除质押</h2>
            <p className="text-gray-500 text-sm mb-2">解押数量</p>
            <div className="relative mb-5">
              <input
                value={unstakeAmount}
                onChange={(e) => setUnstakeAmount(e.target.value)}
                type="number"
                step="0.0001"
                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-3 text-white pr-16 outline-none focus:border-yellow-400"
                placeholder="0.0"
                disabled={isUnstakeSubmitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">ETH</span>
            </div>
            
            <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-md transition-all flex items-center justify-center gap-2"  onClick={onUnstake} disabled={isUnstakeSubmitting}>
              {isUnstakeSubmitting ? "提交中..." : "解除质押 (unstake)"}
            </button>
          </div>

          {/* 提取区域 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">提取资产</h2>
            {/* 可提取卡片 */}
            <div className="bg-white rounded-md px-5 py-4 mb-4 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">可立即提取</p>
                <p className="text-xl font-bold text-yellow-500">{loadingReads ? "加载中..." : `${pendingWithdrawEth} ETH`}</p>
              </div>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <span>⦿</span> 20分钟冷却期
              </span>
            </div>
            {/* 提示文字 */}
            <p className="text-gray-500 text-xs mb-4 flex items-start gap-1">
              <span>⦿</span>
              解除质押后，你需要等待20分钟才能执行提取操作。
            </p>
            <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-md transition-all flex items-center justify-center gap-2" onClick={onWithdraw} disabled={isWithdrawSubmitting}>
              {isWithdrawSubmitting ? "提交中..." : "提取 ETH (withdraw)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}