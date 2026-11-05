import { Switch } from "@/components/ui/switch";

export function StatusSwitch({
  status,
  onChange,
  disabled,
  label = true,
}: {
  status: string;
  onChange: (status: string) => void;
  disabled?: boolean;
  label?: boolean;
}) {
  const on = status === "active";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Switch
        checked={on}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v ? "active" : "inactive")}
        aria-label={on ? "Turn off" : "Turn on"}
      />
      {label ? (
        <span
          className={`w-7 text-xs font-medium ${on ? "text-success" : "text-muted-foreground"}`}
        >
          {on ? "On" : "Off"}
        </span>
      ) : null}
    </div>
  );
}
