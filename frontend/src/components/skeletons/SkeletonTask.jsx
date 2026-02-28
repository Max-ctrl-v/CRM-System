export default function SkeletonTask() {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-border-light animate-pulse">
      <div className="w-5 h-5 rounded-md bg-gray-200 mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-2/3" />
        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
        <div className="flex gap-2">
          <div className="h-5 bg-gray-100 rounded-md w-20" />
          <div className="h-5 bg-gray-100 rounded-md w-16" />
        </div>
      </div>
    </div>
  );
}
