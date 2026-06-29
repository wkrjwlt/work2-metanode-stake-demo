import { usePublicClient, useWalletClient } from 'wagmi'
import { getContract } from 'viem'
import type { Address, Abi } from 'viem'

/**
 * 通用合约实例Hook
 * @param address 合约地址
 * @param abi 合约完整ABI
 * @returns 包含读写能力的合约实例 | null
 */
export function useContract(
  address: Address | undefined,
  abi: Abi | undefined
): {
    address: Address,
    abi: Abi
} | null {
  // 获取只读RPC客户端（无需钱包）
  const publicClient = usePublicClient()
  // 获取钱包签名客户端（连接钱包后才有值）
  const { data: walletClient } = useWalletClient()

  // 缺少必要参数直接返回null
  if (!address || !abi || !publicClient) return null

  // 同时传入 public + wallet，实例同时支持 .read / .write
  const contract = getContract({
    address,
    abi,
    client: {
      public: publicClient,
      wallet: walletClient,
    },
  })

  return contract
}