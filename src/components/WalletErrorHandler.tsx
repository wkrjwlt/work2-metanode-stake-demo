'use client';
import { useWallet } from '@wkrjwlt/walletkit';

/**
 * 钱包错误处理组件
 * 自动捕获并显示钱包相关错误
 */
export default function WalletErrorHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status, error } = useWallet();

  // 显示错误状态
  if (status === 'error' && error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.082 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">钱包错误</h3>
              <p className="text-sm text-red-600">{error.message}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-xs text-gray-600">错误代码: {error.code || 'UNKNOWN'}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              刷新页面
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}