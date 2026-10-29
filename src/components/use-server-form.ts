"use client";

import { startTransition, useActionState } from "react";
import type { FormState } from "@/lib/form-data";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * Forma sa server akcijom bez automatskog reseta koji React 19 radi posle `<form action>`.
 * Reset je vraćao kontrolisana radio dugmad na podrazumevanu vrednost dok je ekran pokazivao drugu
 * (npr. „Firma“ na ekranu, „Fizičko lice“ u slanju). Ovako sva polja zadržavaju unos posle greške.
 *
 * `onSuccess` se poziva odmah posle uspešne akcije (vratila je `message` bez grešaka), npr. da se zatvori
 * forma. Ne koristi se za akcije koje rade redirect: one same vode na novu stranu.
 */
export function useServerForm(action: Action, opts: { initial?: FormState; onSuccess?: (s: FormState) => void } = {}) {
  // useActionState pri svakom renderu uzima najnoviju funkciju, pa je zatvaranje nad onSuccess dovoljno
  const { onSuccess } = opts;
  const run: Action = onSuccess
    ? async (prev, fd) => {
        const s = await action(prev, fd);
        if (s.message && !s.errors) onSuccess(s);
        return s;
      }
    : action;
  const [state, dispatch, pending] = useActionState<FormState, FormData>(run, opts.initial ?? {});
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}
