import { forwardRef, useId } from "react";

import { cn } from "@/lib/cn";

export const inputClass =
  "body2 h-10 w-full rounded-xl border border-line bg-surface px-3 text-ink placeholder:text-ink-2/80 transition-[border-color,box-shadow] duration-200 ease-out hover:border-ink-2/40 focus:border-oud focus:outline-none focus:ring-4 focus:ring-oud/15 aria-[invalid=true]:border-rose";

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Short unit shown inside the input, e.g. "AED" */
  unit?: string;
  hideLabel?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, unit, hideLabel, className, id, ...props }, ref) => {
    const auto = useId();
    const fieldId = id ?? auto;
    const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;
    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <label htmlFor={fieldId} className={cn("b2 text-ink-2", hideLabel && "sr-only")}>
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(inputClass, "num", unit && "pe-12")}
            {...props}
          />
          {unit && (
            <span className="b2 pointer-events-none absolute inset-y-0 end-3 flex items-center text-ink-2">{unit}</span>
          )}
        </div>
        {error ? (
          <p id={`${fieldId}-err`} className="b2 text-rose">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="b2 leading-snug text-ink-2">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
Field.displayName = "Field";
