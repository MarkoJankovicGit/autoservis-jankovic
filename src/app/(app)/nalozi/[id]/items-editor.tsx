"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Segmented, controlCls, fieldAria } from "@/components/form/field";
import { Notice } from "@/components/notice";
import { SubmitButton } from "@/components/submit-button";
import { useServerForm } from "@/components/use-server-form";
import { formatMoney, formatQuantity, type Para } from "@/domain/money";
import { DEFAULT_UNIT, ITEM_KIND_LABELS, ITEM_KIND_TOTAL_LABELS, UNITS, itemTotal, orderTotals, type ItemKind } from "@/domain/orders";
import { foldText } from "@/domain/text";
import type { OrderItem } from "@/domain/model";
import type { ItemSuggestion } from "@/server/orders";
import { removeItem, saveItem } from "../actions";

const money = (p: Para) => formatMoney(p);
const plain = (p: Para | undefined) => (p === undefined ? "" : formatMoney(p, { currency: false }));

type Draft = { kind: ItemKind; name: string; qty: string; unit: string; price: string; cost: string; discount: string; partNumber: string };

const toDraft = (i?: OrderItem): Draft =>
  i
    ? {
        kind: i.kind,
        name: i.name,
        qty: formatQuantity(i.qtyMilli),
        unit: i.unit,
        price: plain(i.unitPrice),
        cost: plain(i.unitCost),
        discount: i.discountBp ? String(i.discountBp / 100).replace(".", ",") : "",
        partNumber: i.partNumber ?? "",
      }
    : { kind: "labor", name: "", qty: "1", unit: DEFAULT_UNIT.labor, price: "", cost: "", discount: "", partNumber: "" };

