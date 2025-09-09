import Link from "next/link";
import TodayCard from "@/components/TodayCard";


export default function DashboardPage() {
  return (
    <div className="grid dashboard-grid">
      <section className="card span-all">
        <TodayCard />
      </section>

      <section className="card">
        <h2>取引先</h2>
        <p className="muted">元請会社の登録・編集</p>
        <Link className="btn" href="/clients">取引先を管理</Link>
      </section>

      <section className="card">
        <h2>外注先</h2>
        <p className="muted">外注先の登録・管理</p>
        <Link className="btn" href="/workers">外注先を管理</Link>
      </section>
    </div>
  );
}