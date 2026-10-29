import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/server/auth/request";
import { getIntakeVehicle } from "@/server/orders";
import { formatDate } from "@/domain/dates";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Nisi prijavljen." }, { status: 401 });
  const v = await getIntakeVehicle((await params).id, formatDate);
  if (!v) return NextResponse.json({ error: "Vozilo ne postoji." }, { status: 404 });
  return NextResponse.json(v, { headers: { "Cache-Control": "private, no-store" } });
}
