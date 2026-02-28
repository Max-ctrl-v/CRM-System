export default function SkeletonCard() {
  return (
    <div
      className="rounded-lg p-3.5 bg-white border border-border-light animate-pulse"
      style={{ borderLeftWidth: '3px', borderLeftColor: '#e2e5eb' }}
    >
      <div className="flex items-start gap-2">
        <div className="w-3.5 h-3.5 bg-gray-200 rounded mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 bg-gray-100 rounded-md w-16" />
            <div className="h-5 bg-gray-100 rounded-md w-20" />
          </div>
          <div className="h-2 bg-gray-100 rounded w-24 mt-1" />
        </div>
      </div>
    </div>
  );
}
