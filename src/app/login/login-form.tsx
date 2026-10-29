"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sidebar-muted-foreground">
          Lozinka servisa
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="h-12 border-[#8a8a8d] bg-[#4a4a4c] text-base text-white focus-visible:border-[#7fb9e5] focus-visible:ring-[#7fb9e5]/40"
        />
      </div>
      <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-sm text-[#ff8a93]">
        {state.error}
      </p>
      <Button type="submit" size="lg" disabled={pending} className="h-12 text-base">
        <LockKeyhole aria-hidden />
        {pending ? "Proveravam…" : "Prijava"}
      </Button>
    </form>
  );
}
