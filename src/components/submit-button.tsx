"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Dugme za slanje. `pending` dolazi iz useServerForm; bez njega se čita stanje `<form action>`. */
export function SubmitButton({
  children,
  pendingText = "Čuvam…",
  pending: pendingProp,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" size="xl" disabled={pending || props.disabled} aria-busy={pending || undefined} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
