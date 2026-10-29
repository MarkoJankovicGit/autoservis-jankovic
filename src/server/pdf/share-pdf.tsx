/**
 * PDF kartona za mušteriju: isti snimak kao link (`/k/<token>`), da majstor može da pošalje i fajl.
 * Font Inter (OFL) je u `assets/fonts`, jer ugrađeni PDF fontovi nemaju č, ć i đ.
 */
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { SHOP, isPlaceholder } from "../../config/shop.ts";
import { formatDate } from "../../domain/dates.ts";
import { ATTACHMENT_CATEGORY_LABELS, FUEL_LABELS, type SharedOrder } from "../../domain/model.ts";
import { formatMoney, formatQuantity } from "../../domain/money.ts";
import { formatPlate } from "../../domain/plate.ts";
import { describeTarget } from "../../domain/reminders.ts";
import type { PublicShare } from "../shares.ts";

const C = {
  charcoal: "#3e3e3f",
  text: "#1e1e20",
  muted: "#4f5054",
  border: "#cfd2d8",
  band: "#f4f5f7",
  primary: "#185e93",
  plateBlue: "#1f4ea8",
  success: "#1f7a44",
  warning: "#a15c00",
};

const PAGE_W = 595.28; // A4 u tačkama
const PAGE_H = 841.89;
const PAD_X = 40;
const GAP = 10;
const PHOTO_W = (PAGE_W - 2 * PAD_X - GAP) / 2;
const PHOTO_MAX_H = 300;

let fontsReady = false;
function registerFonts(dir: string) {
  if (fontsReady) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(dir, "Inter-Regular.ttf") },
      { src: path.join(dir, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  // bez deljenja reči na kraju reda (pravila su za engleski)
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: C.text, paddingTop: 0, paddingBottom: 56, paddingHorizontal: PAD_X, lineHeight: 1.35 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.charcoal, marginHorizontal: -PAD_X, paddingHorizontal: PAD_X, paddingVertical: 14, marginBottom: 20 },
  logo: { width: 30, height: 30 },
  shop: { color: "#ffffff", fontSize: 14, fontWeight: 700, flexGrow: 1 },
  shopPhone: { color: "#ffffff", fontSize: 11, fontWeight: 600 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  h1: { fontSize: 18, fontWeight: 700 },
  muted: { color: C.muted },
  vehicle: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 14 },
  plate: { flexDirection: "row", borderWidth: 1.5, borderColor: C.text, borderRadius: 4, overflow: "hidden" },
  plateStrip: { backgroundColor: C.plateBlue, paddingHorizontal: 4, justifyContent: "flex-end", paddingBottom: 3 },
  plateSrb: { color: "#ffffff", fontSize: 6, fontWeight: 600 },
  plateText: { fontSize: 16, fontWeight: 700, paddingHorizontal: 8, paddingVertical: 3, letterSpacing: 0.5 },
  vehicleName: { fontSize: 14, fontWeight: 700 },
  reminders: { borderWidth: 1, borderColor: C.primary, borderRadius: 8, padding: 12, marginBottom: 14 },
  h2: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  order: { marginBottom: 18 },
  orderHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.band, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 },
  orderTitle: { fontSize: 12, fontWeight: 700 },
  badge: { fontSize: 9, fontWeight: 600 },
  field: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { width: 100, color: C.muted },
  fieldValue: { flex: 1 },
  itemsTitle: { fontSize: 8, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginTop: 8, marginBottom: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: C.border, paddingVertical: 4 },
  cellName: { flex: 1, paddingRight: 8 },
  cellQty: { width: 70, textAlign: "right", color: C.muted },
  cellPrice: { width: 90, textAlign: "right", fontWeight: 600 },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 },
  totalLabel: { fontSize: 11, fontWeight: 600 },
  totalValue: { fontSize: 14, fontWeight: 700 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: GAP, marginTop: 10 },
  photoCell: { width: PHOTO_W },
  photo: { width: PHOTO_W, objectFit: "contain", backgroundColor: C.band, borderRadius: 4 },
  caption: { fontSize: 8, color: C.muted, marginTop: 2 },
  footer: { position: "absolute", left: PAD_X, right: PAD_X, bottom: 24, borderTopWidth: 0.75, borderTopColor: C.border, paddingTop: 6, paddingRight: 40, fontSize: 8, color: C.muted },
  // sadržaj sa `render` nije poznat pri rasporedu: širina iz left/right, a mesto od vrha (sa `bottom` ga lineHeight strane izbriše)
  pageNo: { position: "absolute", left: PAD_X, right: PAD_X, top: PAGE_H - 39, textAlign: "right", fontSize: 8, color: C.muted },
});

const km = (n: number) => `${n.toLocaleString("sr-Latn-RS")} km`;
const phone = isPlaceholder(SHOP.phone) ? null : SHOP.phone;
const address = isPlaceholder(SHOP.address) ? null : [SHOP.address, !isPlaceholder(SHOP.city) && SHOP.city].filter(Boolean).join(", ");

function Field({ label, children }: { label: string; children: string }) {
  return (
    <View style={s.field} wrap={false}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{children}</Text>
    </View>
  );
}

