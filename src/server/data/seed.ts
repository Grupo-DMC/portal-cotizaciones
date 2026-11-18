import "server-only";
import { digitoVerificador, formatearRut } from "@/lib/rut";
import { hashPassword } from "@/server/auth/password";
import { IVA_PCT, type Cliente, type DocLinea, type Documento, type EstadoCodigo, type Producto, type Saldo, type Movimiento, type Store, type Sucursal } from "./types";

/** Contraseña de todos los usuarios de demostración (solo con DATA_SOURCE=mock). */
export const DEMO_PASSWORD = "Demo1234!";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function crearSeed(): Store {
  const rand = rng(20261118);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  // ---------------------------------------------------------------- Roles
  const roles: Store["roles"] = [
    { id: 1, nombre: "Administrador", paginas: [101, 102, 103, 104, 105, 106, 107, 108, 201, 202, 301, 302, 401, 402], estados: ["P", "A", "R", "EP", "F", "DP", "DT"], activo: true },
    { id: 2, nombre: "Ejecutivo comercial", paginas: [201, 202, 301, 302], estados: ["P", "A", "R", "EP"], activo: true },
    { id: 3, nombre: "Bodega", paginas: [101, 102, 103, 104, 105, 106, 107, 108], estados: [], activo: true },
    { id: 4, nombre: "Gerencia", paginas: [101, 103, 201, 202, 302], estados: ["F", "DP", "DT"], activo: true },
  ];

  // ------------------------------------------------------------- Usuarios
  const clave = hashPassword(DEMO_PASSWORD);
  const usuarios: Store["usuarios"] = [
    { id: 1, nombre: "Andrea", apPaterno: "Fuentes", apMaterno: "Lagos", correo: "admin@dmc.cl", claveHash: clave, rolId: 1, activo: true },
    { id: 2, nombre: "Matías", apPaterno: "Rojas", apMaterno: "Pizarro", correo: "mrojas@dmc.cl", claveHash: clave, rolId: 2, activo: true },
    { id: 3, nombre: "Camila", apPaterno: "Soto", apMaterno: "Vergara", correo: "csoto@dmc.cl", claveHash: clave, rolId: 2, activo: true },
    { id: 4, nombre: "Ignacio", apPaterno: "Muñoz", apMaterno: "Tapia", correo: "imunoz@dmc.cl", claveHash: clave, rolId: 3, activo: true },
    { id: 5, nombre: "Valentina", apPaterno: "Araya", apMaterno: "Núñez", correo: "varaya@dmc.cl", claveHash: clave, rolId: 4, activo: true },
    { id: 6, nombre: "Rodrigo", apPaterno: "Campos", apMaterno: "Ortiz", correo: "rcampos@dmc.cl", claveHash: clave, rolId: 2, activo: false },
  ];

  // ---------------------------------------------------- Clasificación bodega
  const familias: Store["familias"] = [
    { id: 1, codigo: "CC", descripcion: "CCTV y videovigilancia", activo: true },
    { id: 2, codigo: "CA", descripcion: "Control de acceso", activo: true },
    { id: 3, codigo: "RA", descripcion: "Redes y antenas", activo: true },
    { id: 4, codigo: "AL", descripcion: "Alarmas e incendio", activo: true },
    { id: 5, codigo: "CB", descripcion: "Cableado y canalización", activo: true },
    { id: 6, codigo: "EN", descripcion: "Energía y respaldo", activo: true },
  ];
  const subfamilias: Store["subfamilias"] = [
    { id: 1, codigo: "CAM", descripcion: "Cámaras IP", familiaId: 1, activo: true },
    { id: 2, codigo: "GRB", descripcion: "Grabadores", familiaId: 1, activo: true },
    { id: 3, codigo: "LEC", descripcion: "Lectores y controladores", familiaId: 2, activo: true },
    { id: 4, codigo: "CER", descripcion: "Cerraduras y accesorios", familiaId: 2, activo: true },
    { id: 5, codigo: "ANT", descripcion: "Antenas y enlaces", familiaId: 3, activo: true },
    { id: 6, codigo: "SWI", descripcion: "Switches y routers", familiaId: 3, activo: true },
    { id: 7, codigo: "DET", descripcion: "Sensores y detectores", familiaId: 4, activo: true },
    { id: 8, codigo: "CAB", descripcion: "Cables", familiaId: 5, activo: true },
    { id: 9, codigo: "UPS", descripcion: "UPS y fuentes", familiaId: 6, activo: true },
  ];

  const bodegas: Store["bodegas"] = [
    { id: 1, codigo: "B01", nombre: "Bodega central Santiago", activo: true },
    { id: 2, codigo: "B02", nombre: "Bodega Quilicura", activo: true },
    { id: 3, codigo: "B03", nombre: "Bodega en tránsito", activo: true },
    { id: 4, codigo: "B04", nombre: "Bodega Valparaíso", activo: false },
  ];

  // ---------------------------------------------------------- Productos
  // [código, descripción, familia, subfamilia, precio lista, formato]
  const catalogo: [string, string, number, number, number, string][] = [
    ["CAM-IP-2MP-D", "Cámara domo IP 2MP IR 30m PoE", 1, 1, 48900, "Unidad"],
    ["CAM-IP-4MP-B", "Cámara bullet IP 4MP IR 50m PoE", 1, 1, 69900, "Unidad"],
    ["CAM-IP-8MP-PTZ", "Cámara PTZ IP 8MP zoom óptico 25x", 1, 1, 689000, "Unidad"],
    ["CAM-IP-4MP-FE", "Cámara ojo de pez IP 4MP 360°", 1, 1, 129900, "Unidad"],
    ["NVR-8CH-POE", "NVR 8 canales PoE 4K, 1 bahía", 1, 2, 189900, "Unidad"],
    ["NVR-16CH-POE", "NVR 16 canales PoE 4K, 2 bahías", 1, 2, 329900, "Unidad"],
    ["NVR-32CH", "NVR 32 canales 4K, 4 bahías", 1, 2, 589900, "Unidad"],
    ["HDD-4TB-SV", "Disco duro 4TB para videovigilancia", 1, 2, 109900, "Unidad"],
    ["HDD-8TB-SV", "Disco duro 8TB para videovigilancia", 1, 2, 189900, "Unidad"],
    ["LEC-RFID-125", "Lector RFID 125kHz exterior IP65", 2, 3, 34900, "Unidad"],
    ["LEC-BIO-FACE", "Terminal biométrico facial con huella", 2, 3, 259900, "Unidad"],
    ["CTL-4P-TCP", "Controladora de acceso 4 puertas TCP/IP", 2, 3, 219900, "Unidad"],
    ["CER-ELEC-600", "Cerradura electromagnética 600 lb", 2, 4, 42900, "Unidad"],
    ["CER-BRK-U", "Brazo cierrapuertas para cerradura magnética", 2, 4, 12900, "Unidad"],
    ["TAR-RFID-PK50", "Tarjetas de proximidad RFID (pack 50)", 2, 3, 29900, "Pack"],
    ["ANT-5G-23", "Antena sectorial 5GHz 23dBi", 3, 5, 89900, "Unidad"],
    ["ANT-PTP-CPE", "Enlace punto a punto 5GHz 20dBi (par)", 3, 5, 159900, "Par"],
    ["ANT-OMNI-12", "Antena omnidireccional 2.4GHz 12dBi", 3, 5, 38900, "Unidad"],
    ["SW-POE-8", "Switch PoE+ 8 puertos gigabit 120W", 3, 6, 79900, "Unidad"],
    ["SW-POE-24", "Switch PoE+ 24 puertos gigabit 370W", 3, 6, 289900, "Unidad"],
    ["RT-AC-1200", "Router doble banda AC1200 empresarial", 3, 6, 64900, "Unidad"],
    ["DET-PIR-EXT", "Sensor de movimiento PIR exterior", 4, 7, 34900, "Unidad"],
    ["DET-HUMO-WL", "Detector de humo inalámbrico", 4, 7, 24900, "Unidad"],
    ["ALM-CENTRAL-8Z", "Central de alarma 8 zonas con GSM", 4, 7, 139900, "Unidad"],
    ["SIR-EXT-120", "Sirena exterior con flash 120dB", 4, 7, 27900, "Unidad"],
    ["CAB-UTP6-305", "Cable UTP Cat6 caja 305 m", 5, 8, 119900, "Caja"],
    ["CAB-UTP6E-305", "Cable UTP Cat6 exterior caja 305 m", 5, 8, 159900, "Caja"],
    ["CAB-COAX-100", "Cable coaxial RG59 + alimentación 100 m", 5, 8, 54900, "Rollo"],
    ["CAB-PAT-1M", "Patch cord Cat6 1 m", 5, 8, 2490, "Unidad"],
    ["CAN-CORR-2M", "Canalización PVC 20x10 (2 m)", 5, 8, 1890, "Unidad"],
    ["UPS-650", "UPS 650VA línea interactiva", 6, 9, 59900, "Unidad"],
    ["UPS-1500", "UPS 1500VA torre con AVR", 6, 9, 189900, "Unidad"],
    ["FTE-12V-10A", "Fuente de poder 12V 10A con gabinete", 6, 9, 29900, "Unidad"],
    ["BAT-12V-7", "Batería sellada 12V 7Ah", 6, 9, 14900, "Unidad"],
    ["CAM-IP-2MP-BT", "Cámara bullet IP 2MP económica", 1, 1, 39900, "Unidad"],
    ["MON-24-CCTV", "Monitor LED 24 pulgadas para CCTV", 1, 2, 119900, "Unidad"],
    ["KIT-CCTV-4", "Kit CCTV 4 cámaras 2MP + NVR 4CH", 1, 2, 389900, "Kit"],
  ];
  const productos: Producto[] = catalogo.map(([codigo, descripcion, familiaId, subfamiliaId], i) => ({
    id: i + 1,
    codigo,
    descripcion,
    unidades: 1,
    formato: catalogo[i][5],
    familiaId,
    subfamiliaId,
    estadoItem: i === 12 ? "Reparación" : "OK",
    activo: i !== 33,
    imagen: null,
  }));

  // ---------------------------------------------------- Listas de precios
  const listas: Store["listas"] = [
    { id: 1, descripcion: "Lista base 2026", activo: true },
    { id: 2, descripcion: "Constructoras e inmobiliarias", activo: true },
    { id: 3, descripcion: "Mayorista / instaladores", activo: true },
    { id: 4, descripcion: "Retail 2025 (histórica)", activo: false },
  ];
  const descuentoLista: Record<number, number> = { 1: 0, 2: 0.07, 3: 0.14, 4: 0.03 };
  const precios: Store["precios"] = [];
  for (const l of listas) {
    productos.forEach((p, i) => {
      const lista = catalogo[i][4];
      precios.push({
        listaId: l.id,
        productoId: p.id,
        precioLista: lista,
        precioVenta: Math.round((lista * (1 - descuentoLista[l.id])) / 10) * 10,
      });
    });
  }

  // ---------------------------------------------------------- Clientes
  const base: [string, string, string, string][] = [
    ["Constructora Los Andes SpA", "Av. Apoquindo 4501, of. 802", "Las Condes", "R Metropolitana"],
    ["Supermercados Maipú Ltda.", "Camino a Rinconada 1450", "Maipú", "R Metropolitana"],
    ["Clínica Santa Rosa S.A.", "Av. Libertad 1220", "Viña del Mar", "Valparaiso"],
    ["Colegio San Ignacio del Valle", "Los Fresnos 335", "Peñalolén", "R Metropolitana"],
    ["Inmobiliaria Costanera SpA", "Av. Costanera Sur 2730", "Concepción", "BioBio"],
    ["Hotel Plaza del Sol Ltda.", "Av. del Sol 811", "La Serena", "Coquimbo"],
    ["Minera Cerro Alto S.A.", "Ruta 5 Norte km 1020", "Copiapó", "Atacama"],
    ["Transportes Nahuel Ltda.", "Panamericana Sur 8780", "San Bernardo", "R Metropolitana"],
    ["Municipalidad de Colina", "Carretera General San Martín 520", "Colina", "R Metropolitana"],
    ["Condominio Alto Las Condes", "Camino El Alba 11900", "Las Condes", "R Metropolitana"],
    ["Farmacias Del Pueblo S.A.", "Av. Vicuña Mackenna 3045", "Ñuñoa", "R Metropolitana"],
    ["Logística Pacífico S.A.", "Av. Gran Bretaña 1790", "Valparaíso", "Valparaiso"],
    ["Agrícola Valle Frío SpA", "Camino a Pelequén km 4", "Rengo", "Libertador General Bernardo O'Hiiggins"],
    ["Centro Médico Los Lagos", "Benavente 520", "Puerto Montt", "Los Lagos"],
  ];
  const clientes: Cliente[] = base.map(([razonSocial, direccion, comuna, region], i) => {
    const cuerpo = String(76000000 + 123457 * (i + 3) + i * 911).slice(0, 8);
    const rut = formatearRut(`${cuerpo}${digitoVerificador(cuerpo)}`);
    return {
      id: i + 1,
      rut,
      razonSocial,
      contacto: pick(["Patricio Vera", "Marcela Díaz", "Felipe Ibarra", "Daniela Reyes", "Sergio Contreras", "Paola Medina"]),
      telefono: `+56 2 ${int(2200, 2999)} ${int(1000, 9999)}`,
      email: `contacto@${razonSocial.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 14)}.cl`,
      direccion,
      comuna,
      region,
      ejecutivoId: pick([2, 3]),
      listaPrecioId: i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3,
      activo: i !== 12,
    };
  });

  const sucursales: Sucursal[] = [];
  let sid = 1;
  for (const c of clientes) {
    sucursales.push({
      id: sid++, clienteId: c.id, nombre: "Casa matriz", direccion: c.direccion, comuna: c.comuna, region: c.region,
      encargado: c.contacto, telefonoEncargado: c.telefono, emailEncargado: c.email, casaMatriz: true, activo: true,
    });
    const extra = int(0, 3);
    for (let k = 1; k <= extra; k++) {
      sucursales.push({
        id: sid++, clienteId: c.id, nombre: `${pick(["Sucursal", "Planta", "Local", "Obra"])} ${pick(["Norte", "Sur", "Oriente", "Poniente", "Centro"])} ${k}`,
        direccion: `${pick(["Av. Principal", "Los Aromos", "Calle Larga", "Av. Industrial"])} ${int(100, 9800)}`,
        comuna: pick(["Quilicura", "Pudahuel", "Providencia", "La Florida", "Rancagua", "Talca"]),
        region: c.region, encargado: pick(["Juan Pablo Leiva", "Carolina Bravo", "Esteban Salas", "Lorena Pino"]),
        telefonoEncargado: `+56 9 ${int(5000, 9999)} ${int(1000, 9999)}`, emailEncargado: `sucursal${k}@${c.email.split("@")[1]}`,
        casaMatriz: false, activo: true,
      });
    }
  }

  // ------------------------------------------- Saldos, movimientos, documentos
  const hoy = new Date();
  const saldos: Saldo[] = [];
  const movimientos: Movimiento[] = [];
  let mid = 1;
  for (const p of productos) {
    // Cada séptimo producto queda con stock crítico (solo en la bodega central).
    const critico = p.id % 7 === 0;
    for (const b of critico ? [1] : [1, 2, 3]) {
      if (b === 3 && int(0, 2) === 0) continue;
      const entradas = int(20, 160);
      const salidas = critico ? entradas - int(0, 4) : int(0, Math.floor(entradas * 0.7));
      saldos.push({ productoId: p.id, bodegaId: b, entradas, salidas });
      const d = new Date(hoy); d.setDate(d.getDate() - int(40, 200));
      movimientos.push({
        id: mid++, fecha: iso(d), bodegaId: b, productoId: p.id, tipoDocumento: "Factura",
        numeroDocumento: String(int(41000, 48999)), entrada: entradas, salida: 0,
        observacion: "Ingreso por compra", usuarioId: 4,
      });
      if (salidas > 0) {
        const d2 = new Date(hoy); d2.setDate(d2.getDate() - int(1, 39));
        movimientos.push({
          id: mid++, fecha: iso(d2), bodegaId: b, productoId: p.id, tipoDocumento: "Guía de despacho",
          numeroDocumento: String(int(9100, 9999)), entrada: 0, salida: salidas,
          observacion: "Despacho a obra", usuarioId: pick([4, 1]),
        });
      }
    }
  }
  movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  movimientos.forEach((m, i) => (m.id = i + 1));

  const estadosPeso: EstadoCodigo[] = ["P", "P", "P", "A", "A", "A", "EP", "EP", "F", "F", "F", "DP", "DT", "DT", "R"];
  const proyectos = [
    "Cámaras perimetrales bodega", "Control de acceso torre B", "Enlace punto a punto planta", "Ampliación CCTV estacionamiento",
    "Alarmas sucursales zona norte", "Cableado estructurado piso 3", "Modernización portería", "Kit CCTV casa piloto",
    "Reposición de grabadores", "Cerco eléctrico y sensores", "Red PoE para cámaras", "Sala de servidores - respaldo",
  ];
  const observ = [
    "Validez de la oferta: 15 días. Precios netos en pesos chilenos.",
    "Forma de pago: 50% anticipo, 50% contra entrega. Instalación no incluida.",
    "Incluye despacho en Región Metropolitana. Plazo de entrega: 7 días hábiles.",
    "",
  ];
  const documentos: Documento[] = [];
  let folio = 12140;
  const activos = productos.filter((p) => p.activo);
  for (let i = 0; i < 52; i++) {
    const diasAtras = Math.round(i * 5.6 + int(0, 3));
    const f = new Date(hoy); f.setDate(f.getDate() - diasAtras);
    const cliente = pick(clientes.filter((c) => c.activo));
    const suc = pick(sucursales.filter((s) => s.clienteId === cliente.id));
    const nLin = int(1, 5);
    const lineas: DocLinea[] = [];
    const usados = new Set<number>();
    for (let l = 1; l <= nLin; l++) {
      let prod = pick(activos);
      while (usados.has(prod.id)) prod = pick(activos);
      usados.add(prod.id);
      const precio = precios.find((x) => x.listaId === cliente.listaPrecioId && x.productoId === prod.id)!.precioVenta;
      const desc = pick([0, 0, 0, 3, 5, 10]);
      const cant = prod.formato === "Caja" || prod.formato === "Rollo" ? int(1, 6) : int(1, 24);
      const unit = Math.round(precio * (1 - desc / 100));
      lineas.push({
        linea: l, productoId: prod.id, codigo: prod.codigo, descripcion: prod.descripcion, cantidad: cant,
        valorNeto: precio, descuento: desc, valorUnitario: unit, totalLinea: Math.round(cant * precio * (1 - desc / 100)),
      });
    }
    const neto = lineas.reduce((s, l) => s + l.totalLinea, 0);
    const iva = Math.round((neto * IVA_PCT) / 100);
    const vieja = diasAtras > 60;
    const estado: EstadoCodigo = vieja ? pick(["A", "F", "F", "DT", "R", "DP"] as EstadoCodigo[]) : pick(estadosPeso);
    documentos.push({
      id: documentos.length + 1, folio: folio++, sercue: "0046", fecha: iso(f), fechaInsert: f.toISOString(),
      clienteId: cliente.id, sucursalId: suc.id, usuarioId: cliente.ejecutivoId ?? 2,
      rut: cliente.rut, razonSocial: cliente.razonSocial, direccion: suc.direccion, telefono: cliente.telefono,
      proyecto: pick(proyectos), observaciones: pick(observ), neto, iva, total: neto + iva,
      estado, eliminado: i === 47, lineas,
    });
  }
  // Los folios son correlativos en el tiempo: el documento más antiguo tiene el folio más bajo.
  documentos.sort((a, b) => a.fechaInsert.localeCompare(b.fechaInsert));
  documentos.forEach((d, i) => { d.id = i + 1; d.folio = 12140 + i; });
  folio = 12140 + documentos.length;
  const actividad: Store["actividad"] = [];
  const hoyIso = iso(hoy);
  documentos
    .filter((d) => d.fecha === hoyIso && !d.eliminado)
    .forEach((d) => actividad.push({ id: actividad.length + 1, fecha: d.fechaInsert, texto: `Cotización ${d.folio} emitida`, usuarioId: d.usuarioId }));

  return {
    roles, usuarios, clientes, sucursales, listas, precios, familias, subfamilias, productos, bodegas,
    saldos, movimientos, documentos, actividad,
    seq: {
      usuario: usuarios.length, cliente: clientes.length, sucursal: sid - 1, lista: listas.length, familia: familias.length,
      subfamilia: subfamilias.length, producto: productos.length, bodega: bodegas.length, movimiento: movimientos.length,
      documento: documentos.length, folio: folio - 1, rol: roles.length, actividad: actividad.length,
    },
  };
}
