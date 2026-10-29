"use client";

/** Traži potvrdu pre slanja roditeljske forme (za brisanja i nepovratne radnje). */
export function ConfirmSubmit({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <span
      className="contents"
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button[type=submit]") && !confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </span>
  );
}
