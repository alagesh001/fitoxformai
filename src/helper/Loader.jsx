export default function Loader({ label = "Loading clients..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <svg className="animate-spin h-10 w-10 text-blue-500" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      <p className="mt-3 text-sm text-gray-600">{label}</p>
    </div>
  );
}
