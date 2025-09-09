import '@/styles/history.css';
import HistoryTimeline from '@/components/HistoryTimeline';

export default function SiteHistoryPage({ params }: any) {
  const { id } = params;

  return (
    <main className="page-wrap">
      <header className="page-header">
        <h1>現場の変更履歴</h1>
        <p className="muted">ID: {id}</p>
      </header>

      <section className="card stack">
        {/* HistoryTimeline 側で .timeline / .timeline-item を使えると綺麗にハマります */}
        <HistoryTimeline collectionKey="sites" docId={id} />
      </section>
    </main>
  );
}
