import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // URLから /api/holidays/XXXX の XXXX を取得
  const url = new URL(req.url);
  const parts = url.pathname.split("/");
  const yearStr = parts[parts.length - 1] ?? "";
  const year = Number(yearStr);

  if (!Number.isInteger(year) || yearStr.length !== 4) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  // ここに今までの祝日ロジックをそのまま置く（year を使って処理）
  // 例：
  // const holidays = await getHolidays(year);
  // return NextResponse.json({ year, holidays });

  // ※ まだ実装してない場合は仮のレスポンスでもOK
  return NextResponse.json({ year, holidays: [] });
}
