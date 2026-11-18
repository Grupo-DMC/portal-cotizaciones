import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { formatCLP, formatFecha } from "@/lib/format";
import { IVA_PCT } from "@/lib/calculo";
import { nombreEstado, type Documento } from "@/server/data/types";

const INK = rgb(0.125, 0.118, 0.114);
const SOFT = rgb(0.36, 0.34, 0.33);
const ACCENT = rgb(0.925, 0.188, 0.075);
const LINE = rgb(0.82, 0.81, 0.8);
const TINT = rgb(0.955, 0.949, 0.945);
const WHITE = rgb(1, 1, 1);

const W = 612;
const H = 792;
const M = 40;
const CW = W - M * 2;

const GARANTIA =
  "El tiempo de garantía de cada producto es por 1 año desde la fecha de instalación y firma de guía de recepción.\n" +
  "Si la instalación de los productos es realizada por nuestra empresa, no se aceptará la devolución de aquellos productos que presenten daños o desperfectos ocurridos después de la instalación. Una vez instalados con aprobación del cliente, no tendrán derecho a devolución. Si son instalados por el cliente o terceros, no se aceptará devolución por daños posteriores.\n" +
  "Quedan exceptuados de garantía productos con evidencia de intervención de terceros, daños físicos, humedad, cortes eléctricos, entre otros. La evaluación se realizará por personal de Grupo DMC.";

interface Ctx { pdf: PDFDocument; page: PDFPage; y: number; reg: PDFFont; bold: PDFFont }

/** Reemplaza lo que la fuente estándar (WinAnsi) no puede codificar, para que nunca falle la generación. */
function limpiar(s: string, font: PDFFont): string {
  const ok = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n" || ch === "\t") out += " ";
    else if (cp < 32) continue;
    else out += ok.has(cp) ? ch : "?";
  }
  return out;
}

