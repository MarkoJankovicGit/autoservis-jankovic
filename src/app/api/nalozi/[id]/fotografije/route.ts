import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/server/auth/request";
import { addOrderPhoto, MAX_PHOTO_BYTES, MAX_THUMB_BYTES } from "@/server/files";

const MAX_REQUEST = MAX_PHOTO_BYTES + MAX_THUMB_BYTES + 64 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Nisi prijavljen." }, { status: 401 });
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > MAX_REQUEST) return NextResponse.json({ error: "Slika je prevelika." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtev." }, { status: 400 });
  }
  const main = form.get("file");
  const thumb = form.get("thumb");
  if (!(main instanceof File) || !(thumb instanceof File)) {
    return NextResponse.json({ error: "Nedostaje slika." }, { status: 400 });
  }
  const { id } = await params;
  const r = await addOrderPhoto(id, {
    main: new Uint8Array(await main.arrayBuffer()),
    thumb: new Uint8Array(await thumb.arrayBuffer()),
    width: Number(form.get("width")) || undefined,
    height: Number(form.get("height")) || undefined,
    category: String(form.get("category") ?? "other"),
    originalName: typeof form.get("name") === "string" ? String(form.get("name")) : undefined,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ id: r.id }, { status: 201 });
}
