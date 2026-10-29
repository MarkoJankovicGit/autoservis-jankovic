import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { sharePdfFileName } from "@/domain/shares";
import { isAuthed } from "@/server/auth/request";
import { readAttachmentFile } from "@/server/files";
import { renderSharePdf } from "@/server/pdf/share-pdf";
import { getSharePdf } from "@/server/shares";

/** PDF kartona iz istog snimka kao link: /api/podeli/<id>/pdf; sa ?preuzmi=1 browser snima fajl. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(request)) return new NextResponse("Nisi prijavljen.", { status: 401 });
  const { id } = await params;
  const d = await getSharePdf(id);
  if (!d) return new NextResponse("Karton ne postoji.", { status: 404 });

  const photos = new Map<string, Buffer>();
  for (const o of d.snapshot.orders) {
    for (const p of o.photos) {
      const f = await readAttachmentFile(p.id, "full");
      if (f) photos.set(p.id, f.data);
    }
  }
  const root = process.cwd();
  const logo = await readFile(path.join(root, "public", "icons", "icon-192.png")).catch(() => null);
  const pdf = await renderSharePdf(d, { fontDir: path.join(root, "assets", "fonts"), logo, photos });

  const name = sharePdfFileName(d.snapshot.vehicle, d.sharedDate);
  const disposition = request.nextUrl.searchParams.has("preuzmi") ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
