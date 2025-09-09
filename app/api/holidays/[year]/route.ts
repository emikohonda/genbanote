// app/api/holidays/[year]/route.ts
import { NextResponse } from 'next/server';
import Holidays from 'date-holidays';

export async function GET(
  _req: Request,
  { params }: { params: { year: string } }
) {
  const year = Number(params.year || new Date().getFullYear());

  const hd = new Holidays('JP'); // 日本の祝日
  const list = hd.getHolidays(year).filter(h => h.type === 'public');

  // "YYYY-MM-DD" 形式だけをユニーク化して返す
  const days = Array.from(new Set(list.map(h => h.date.slice(0, 10))));

  return NextResponse.json(
    { year, days },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 1日キャッシュ
      },
    }
  );
}
