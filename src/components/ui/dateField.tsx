import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  inputClassName = "bg-surface-2 h-9 border-none",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  inputClassName?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required
        className={inputClassName}
      />
    </div>
  );
}
