import { Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MENTION = /@([A-Za-z0-9_-]+)/g;

/** Renders text with "@EmployeeID" tags replaced by the tagged employee's name in blue. */
export function MentionText({ text, className }: { text: string; className?: string }) {
  const codes = [...new Set([...text.matchAll(MENTION)].map((m) => m[1] ?? ""))].sort();
  const { data: names } = useQuery({
    queryKey: ["employee-names", codes],
    enabled: codes.length > 0,
    staleTime: 600_000,
    queryFn: async () => {
      const { data } = await supabase.rpc("lookup_employee_names", { _codes: codes });
      return Object.fromEntries((data ?? []).map((r) => [r.employee_code, r.name])) as Record<string, string>;
    },
  });

  const parts = text.split(MENTION);
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        const name = names?.[part];
        return name ? (
          <span key={i} className="font-semibold text-mention" title={`Employee ID ${part}`}>
            {`@${name}`}
          </span>
        ) : (
          <Fragment key={i}>{`@${part}`}</Fragment>
        );
      })}
    </p>
  );
}
