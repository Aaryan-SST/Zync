export default function StatusBadge({ status }) {
  const normalized = (status || "UNKNOWN").toUpperCase();

  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-300";
  let dotStyle = "bg-gray-400";

  if (normalized === "OPERATIONAL") {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotStyle = "bg-emerald-500";
  } else if (normalized === "DEGRADED") {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
    dotStyle = "bg-amber-500";
  } else if (normalized === "DOWN") {
    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
    dotStyle = "bg-rose-500 animate-pulse";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      {normalized}
    </span>
  );
}
