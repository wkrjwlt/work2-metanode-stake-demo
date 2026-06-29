'use client'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useStakeContract } from '../hooks/useStakeContract'
import { getAddress } from 'viem'

export default function StakePage() {
  // 质押输入金额
  const [stakeValue, setStakeValue] = useState('')

  const {address,isConnected} = useAccount()

const {
    stakedEth,
    pendingWithdrawEth,
    loadingReads,
    balanceEth,
    depositETH,
  } = useStakeContract();
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDeposit = async () => {
    if (!isConnected) {
      alert("请先连接钱包");
      return;
    }
    const parsed = Number(stakeValue);
    if (!stakeValue || isNaN(parsed) || parsed <= 0) {
      alert("请输入大于 0 的质押数量（ETH）");
      return;
    }

    setIsSubmitting(true);
    setTxStatus("准备发送");
    setTxHash(null);

    try {
      await depositETH(stakeValue, (status, info) => {
        // status: sending | sent | confirmed | error
        setTxStatus(status);
        if (status === "sent" && info?.hash) {
          setTxHash(info.hash);
        }
        if (status === "confirmed") {
          // 在确认后可以清理输入并提示
          setTimeout(() => {
            setStakeValue("");
          }, 500);
        }
      });
    } catch (err: any) {
      console.error("deposit error", err);
      alert(err?.message ?? String(err));
    } finally {
      setIsSubmitting(false);
      // 保留 txStatus/txHash 以便用户点击查看或页面刷新
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-900 bg-[linear-gradient(#222831_1px,transparent_1px),linear-gradient(90deg,#222831_1px,transparent_1px)] bg-[size:24px_24px] py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* 页面标题区域 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">MetaNode 质押</h1>
          <p className="text-gray-400">质押 ETH 赚取平台代币</p>
        </div>

        {/* 主容器卡片 */}
        <div className="bg-slate-800/70 rounded-xl p-6 border border-yellow-700/40">
          {/* 顶部已质押金额卡片 */}
          <div className="bg-slate-900/60 rounded-lg p-6 flex items-center gap-5 mb-8 border border-yellow-600/30">
            {/* 左侧图标圆形 */}
            <div className="w-16 h-16 rounded-full bg-yellow-600/20 flex items-center justify-center shrink-0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M13 7h8v8" />
              </svg>
            </div>
            {/* 右侧金额文字 */}
            <div>
              <p className="text-gray-400 text-base mb-1">已质押总额</p>
              <p className="text-4xl font-bold text-yellow-400">{stakedEth}</p>
            </div>
          </div>

          {/* 质押输入区域 */}
          <div className="mb-6">
            <p className="text-gray-400 mb-2">质押数量</p>
            {/* 输入框 */}
            <div className="relative mb-2">
              <input
                type="number"
                step="0.0001"
                value={stakeValue}
                onChange={(e) => setStakeValue(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-md px-4 py-4 text-white pr-16 text-lg outline-none focus:border-yellow-400 transition-colors"
                placeholder="0.0"
                disabled={!isConnected || isSubmitting}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">ETH</span>
            </div>
            {/* 可用余额提示 */}
            <p className="text-gray-500 text-sm">可用余额：{balanceEth}</p>
          </div>

          {/* 质押按钮 */}
          <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-4 rounded-md text-lg transition-all flex items-center justify-center gap-3" onClick={onDeposit} disabled={!isConnected || isSubmitting}>
            <span>↓</span>
            质押 ETH
          </button>
        </div>
        {txStatus && (
          <section style={{ marginTop: 16 }}>
            <div><strong>交易状态：</strong> {txStatus}</div>
            {txHash && (
              <div style={{ marginTop: 6 }}>
                <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                  查看交易（Etherscan）
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}