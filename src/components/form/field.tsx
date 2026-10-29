import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Zajednička visina i pozadina kontrola u formama: 48 px, za dodir prstom i sa rukavicama. */
export const controlCls = "h-12 bg-card text-base md:text-base";

export function Field({
  id,
  label,
  error,
  warning,
  hint,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  warning?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            {" "}*
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-warning`} className="text-sm text-warning">
          {warning}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria atributi za kontrolu unutar Field-a. */
export function fieldAria(id: string, error?: string, warning?: string, hint?: string) {
  const describedBy = error ? `${id}-error` : warning ? `${id}-warning` : hint ? `${id}-hint` : undefined;
  return { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy } as const;
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Izbor jedne od nekoliko opcija kao segmentirano dugme (radio). */
export function Segmented({
  name,
  options,
  value,
  defaultValue,
  onChange,
  label,
}: {
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  label: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="inline-flex w-full gap-1 rounded-xl border bg-card p-1 sm:w-auto">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground hover:bg-muted has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:flex-none"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              className="sr-only"
              {...(value !== undefined ? { checked: value === o.value, onChange: () => onChange?.(o.value) } : { defaultChecked: defaultValue === o.value })}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
