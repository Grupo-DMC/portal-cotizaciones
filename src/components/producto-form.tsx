"use client";

import { useState } from "react";
import { ActionForm, Field } from "@/components/ui/form";
import { guardarProductoAction } from "@/server/actions/bodega";

interface Prod {
  id?: number; codigo?: string; descripcion?: string; unidades?: number; formato?: string;
  familiaId?: number; subfamiliaId?: number | null; estadoItem?: string; activo?: boolean;
}
interface Sub { id: number; codigo: string; descripcion: string; familiaId: number }
interface Fam { id: number; codigo: string; descripcion: string }

/** Formulario de producto (alta y edición). La subfamilia se filtra por la familia elegida. */
export function ProductoForm({ producto, familias, subfamilias, cancelHref }: { producto?: Prod; familias: Fam[]; subfamilias: Sub[]; cancelHref: string }) {
  const [familiaId, setFamiliaId] = useState<number>(producto?.familiaId ?? familias[0]?.id ?? 0);
  const subs = subfamilias.filter((s) => s.familiaId === familiaId);

  return (
    <ActionForm action={guardarProductoAction} cancelHref={cancelHref} encType="multipart/form-data" submitLabel={producto?.id ? "Actualizar producto" : "Guardar producto"}>
      <input type="hidden" name="id" value={producto?.id ?? ""} />
      <div className="form-grid">
        <Field name="codigo" label="Código maestro" required defaultValue={producto?.codigo} maxLength={40} placeholder="Ej.: CAM-IP-4MP-B" />
        <Field name="estadoItem" label="Estado del ítem" as="select" required defaultValue={producto?.estadoItem ?? "OK"} options={[{ value: "OK", label: "OK" }, { value: "Reparación", label: "Reparación" }, { value: "Dañado", label: "Dañado" }]} />
        <Field name="descripcion" label="Descripción" required defaultValue={producto?.descripcion} maxLength={200} className="full" />
        <Field name="unidades" label="Unidades" type="number" required min={1} defaultValue={producto?.unidades ?? 1} inputMode="numeric" />
        <Field name="formato" label="Formato" required defaultValue={producto?.formato ?? "Unidad"} maxLength={30} />
        <div className="field">
          <label htmlFor="familiaId-sel">Familia *</label>
          <select id="familiaId-sel" name="familiaId" className="select" value={familiaId} onChange={(e) => setFamiliaId(Number(e.target.value))} required>
            {familias.map((f) => (
              <option key={f.id} value={f.id}>{f.codigo} · {f.descripcion}</option>
            ))}
          </select>
        </div>
        <Field key={familiaId} name="subfamiliaId" label="Subfamilia" as="select" vacio="Sin subfamilia" defaultValue={producto?.subfamiliaId ?? ""} options={subs.map((s) => ({ value: s.id, label: `${s.codigo} · ${s.descripcion}` }))} />
        <Field name="activo" label="Estado" as="select" defaultValue={producto?.activo === false ? "0" : "1"} options={[{ value: "1", label: "Activo" }, { value: "0", label: "Desactivado" }]} />
        <Field name="imagen" label="Imagen (opcional)" type="file" accept="image/png,image/jpeg,image/webp" hint="PNG, JPG o WebP de hasta 1 MB. Sale en el PDF de la cotización." />
      </div>
    </ActionForm>
  );
}
