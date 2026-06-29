import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  // 目标RPC地址
  const RPC_URL = "https://eth.merkle.io/";

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data);
}