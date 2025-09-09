export type Schedule = {
    id: string;
    title: string;
    date: string;
};

export const schedules: Schedule[] = [
    // 例：今日1件あるようにテスト
    // 実運用ではDBから取得に差し替え
    { id: "demo-1", title: "現場A打合せ", date: new Date().toLocaleDateString("sv-SE") },
    // "sv-SE" => "YYYY-MM-DD" 形式
]