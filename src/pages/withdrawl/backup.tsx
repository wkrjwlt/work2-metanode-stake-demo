// src/pages/withdraw.tsx
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "../components/Header";
import { useStakeContract } from "../hooks/useStakeContract";

/**
 * Withdraw 页面
 * - 显示: 已质押 (stakedEth)、总撤回请求 (requestAmountEth)、已解锁可提现 (pendingWithdrawEth)、处理中 (processingEth)
 * - 提供解除质押 (unstake) 输入框 + 按钮（生成请求）
 * - 提供提现 (withdraw) 按钮（提取已解锁金额）
 */
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
    <div>
      <Header />
      <main style={{ padding: 20 }}>
        <h2>Withdraw（ETH 池）</h2>

        {!isConnected && <div style={{ color: "#666" }}>请连接钱包以查看和操作。</div>}

        <section style={{ marginTop: 12 }}>
          <div><strong>钱包地址：</strong> {address ?? "-"}</div>
          <div style={{ marginTop: 8 }}>
            <div><strong>当前已质押：</strong> {loadingReads ? "加载中..." : `${stakedEth} ETH`}</div>
            <div><strong>总撤回请求量：</strong> {loadingReads ? "加载中..." : `${requestAmountEth} ETH`}</div>
            <div><strong>已解锁可提现：</strong> {loadingReads ? "加载中..." : `${pendingWithdrawEth} ETH`}</div>
            <div><strong>处理中（未解锁）：</strong> {loadingReads ? "加载中..." : `${processingEth} ETH`}</div>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <h3>解除质押 (unstake)</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              placeholder="0.5"
              inputMode="decimal"
              style={{ padding: 8, width: 220 }}
              disabled={isUnstakeSubmitting}
            />
            <button onClick={onUnstake} disabled={isUnstakeSubmitting}>
              {isUnstakeSubmitting ? "提交中..." : "解除质押 (unstake)"}
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#666" }}>
            说明：解除质押会生成一个请求，请等待合约配置的锁定区块数（unstakeLockedBlocks）后再调用提现 (withdraw)。
          </div>
        </section>

        <section style={{ marginTop: 20 }}>
          <h3>提现 (withdraw)</h3>
          <div>
            <button onClick={onWithdraw} disabled={isWithdrawSubmitting}>
              {isWithdrawSubmitting ? "提交中..." : "提现已解锁金额 (withdraw)"}
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#666" }}>
            说明：withdraw 会把所有已解锁的请求合并并把 ETH 发回到你的地址。
          </div>
        </section>

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
      </main>
    </div>
  );
}