'use client'
import { ConnectButton } from "@rainbow-me/rainbowkit"
import Link from 'next/link'
import { usePathname } from 'next/navigation'


export default function Headers(){
  // 获取当前路由，实现菜单高亮
  const pathname = usePathname()

  // 菜单列表配置
  const menuList = [
    { label: 'Stake', path: '/' },
    { label: 'Withdrawl', path: '/withdrawl' },
    { label: 'Claim',path: '/claim'}
  ]

    return (
        <div className="bg-yellow-800 w-full h-20 flex items-center fixed top-0 left-0">
            <div className="ml-auto mr-auto flex justify-between items-center" style={{width:"1440px"}}>
              <div className="text-[#e1d7ba] font-bold text-3xl">
                MeteNode Stake Demo
              </div>
              <div className="">
                {menuList.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className="mr-5"
                  style={{
                    fontSize: '28px',
                    // 当前页面菜单高亮
                    color: pathname === item.path ? '#f0b100' : '#fff',
                    textDecoration: pathname === item.path ?'underline':'none'
                  }}
                >
                  {item.label}
                </Link>
              ))}
              </div>
              <ConnectButton />
            </div>
            
          </div>
    )
}