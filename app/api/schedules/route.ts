import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

function dayRangeJST(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(`${dateStr}T00:00:00+09:00`);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * 使い方:
 *   /api/schedules?date=YYYY-MM-DD
 * 返り値:
 *   { count: number }
 * 方針:
 *   「startAt が本日の [00:00,24:00)（JST）」のみを対象にする
 *   ※ 旧フィールド(date)や重なり判定はカウントから外す
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) return NextResponse.json({ count: 0 });

    const { start, end } = dayRangeJST(dateStr);

    const col = collection(db, "schedules");
    const qy = query(
      col,
      where("startAt", ">=", Timestamp.fromDate(start)),
      where("startAt", "<",  Timestamp.fromDate(end)),
      // もし除外条件を使っているなら揃える（例）
      // where("archived", "==", false),
      // where("status", "in", ["open", "done"]),
    );

    const snap = await getDocs(qy);
    const count = snap.size;
    return NextResponse.json({ count });
  } catch (e: any) {
    console.error("/api/schedules GET error:", e);
    return NextResponse.json({ count: 0, error: e?.message ?? "error" }, { status: 500 });
  }
}
