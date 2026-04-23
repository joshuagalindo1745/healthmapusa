export const ResultsSkeleton = () => (
  <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 animate-fade-in">
    <div className="h-8 w-72 rounded-md skeleton-shimmer mb-3" />
    <div className="h-4 w-96 rounded-md skeleton-shimmer mb-10" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border p-5 h-56">
          <div className="h-5 w-32 skeleton-shimmer rounded mb-4" />
          <div className="h-10 w-24 skeleton-shimmer rounded mb-4" />
          <div className="h-2 w-full skeleton-shimmer rounded mb-6" />
          <div className="h-4 w-full skeleton-shimmer rounded" />
        </div>
      ))}
    </div>
    <div className="rounded-xl bg-card border border-border p-6 h-48">
      <div className="h-5 w-48 skeleton-shimmer rounded mb-4" />
      <div className="h-3 w-full skeleton-shimmer rounded mb-2" />
      <div className="h-3 w-11/12 skeleton-shimmer rounded mb-2" />
      <div className="h-3 w-10/12 skeleton-shimmer rounded" />
    </div>
  </section>
);
