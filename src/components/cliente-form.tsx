"use client";

import { ActionForm, Field } from "@/components/ui/form";
import { guardarClienteAction } from "@/server/actions/comercial";
import { REGIONES } from "@/lib/permisos";

interface C {
  id?: number; rut?: string; razonSocial?: string; contacto?: string; telefono?: string; email?: string;
  direccion?: string; comuna?: string; region?: string; ejecutivoId?: number | null; listaPrecioId?: number; activo?: boolean;
}

export function ClienteForm({ cliente, ejecutivos, listas, cancelHref }: {
  cliente?: C; ejecutivos: { id: number; nombre: string }[]; listas: { id: number; descripcion: string }[]; cancelHref: string;
}) {
  return (
    <ActionForm action={guardarClienteAction} cancelHref={cancelHref} submitLabel={cliente?.id ? "Actualizar cliente" : "Guardar cliente"}>
      <input type="hidden" name="id" value={cliente?.id ?? ""} />
      <div className="form-grid">
        <Field name="rut" label="RUT" required defaultValue={cliente?.rut} placeholder="76.123.456-7" maxLength={14} hint="Se valida el dígito verificador." />
        <Field name="razonSocial" label="Razón social" required defaultValue={cliente?.razonSocial} maxLength={120} />
        <Field name="contacto" label="Contacto del cliente" defaultValue={cliente?.contacto} maxLength={80} />
        <Field name="telefono" label="Teléfono" defaultValue={cliente?.telefono} maxLength={30} inputMode="tel" />
        <Field name="email" label="Email" type="email" defaultValue={cliente?.email} maxLength={120} className="full" />
        <Field name="direccion" label="Dirección" required defaultValue={cliente?.direccion} maxLength={150} className="full" />
        <Field name="comuna" label="Comuna" required defaultValue={cliente?.comuna} maxLength={60} />
        <Field name="region" label="Región" as="select" required vacio="Seleccione región" defaultValue={cliente?.region} options={REGIONES} />
        <Field name="ejecutivoId" label="Ejecutivo DMC" as="select" vacio="Sin asignar" defaultValue={cliente?.ejecutivoId ?? ""} options={ejecutivos.map((e) => ({ value: e.id, label: e.nombre }))} />
        <Field name="listaPrecioId" label="Lista de precios" as="select" required defaultValue={cliente?.listaPrecioId ?? 1} options={listas.map((l) => ({ value: l.id, label: l.descripcion }))} />
        <Field name="activo" label="Estado" as="select" defaultValue={cliente?.activo === false ? "0" : "1"} options={[{ value: "1", label: "Activo" }, { value: "0", label: "Desactivado" }]} />
      </div>
    </ActionForm>
  );
}
