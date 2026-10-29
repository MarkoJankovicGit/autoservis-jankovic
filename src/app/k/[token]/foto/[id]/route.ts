import { NextResponse, type NextRequest } from "next/server";
import { readSharedPhoto } from "@/server/shares";

/** Fotografija sa javnog kartona: samo dok je link aktivan i samo ako je majstor izabrao tu fotografiju. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const variant = request.nextUrl.searchParams.get("v") === "t" ? "thumb" : "full";
  const f = await readSharedPhoto(token, id, variant);
  if (!f) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime,
      // bez keša: ugašen link mora odmah da prestane da prikazuje slike
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  });
}
