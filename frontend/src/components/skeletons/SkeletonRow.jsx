export default function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-3.5 bg-gray-200 rounded w-32" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-40" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-20" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded-md w-24" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded-md w-20" /></td>
      <td className="px-4 py-3"><div className="h-3 bg-gray-100 rounded w-16" /></td>
    </tr>
  );
}
