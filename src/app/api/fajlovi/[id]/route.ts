import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/server/auth/request";
import { readAttachmentFile } from "@/server/files";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(request)) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const variant = request.nextUrl.searchParams.get("v") === "t" ? "thumb" : "full";
  const f = await readAttachmentFile(id, variant);
  if (!f) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      // ID se ne menja; privatno, samo u browseru prijavljenog uređaja
      "Cache-Control": "private, max-age=86400, immutable",
      "Content-Disposition": "inline",
    },
  });
}