function ItemForm({ orderId, item, suggestions, onDone }: { orderId: string; item?: OrderItem; suggestions: ItemSuggestion[]; onDone: () => void }) {
  const { state, onSubmit, pending } = useServerForm(saveItem, { onSuccess: onDone });
  const e = state.errors ?? {};
  const [d, setD] = useState<Draft>(() => toDraft(item));
  const [showMore, setShowMore] = useState(!!item?.discountBp);
  const set = (p: Partial<Draft>) => setD((cur) => ({ ...cur, ...p }));

  const byName = useMemo(() => new Map(suggestions.map((s) => [foldText(s.name), s])), [suggestions]);
  const onName = (name: string) => {
    const s = byName.get(foldText(name));
    if (s && !item) {
      set({ name, kind: s.kind, unit: s.unit, price: plain(s.unitPrice), cost: plain(s.unitCost), partNumber: s.partNumber ?? "" });
    } else set({ name });
  };
  const listId = `sugg-${item?.id ?? "new"}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-accent/40 p-4" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      {e.form && <Notice variant="error" title={e.form} />}
      <Segmented
        name="kind"
        label="Vrsta"
        value={d.kind}
        onChange={(k) => set({ kind: k as ItemKind, unit: d.unit === DEFAULT_UNIT[d.kind] ? DEFAULT_UNIT[k as ItemKind] : d.unit })}
        options={(["labor", "part", "material"] as ItemKind[]).map((k) => ({ value: k, label: ITEM_KIND_LABELS[k] }))}
      />
      <Field id={`${listId}-name`} label="Naziv" error={e.name} required>
        <Input name="name" list={listId} value={d.name} onChange={(ev) => onName(ev.target.value)} autoComplete="off" autoFocus className={controlCls} {...fieldAria(`${listId}-name`, e.name)} />
        <datalist id={listId}>
          {suggestions.filter((s) => s.kind === d.kind || !d.name).map((s) => (
            <option key={`${s.kind}:${s.name}`} value={s.name}>
              {`${ITEM_KIND_LABELS[s.kind]} · ${formatMoney(s.unitPrice)}`}
            </option>
          ))}
        </datalist>
      </Field>
      <input type="hidden" name="cost" value={d.cost} />
      <input type="hidden" name="partNumber" value={d.partNumber} />
      <div className="grid grid-cols-3 gap-3">
        <Field id={`${listId}-qty`} label="Količina" error={e.qty}>
          <Input name="qty" inputMode="decimal" value={d.qty} onChange={(ev) => set({ qty: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`${listId}-qty`, e.qty)} />
        </Field>
        <Field id={`${listId}-unit`} label="Jedinica" error={e.unit}>
          <NativeSelect name="unit" value={d.unit} onChange={(ev) => set({ unit: ev.target.value })} {...fieldAria(`${listId}-unit`, e.unit)}>
            {[...new Set([...UNITS, d.unit])].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={`${listId}-price`} label="Cena (RSD)" error={e.price}>
          <Input name="price" inputMode="decimal" placeholder="0,00" value={d.price} onChange={(ev) => set({ price: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`${listId}-price`, e.price)} />
        </Field>
      </div>
      {showMore ? (
        <Field id={`${listId}-discount`} label="Popust (%)" error={e.discount} className="max-w-[10rem]">
          <Input name="discount" inputMode="decimal" value={d.discount} onChange={(ev) => set({ discount: ev.target.value })} className={`${controlCls} tabular`} {...fieldAria(`${listId}-discount`, e.discount)} />
        </Field>
      ) : (
        <>
          <input type="hidden" name="discount" value={d.discount} />
          <Button type="button" variant="ghost" className="-mt-2 self-start" onClick={() => setShowMore(true)}>
            + popust
          </Button>
        </>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pending={pending}>{item ? "Sačuvaj stavku" : "Dodaj stavku"}</SubmitButton>
        <Button type="button" variant="outline" size="xl" onClick={onDone}>
          Odustani
        </Button>
        {item && (
          <Button
            type="button"
            variant="ghost"
            size="xl"
            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              if (!confirm(`Obrisati stavku „${item.name}“?`)) return;
              const fd = new FormData();
              fd.set("orderId", orderId);
              fd.set("itemId", item.id);
              await removeItem(fd);
              onDone();
            }}
          >
            <Trash2 aria-hidden />
            Obriši
          </Button>
        )}
      </div>
    </form>
  );
}

export function ItemsEditor({ orderId, items, editable, suggestions }: { orderId: string; items: OrderItem[]; editable: boolean; suggestions: ItemSuggestion[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const totals = orderTotals(items);
  const done = () => {
    setEditing(null);
    setNonce((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-xl border bg-card empty:hidden">
        {items.map((i) =>
          editing === i.id ? (
            <li key={i.id} className="p-2">
              <ItemForm key={`${i.id}-${nonce}`} orderId={orderId} item={i} suggestions={suggestions} onDone={done} />
            </li>
          ) : (
            <li key={i.id}>
              <button
                type="button"
                disabled={!editable}
                onClick={() => setEditing(i.id)}
                className={cn("flex w-full flex-col gap-1 px-3 py-3 text-left", editable && "hover:bg-muted/60")}
                aria-label={editable ? `Izmeni stavku ${i.name}` : undefined}
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1 font-medium">{i.name}</span>
                  <span className="shrink-0 font-semibold tabular">{money(itemTotal(i))}</span>
                  {editable && <Pencil className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground tabular">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase">{ITEM_KIND_LABELS[i.kind]}</span>
                  <span>
                    {formatQuantity(i.qtyMilli)} {i.unit} × {money(i.unitPrice)}
                  </span>
                  {i.discountBp > 0 && <span>popust {String(i.discountBp / 100).replace(".", ",")} %</span>}
                </span>
              </button>
            </li>
          ),
        )}
      </ul>

      {editable &&
        (editing === "new" ? (
          <ItemForm key={`new-${nonce}`} orderId={orderId} suggestions={suggestions} onDone={done} />
        ) : (
          <Button type="button" size="xl" variant="outline" className="self-start" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            Dodaj stavku
          </Button>
        ))}

      {items.length > 0 && (
        <div className="mt-1 rounded-xl bg-muted/60 p-4">
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular">
            {/* po vrsti pre popusta, da se redovi sabiraju do „Ukupno“ */}
            {(["labor", "part", "material"] as ItemKind[]).filter((k) => totals.grossByKind[k]).map((k) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{ITEM_KIND_TOTAL_LABELS[k]}</dt>
                <dd className="text-right">{money(totals.grossByKind[k])}</dd>
              </div>
            ))}
            {totals.discount > 0 && (
              <div className="contents">
                <dt className="text-muted-foreground">Odobren popust</dt>
                <dd className="text-right">−{money(totals.discount)}</dd>
              </div>
            )}
            <div className="contents">
              <dt className="self-baseline pt-2 text-lg font-semibold">Ukupno</dt>
              <dd className="self-baseline pt-2 text-right text-[1.75rem] leading-tight font-bold">{money(totals.total)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

