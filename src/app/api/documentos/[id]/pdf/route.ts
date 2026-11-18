import { NextResponse } from "next/server";
import { getSessionUser, puede } from "@/server/auth/dal";
import { documentoPorId, ejecutivoDeDocumento } from "@/server/data/queries";
import { getStore } from "@/server/data/store";
import { generarPdfCotizacion } from "@/server/pdf/cotizacion";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(user, 301) && !puede(user, 302)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await ctx.params;
  if (!/^\d{1,9}$/.test(id)) return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  const doc = await documentoPorId(Number(id));
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const imagenes: Record<number, string | null> = {};
  for (const p of getStore().productos) if (doc.lineas.some((l) => l.productoId === p.id)) imagenes[p.id] = p.imagen;

  const bytes = await generarPdfCotizacion(doc, await ejecutivoDeDocumento(doc), imagenes);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="COT-${doc.folio}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
