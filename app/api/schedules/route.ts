import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/**
 * 使い方:
 *   /api/schedules?date=YYYY-MM-DD
 * 返り値:
 *   { count: number, items: any[] }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // 例: "2025-09-08"
    if (!dateStr) {
      return NextResponse.json({ count: 0, items: [] });
    }

    // ▼ JSTのその日の範囲 [start, end)
    //   ※ サーバ/クライアントのTZ差を避けるため、明示的に +09:00 を付与
    const start = new Date(`${dateStr}T00:00:00+09:00`);
    const end = new Date(`${dateStr}T00:00:00+09:00`);
    end.setDate(end.getDate() + 1);

    const items: any[] = [];
    const seen = new Set<string>();

    // === パターンA: date が "YYYY-MM-DD" の 文字列保存 ===
    {
      const qs = query(
        collection(db, "schedules"),
        where("date", "==", dateStr)
      );
      const snap = await getDocs(qs);
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          items.push({ id: d.id, ...d.data() });
          seen.add(d.id);
        }
      }
    }

    // === パターンB: date が Firestore Timestamp 保存 ===
    //   その日の [start, end) に収まるレコード
    {
      const qt = query(
        collection(db, "schedules"),
        where("date", ">=", start),
        where("date", "<", end)
      );
      const snap = await getDocs(qt);
      for (const d of snap.docs) {
        if (!seen.has(d.id)) {
          items.push({ id: d.id, ...d.data() });
          seen.add(d.id);
        }
      }
    }

    // === パターンC: startAt/endAt を使うレコード（時間帯含む）
    //  Firestoreは異なる2フィールドの範囲同時指定ができないため、
    //  startAt < end をクエリし、endAt >= start をメモリで絞り込む。
    {
      const qs = query(
        collection(db, "schedules"),
        where("startAt", "<", end)
      );
      const snap = await getDocs(qs);
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        const data = d.data() as any;

        const startAt =
          (data.startAt?.toDate?.() as Date) ??
          (typeof data.startAt === "string" ? new Date(data.startAt) : null);
        const endAt =
          (data.endAt?.toDate?.() as Date) ??
          (typeof data.endAt === "string" ? new Date(data.endAt) : null);

        // 重なり判定: [startAt, endAt) と [start, end) が交差
        const overlaps =
          !!startAt &&
          !!endAt &&
          startAt.getTime() < end.getTime() &&
          endAt.getTime() >= start.getTime();

        // 終日（endAtが翌日00:00なら）でも上の式でヒットします
        if (overlaps) {
          items.push({ id: d.id, ...data });
          seen.add(d.id);
        }
      }
    }

    return NextResponse.json({ count: items.length, items });
  } catch (e: any) {
    console.error("/api/schedules GET error:", e);
    return NextResponse.json({ count: 0, items: [], error: e?.message ?? "error" }, { status: 500 });
  }
}
