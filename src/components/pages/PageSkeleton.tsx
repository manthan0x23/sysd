/** Shown inside the page body while its data loads, so the header and layout never disappear. */
export function PageSkeleton({ narrow = false, rows = 3 }: { narrow?: boolean; rows?: number }) {
  return (
    <main className={`pm ${narrow ? "narrow" : ""}`} aria-busy="true" aria-label="Loading">
      <div className="skel sk-title" />
      <div className="skel sk-line" />
      <div className="sk-grid">{Array.from({ length: rows }, (_, i) => <div key={i} className="skel sk-card" />)}</div>
    </main>
  );
}