function Items({ title, items, prices }: { title: string; items: SharedOrder["items"]; prices: boolean }) {
  if (!items.length) return null;
  return (
    <View>
      <Text style={s.itemsTitle} minPresenceAhead={40}>
        {title}
      </Text>
      {items.map((i, n) => (
        <View key={n} style={s.row} wrap={false}>
          <Text style={s.cellName}>{i.name}</Text>
          <Text style={s.cellQty}>
            {formatQuantity(i.qtyMilli)} {i.unit}
          </Text>
          {prices && <Text style={s.cellPrice}>{i.total !== undefined ? formatMoney(i.total) : ""}</Text>}
        </View>
      ))}
    </View>
  );
}

function Order({ o, prices, photos }: { o: SharedOrder; prices: boolean; photos: Map<string, Buffer> }) {
  const done = o.status === "done";
  const shown = o.photos.filter((p) => photos.has(p.id));
  return (
    <View style={s.order}>
      <View style={s.orderHead} wrap={false} minPresenceAhead={60}>
        <Text style={s.orderTitle}>
          Nalog {o.number} · {formatDate(done ? (o.completedDate ?? o.receivedDate) : o.receivedDate)}
        </Text>
        <Text style={[s.badge, { color: done ? C.success : C.warning }]}>{done ? "Završeno" : "U radu"}</Text>
      </View>
      <Field label="Razlog dolaska">{o.complaint}</Field>
      {o.workDone && <Field label="Urađeno">{o.workDone}</Field>}
      {o.km !== undefined && <Field label="Kilometraža">{km(o.km)}</Field>}
      <Items title="Radovi" items={o.items.filter((i) => i.kind === "labor")} prices={prices} />
      <Items title="Delovi i materijal" items={o.items.filter((i) => i.kind !== "labor")} prices={prices} />
      {prices && o.total !== undefined && (
        <View style={s.total} wrap={false}>
          <Text style={s.totalLabel}>Ukupno</Text>
          <Text style={s.totalValue}>{formatMoney(o.total)}</Text>
        </View>
      )}
      {shown.length > 0 && (
        <View style={s.photos}>
          {shown.map((p) => {
            const ratio = p.width && p.height ? p.height / p.width : 0.75;
            return (
              <View key={p.id} style={s.photoCell} wrap={false}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- PDF slika nema alt atribut */}
                <Image src={{ data: photos.get(p.id)!, format: "jpg" }} style={[s.photo, { height: Math.min(PHOTO_W * ratio, PHOTO_MAX_H) }]} />
                <Text style={s.caption}>{ATTACHMENT_CATEGORY_LABELS[p.category]}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SharePdf({ d, logo, photos }: { d: PublicShare; logo: Buffer | null; photos: Map<string, Buffer> }) {
  const { snapshot: sn } = d;
  const v = sn.vehicle;
  const name = [v.make, v.model, v.year].filter(Boolean).join(" ");
  return (
    <Document title={`Karton vozila ${v.plate ? formatPlate(v.plate) : name}`} author={SHOP.legalName} creator={SHOP.legalName} producer={SHOP.legalName} language="sr-Latn">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- PDF slika nema alt atribut */}
          {logo && <Image src={{ data: logo, format: "png" }} style={s.logo} />}
          <Text style={s.shop}>{SHOP.legalName}</Text>
          {phone && <Text style={s.shopPhone}>Tel. {phone}</Text>}
        </View>

        <View style={s.titleRow}>
          <Text style={s.h1}>Karton vozila</Text>
          <Text style={s.muted}>{formatDate(d.sharedDate)}</Text>
        </View>

        <View style={s.vehicle} wrap={false}>
          {v.plate && (
            <View style={s.plate}>
              <View style={s.plateStrip}>
                <Text style={s.plateSrb}>SRB</Text>
              </View>
              <Text style={s.plateText}>{formatPlate(v.plate)}</Text>
            </View>
          )}
          <View>
            <Text style={s.vehicleName}>{name}</Text>
            {(v.engine || v.fuel) && <Text style={s.muted}>{[v.engine, v.fuel && FUEL_LABELS[v.fuel]].filter(Boolean).join(" · ")}</Text>}
          </View>
        </View>

        {sn.reminders && sn.reminders.length > 0 && (
          <View style={s.reminders} wrap={false}>
            <Text style={s.h2}>Sledeći servis</Text>
            {sn.reminders.map((r, n) => (
              <Text key={n}>
                <Text style={{ fontWeight: 600 }}>{r.title}</Text>
                {(r.dueDate || r.dueKm !== undefined) && (
                  <Text style={s.muted}>
                    : do {describeTarget(r, formatDate)}
                    {r.dueDate && r.dueKm !== undefined ? ", šta pre nastupi" : ""}
                  </Text>
                )}
              </Text>
            ))}
          </View>
        )}

        {sn.orders.length > 0 && (
          <Text style={s.h2} minPresenceAhead={80}>
            {sn.orders.length === 1 ? "Radovi na vozilu" : "Istorija radova"}
          </Text>
        )}
        {sn.orders.map((o) => (
          <Order key={o.id} o={o} prices={sn.showPrices} photos={photos} />
        ))}

        <Text style={s.footer} fixed>
          {[SHOP.legalName, address, phone && `tel. ${phone}`].filter(Boolean).join(" · ")}
        </Text>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}

/** PDF kao bajtovi. Fotografije prosleđuje pozivalac (JPEG); one kojih nema se preskaču. */
export function renderSharePdf(d: PublicShare, opts: { fontDir: string; logo: Buffer | null; photos: Map<string, Buffer> }): Promise<Buffer> {
  registerFonts(opts.fontDir);
  return renderToBuffer(<SharePdf d={d} logo={opts.logo} photos={opts.photos} />);
}