function envolver(texto: string, font: PDFFont, size: number, ancho: number): string[] {
  const t = limpiar(texto, font);
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of t.split(/\s+/).filter(Boolean)) {
    let p = palabra;
    // Palabras más anchas que la columna se parten por caracteres.
    while (font.widthOfTextAtSize(p, size) > ancho) {
      let corte = p.length - 1;
      while (corte > 1 && font.widthOfTextAtSize(p.slice(0, corte), size) > ancho) corte--;
      if (actual) { lineas.push(actual); actual = ""; }
      lineas.push(p.slice(0, corte));
      p = p.slice(corte);
    }
    const prueba = actual ? `${actual} ${p}` : p;
    if (font.widthOfTextAtSize(prueba, size) <= ancho) actual = prueba;
    else { lineas.push(actual); actual = p; }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

function texto(page: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color = INK, alinear: "l" | "r" | "c" = "l", ancho = 0) {
  const t = limpiar(s, font);
  const w = font.widthOfTextAtSize(t, size);
  const px = alinear === "r" ? x + ancho - w : alinear === "c" ? x + (ancho - w) / 2 : x;
  page.drawText(t, { x: px, y, size, font, color });
}

async function imagenProducto(pdf: PDFDocument, dataUrl: string | null): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
  if (!m) return null; // WebP no está soportado por pdf-lib
  try {
    const bytes = Buffer.from(m[2], "base64");
    return m[1] === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function generarPdfCotizacion(doc: Documento, ejecutivo: string, imagenes: Record<number, string | null>): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${doc.folio}`);
  pdf.setAuthor("Comercializadora DMC S.P.A.");
  pdf.setCreator("Sistema de cotizaciones DMC");
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const c: Ctx = { pdf, page: pdf.addPage([W, H]), y: H - M, reg, bold };

  /* ------------------------------------------------------------ Encabezado */
  let logo: PDFImage | null = null;
  try {
    logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public", "img", "dmc.png")));
  } catch { /* sin logo: se omite */ }
  if (logo) {
    const lw = 100;
    const lh = (logo.height / logo.width) * lw;
    c.page.drawImage(logo, { x: M, y: c.y - lh + 6, width: lw, height: lh });
  }
  const cx = M + 118;
  const cw = CW - 118 - 150;
  texto(c.page, "COMERCIALIZADORA DMC S.P.A.", cx, c.y - 14, 12, bold, INK, "c", cw);
  texto(c.page, "RUT: 76.269.438-7", cx, c.y - 30, 9, reg, SOFT, "c", cw);
  texto(c.page, "Madrid 1269, Santiago", cx, c.y - 42, 9, reg, SOFT, "c", cw);
  texto(c.page, "Tel: +56 2 2555 5739", cx, c.y - 54, 9, reg, SOFT, "c", cw);

  const bx = W - M - 140;
  c.page.drawRectangle({ x: bx, y: c.y - 62, width: 140, height: 62, borderColor: ACCENT, borderWidth: 1.5, color: rgb(1, 0.949, 0.937) });
  texto(c.page, "COTIZACIÓN N°", bx, c.y - 22, 8.5, bold, SOFT, "c", 140);
  texto(c.page, String(doc.folio), bx, c.y - 49, 24, bold, ACCENT, "c", 140);
  c.y -= 78;
  c.page.drawRectangle({ x: M, y: c.y, width: CW, height: 2, color: INK });
  c.y -= 18;

  /* ------------------------------------------------------- Cliente / detalles */
  const alto = 88;
  c.page.drawRectangle({ x: M, y: c.y - alto, width: CW, height: alto, borderColor: LINE, borderWidth: 1 });
  const split = M + CW * 0.58;
  c.page.drawLine({ start: { x: split, y: c.y }, end: { x: split, y: c.y - alto }, thickness: 1, color: LINE });
  texto(c.page, "CLIENTE", M + 12, c.y - 16, 8.5, bold, ACCENT);
  texto(c.page, "DETALLES", split + 14, c.y - 16, 8.5, bold, ACCENT);
  const campo = (etq: string, val: string, x: number, y: number, ancho: number) => {
    texto(c.page, `${etq}:`, x, y, 9.5, bold, INK);
    const ex = x + bold.widthOfTextAtSize(`${etq}:`, 9.5) + 5;
    const [l1] = envolver(val || "—", reg, 9.5, ancho - (ex - x));
    texto(c.page, l1, ex, y, 9.5, reg, INK);
  };
  campo("Nombre", doc.razonSocial, M + 12, c.y - 33, split - M - 24);
  campo("RUT", doc.rut, M + 12, c.y - 49, split - M - 24);
  campo("Dirección", doc.direccion, M + 12, c.y - 65, split - M - 24);
  campo("Fecha", formatFecha(doc.fecha), split + 14, c.y - 33, W - M - split - 28);
  campo("Ejecutivo", ejecutivo, split + 14, c.y - 49, W - M - split - 28);
  campo("Estado", nombreEstado(doc.estado), split + 14, c.y - 65, W - M - split - 28);
  c.y -= alto + 8;
  if (doc.proyecto) {
    texto(c.page, "Proyecto:", M, c.y - 10, 9.5, bold, INK);
    const lineasProy = envolver(doc.proyecto, reg, 9.5, CW - 52);
    texto(c.page, lineasProy[0], M + 52, c.y - 10, 9.5, reg, INK);
    c.y -= 16;
  }
  c.y -= 8;

  /* ------------------------------------------------------------------ Tabla */
  const imgs = new Map<number, PDFImage>();
  for (const l of doc.lineas) {
    const im = await imagenProducto(pdf, imagenes[l.productoId] ?? null);
    if (im) imgs.set(l.productoId, im);
  }
  const conImagen = imgs.size > 0;
  // Anchos relativos → puntos
  const rel = conImagen ? [0.45, 0.9, 1.75, 2.7, 0.8, 1.6, 0.8, 1.7] : [0.45, 1.75, 3.0, 0.8, 1.6, 0.8, 1.7];
  const sum = rel.reduce((a, b) => a + b, 0);
  const cols = rel.map((r) => (r / sum) * CW);
  const heads = conImagen ? ["#", "IMAGEN", "COD.", "DETALLE", "CANT.", "PRECIO NETO", "DESC. %", "TOTAL NETO"] : ["#", "COD.", "DETALLE", "CANT.", "PRECIO NETO", "DESC. %", "TOTAL NETO"];
  const alin: ("l" | "r" | "c")[] = conImagen ? ["c", "c", "l", "l", "c", "r", "r", "r"] : ["c", "l", "l", "c", "r", "r", "r"];
  const iDet = conImagen ? 3 : 2;

  const cabecera = () => {
    c.page.drawRectangle({ x: M, y: c.y - 24, width: CW, height: 24, color: INK });
    let x = M;
    heads.forEach((h, i) => {
      texto(c.page, h, x + 4, c.y - 16, 8, bold, WHITE, alin[i] === "l" ? "l" : alin[i], cols[i] - 8);
      x += cols[i];
    });
    c.y -= 24;
  };
  const nuevaPagina = () => {
    c.page = pdf.addPage([W, H]);
    c.y = H - M;
  };

  cabecera();
  doc.lineas.forEach((l, idx) => {
    const lineasDet = envolver(l.descripcion, reg, 9, cols[iDet] - 10);
    const im = imgs.get(l.productoId);
    const alto = Math.max(26, lineasDet.length * 11.5 + 12, im ? 44 : 0);
    if (c.y - alto < M + 40) {
      nuevaPagina();
      cabecera();
    }
    if (idx % 2 === 1) c.page.drawRectangle({ x: M, y: c.y - alto, width: CW, height: alto, color: TINT });
    c.page.drawLine({ start: { x: M, y: c.y - alto }, end: { x: M + CW, y: c.y - alto }, thickness: 0.5, color: LINE });
    const valores = conImagen
      ? [String(l.linea), "", l.codigo, "", String(l.cantidad), formatCLP(l.valorNeto), String(l.descuento), formatCLP(l.totalLinea)]
      : [String(l.linea), l.codigo, "", String(l.cantidad), formatCLP(l.valorNeto), String(l.descuento), formatCLP(l.totalLinea)];
    let x = M;
    const yMedio = c.y - alto / 2 - 3;
    valores.forEach((v, i) => {
      if (i === iDet) {
        const bloque = lineasDet.length * 11.5;
        lineasDet.forEach((t, k) => texto(c.page, t, x + 5, c.y - (alto - bloque) / 2 - 9 - k * 11.5, 9, reg, INK));
      } else if (v) {
        const negrita = i === heads.length - 1 || (conImagen ? i === 2 : i === 1);
        texto(c.page, v, x + 4, yMedio, 9, negrita ? bold : reg, INK, alin[i], cols[i] - 8);
      }
      x += cols[i];
    });
    if (im) {
      const s = Math.min(36 / im.width, 36 / im.height);
      c.page.drawImage(im, { x: M + cols[0] + (cols[1] - im.width * s) / 2, y: c.y - alto / 2 - (im.height * s) / 2, width: im.width * s, height: im.height * s });
    }
    c.y -= alto;
  });
  c.y -= 18;

  /* ------------------------------------------------- Observaciones y totales */
  const obsLineas = envolver(doc.observaciones || "Sin observaciones.", reg, 9, CW * 0.58 - 22).slice(0, 14);
  const altoObs = Math.max(84, obsLineas.length * 11.5 + 34);
  if (c.y - altoObs < M + 20) nuevaPagina();
  const obsW = CW * 0.58 - 14;
  texto(c.page, "OBSERVACIONES", M, c.y - 8, 8.5, bold, ACCENT);
  c.page.drawRectangle({ x: M, y: c.y - 14 - altoObs + 16, width: obsW, height: altoObs - 16, borderColor: LINE, borderWidth: 1 });
  obsLineas.forEach((t, k) => texto(c.page, t, M + 8, c.y - 28 - k * 11.5, 9, reg, doc.observaciones ? INK : SOFT));

  const tx = M + CW * 0.58 + 4;
  const tw = CW - CW * 0.58 - 4;
  const filaH = 26;
  const totales: [string, string][] = [["Sub total", formatCLP(doc.neto)], [`IVA (${IVA_PCT}%)`, formatCLP(doc.iva)]];
  c.page.drawRectangle({ x: tx, y: c.y - filaH * 3, width: tw, height: filaH * 3, borderColor: INK, borderWidth: 1 });
  totales.forEach(([e, v], i) => {
    const yy = c.y - filaH * (i + 1);
    if (i === 0) c.page.drawRectangle({ x: tx + 0.5, y: yy + 0.5, width: tw - 1, height: filaH - 0.5, color: TINT });
    texto(c.page, e, tx + 10, yy + 9, 9.5, reg, INK);
    texto(c.page, v, tx, yy + 9, 9.5, bold, INK, "r", tw - 10);
  });
  c.page.drawRectangle({ x: tx, y: c.y - filaH * 3, width: tw, height: filaH, color: INK });
  texto(c.page, "TOTAL", tx + 10, c.y - filaH * 3 + 9, 11, bold, WHITE);
  texto(c.page, formatCLP(doc.total), tx, c.y - filaH * 3 + 9, 12, bold, WHITE, "r", tw - 10);
  c.y -= Math.max(altoObs, filaH * 3) + 22;

  /* -------------------------------------------------------------- Garantía */
  const par = GARANTIA.split("\n").map((p) => envolver(p, reg, 7, CW - 24));
  const altoG = par.reduce((t, p) => t + p.length * 9.2 + 4, 0) + 30;
  if (c.y - altoG < M + 16) nuevaPagina();
  c.page.drawRectangle({ x: M, y: c.y - altoG, width: CW, height: altoG, borderColor: ACCENT, borderWidth: 0.75, color: rgb(1, 0.969, 0.961) });
  texto(c.page, "GARANTÍA DE PRODUCTOS", M + 12, c.y - 16, 8.5, bold, ACCENT);
  let gy = c.y - 29;
  par.forEach((p) => {
    p.forEach((t) => { texto(c.page, t, M + 12, gy, 7, reg, SOFT); gy -= 9.2; });
    gy -= 4;
  });

  /* ------------------------------------------------------ Pie de cada página */
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.5, color: LINE });
    p.drawText("Comercializadora DMC S.P.A. · Cotización sujeta a disponibilidad de stock", { x: M, y: 18, size: 7.5, font: reg, color: SOFT });
    const t = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(t, { x: W - M - reg.widthOfTextAtSize(t, 7.5), y: 18, size: 7.5, font: reg, color: SOFT });
  });

  return pdf.save();
}
