'use client'
import { useState } from 'react'
import CardBox from '../withdrawl/components/CardBox';
import { useAccount } from 'wagmi';
import { useStakeContract } from '../../hooks/useStakeContract';
import { useStakeClaimReward } from '../../hooks/useStakeClaimReward';

export default function ClaimPage({pid = 0}) {
  const { address, isConnected } = useAccount();
  const {
    stakedEth,
    loadingReads,
    claim
  } = useStakeContract();
  const {
    pendingRewardFormatted,
    canClaim,
    isReadLoading,
    rewardTokenAddress,
    claimReward,
    claimLoading,
    claimSuccess,
    claimError,
  } = useStakeClaimReward({
    pid,
    account: address,
    rewardDecimals: 18,
  });

  const handleClaim = async () => {
    try {
      const hash = await claimReward();
      console.log('领取交易hash', hash);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (isReadLoading) return <div>加载奖励数据...</div>;

  return (
    <div className="min-h-screen bg-slate-900 bg-[linear-gradient(#222831_1px,transparent_1px),linear-gradient(90deg,#222831_1px,transparent_1px)] bg-[size:24px_24px] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">领取奖励</h1>
          <p className="text-gray-400">一键领取质押产生的全部奖励</p>
        </div>

        {/* 主卡片容器 */}
        <div className="bg-slate-800/70 rounded-xl p-6 border border-slate-700">
          {/* 顶部数据卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <CardBox title="当前已质押" value={loadingReads ? "加载中..." : `${stakedEth} ETH`} />
            <CardBox title="待领取奖励" value={loadingReads ? "加载中..." : `${parseFloat(pendingRewardFormatted).toFixed(4)} MetaNode`} />
          </div>

          {/* 领取奖励操作区域 */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">奖励领取</h2>
            <div className="bg-white rounded-md px-5 py-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">当前代币合约地址</p>
                <p className="text-xl font-bold text-yellow-500">{rewardTokenAddress}</p>
              </div>
            </div>
            {/* <p className="text-gray-500 text-xs mb-6 flex items-start gap-1">
              <span>⦿</span>
              点击领取按钮即可提取当前全部质押奖励，交易确认后刷新余额。
            </p> */}
            <button
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-md transition-all flex items-center justify-center gap-2"
              onClick={handleClaim}
              disabled={!canClaim || claimLoading}
            >
              {claimLoading ? "领取中..." : "一键领取奖励 (claim)"}
            </button>

            {/* 交易状态展示 */}
            {claimSuccess && <p style={{color:'white',marginTop:'20px'}}>领取成功！</p>}
            {claimError && <p style={{ color: 'red',marginTop:'20px' }}>{claimError.message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}