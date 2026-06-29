'use client'
type Props = {
  title: string
  value: string
}
export default function CardBox({ title, value }: Props) {
  return (
    <div className="bg-white rounded-md px-5 py-4 min-w-[180px] text-center">
      <p className="text-gray-500 text-sm mb-1">{title}</p>
      <p className="text-xl font-bold text-yellow-500">{value}</p>
    </div>
  )
}