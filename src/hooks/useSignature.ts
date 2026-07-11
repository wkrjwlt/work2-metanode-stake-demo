'use client';
import { useState } from 'react';
import { useWallet } from '@wkrjwlt/walletkit';

/**
 * 签名功能 Hook
 * 提供便捷的签名操作和状态管理
 */
export function useSignature() {
  const { signMessage, isConnected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [signature, setSignature] = useState<string>('');

  /**
   * 签名消息
   * @param message 要签名的消息
   * @returns 签名结果
   */
  const sign = async (message: string): Promise<string | null> => {
    if (!isConnected) {
      setError('请先连接钱包');
      return null;
    }

    setLoading(true);
    setError('');

    try {
      const sig = await signMessage(message);
      setSignature(sig);
      return sig;
    } catch (err: any) {
      const errorMsg = err.message || '签名失败';
      setError(errorMsg);
      console.error('签名失败:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 清除错误
   */
  const clearError = () => {
    setError('');
  };

  /**
   * 清除签名
   */
  const clearSignature = () => {
    setSignature('');
  };

  return {
    sign,
    loading,
    error,
    signature,
    clearError,
    clearSignature,
    isConnected,
    address,
  };
}