import { fmtPct, fmtRating, pct, type GroupStat } from "@/lib/analytics";

export function StatTable({
  stats,
  label,
  showVenue = true,
  minSample,
}: {
  stats: GroupStat[];
  label: string;
  showVenue?: boolean;
  minSample?: number;
}) {
  if (!stats.length)
    return <p className="text-sm text-muted-foreground">No data for the selected filters.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">{label}</th>
            <th className="py-2 pr-3">Responses</th>
            <th className="py-2 pr-3">Content</th>
            <th className="py-2 pr-3">Trainer</th>
            {showVenue ? <th className="py-2 pr-3">Venue</th> : null}
            <th className="py-2 pr-3">Overall</th>
            <th className="py-2 pr-3">Score %</th>
            <th className="py-2 pr-3">Recommend</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.key} className="border-b last:border-0">
              <td className="py-2 pr-3 font-medium">
                {s.key}
                {minSample && s.responses < minSample ? (
                  <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    small sample
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-3 tabular-nums">{s.responses}</td>
              <td className="py-2 pr-3 tabular-nums">{fmtRating(s.content)}</td>
              <td className="py-2 pr-3 tabular-nums">{fmtRating(s.trainer)}</td>
              {showVenue ? (
                <td className="py-2 pr-3 tabular-nums">{fmtRating(s.venue)}</td>
              ) : null}
              <td className="py-2 pr-3 tabular-nums">{fmtRating(s.overall)}</td>
              <td className="py-2 pr-3 tabular-nums">{fmtPct(pct(s.overall))}</td>
              <td className="py-2 pr-3 tabular-nums">{fmtPct(s.recommendPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
