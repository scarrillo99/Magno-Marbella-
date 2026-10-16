/**
 * Hoja «CONTROL BUSSINES» · pestaña MAGNO ENTRENOS · bloque «NUEVO AÑO 2026».
 *
 * Transcripcion literal de las 36 filas (41 a 76) de la hoja, columna a columna.
 * No hay ningun reparto estimado: cada linea lleva las horas, el precio de venta
 * y el coste de proveedor tal y como estan en la hoja.
 *
 * Comprobaciones que cuadran al centimo con la hoja:
 *   - suma de la columna Base (S) .................... 110.919,00 EUR
 *   - suma de la columna Beneficio (BA) ...............  40.095,00 EUR
 *   - coste de proveedores implicito ..................  70.824,00 EUR
 *   - base de las filas con IVA (16 filas) ............  96.666,00 EUR
 *   - base de las filas sin IVA (18 filas) ............  14.253,00 EUR
 *   - IVA repercutido .................................  20.299,86 EUR
 *   - total facturado con IVA ......................... 131.218,86 EUR
 *
 * Donde la hoja factura mas horas de las que paga (p. ej. 15 h de coach
 * facturadas y 14 pagadas), la linea conserva las horas de venta y el coste
 * unitario se ajusta para que el coste total siga siendo el de la hoja.
 */

/** Un bloque de servicio del lado de venta: horas y precio por hora. */
export interface BloqueVenta {
  cant: number
  precio: number
}

/** Un bloque de servicio del lado de coste, con su IVA soportado. */
export interface BloqueCoste {
  cant: number
  precio: number
  iva: boolean
}

/** Una fila de la hoja, tal cual. */
export interface FilaHoja2026 {
  /** Numero de fila en la hoja de Google, para poder cotejar. */
  fila: number
  fecha: string
  /** Texto de la columna Fecha, que suele listar varios dias sueltos. */
  fechaTexto: string
  lugar: string
  jugador: string
  proveedorCampo: string | null
  /** Columna «Cheff o Fisio o Villa», ya clasificada por servicio. */
  extra: { servicio: string; cant: number; precio: number } | null
  campo: BloqueVenta | null
  coach: BloqueVenta | null
  gym: BloqueVenta | null
  descuento: number
  /** Columna Base (S): lo que realmente se factura, antes de IVA. */
  base: number
  /** La columna 21% IVA (T) tiene importe: el cliente pago por transferencia. */
  conIva: boolean
  /** Columna Pagado (V). */
  pagado: number
  cChef: BloqueCoste | null
  cFisio: BloqueCoste | null
  cCampo: BloqueCoste | null
  cCoach: BloqueCoste | null
  cGym: BloqueCoste | null
  /** Columna Base de coste (AX), corregida en la fila 45. */
  costeBase: number
  /** Columna Beneficio (BA). */
  beneficio: number
  /** Columna A cuenta (BG): ya pagado a proveedores, con IVA. */
  aCuenta: number
  /** Columna Resta (BH): pendiente de pagar a proveedores, con IVA. */
  resta: number
  nota: string
}

export const FILAS_2026: FilaHoja2026[] = [
  {
    fila: 41, fecha: '2026-05-29', fechaTexto: '29,30 mayo - 1,2,3 junio',
    lugar: 'Banus FC', jugador: 'Fermi Seriki', proveedorCampo: 'prov_banus',
    extra: null,
    campo: null, coach: null, gym: null,
    descuento: 0, base: 0, conIva: false, pagado: 0,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 0, aCuenta: 0, resta: 0,
    nota: 'Fila marcada en rojo en la hoja y sin importes: no llego a facturarse.',
  },
  {
    fila: 42, fecha: '2026-06-01', fechaTexto: 'June 1-5 and 8-12',
    lugar: 'Banus FC', jugador: 'Tyler', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 10, precio: 360 }, coach: null, gym: { cant: 1, precio: 200 },
    descuento: 540, base: 3260, conIva: true, pagado: 3944.6,
    cChef: null, cFisio: null, cCampo: { cant: 10, precio: 250, iva: true },
    cCoach: null, cGym: null,
    costeBase: 2500, beneficio: 760, aCuenta: 3025, resta: 0,
    nota: '',
  },
  {
    fila: 43, fecha: '2026-06-08', fechaTexto: '8,9,11,12 Junio',
    lugar: 'Banus FC', jugador: 'Leo', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 6, precio: 360 }, coach: { cant: 6, precio: 110 }, gym: null,
    descuento: 0, base: 2820, conIva: true, pagado: 3412.2,
    cChef: null, cFisio: null, cCampo: { cant: 6, precio: 250, iva: true },
    cCoach: { cant: 5, precio: 50, iva: false }, cGym: null,
    costeBase: 1750, beneficio: 1070, aCuenta: 2065, resta: 0,
    nota: 'La hoja factura 6 h de entrenador y paga 5 h.',
  },
  {
    fila: 44, fecha: '2026-05-17', fechaTexto: '17,18,19,20,21 mayo and 1,2,3,5,6 junio',
    lugar: 'Marbella Football Center', jugador: 'Monchu', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'fisio', cant: 3, precio: 180 },
    campo: { cant: 5, precio: 480 }, coach: { cant: 15, precio: 110 }, gym: { cant: 10, precio: 95 },
    descuento: 0, base: 5540, conIva: true, pagado: 6703.4,
    cChef: null, cFisio: { cant: 2, precio: 120, iva: false }, cCampo: { cant: 5, precio: 350, iva: true },
    cCoach: { cant: 14, precio: 50, iva: true }, cGym: { cant: 5, precio: 60, iva: true },
    costeBase: 2990, beneficio: 2550, aCuenta: 3010.5, resta: 0,
    nota: 'Bloque largo: se facturan 3 sesiones de fisio y 15 h de coach, y se pagan 2 y 14.',
  },
  {
    fila: 45, fecha: '2026-05-16', fechaTexto: '16,17,18,19,20,21 mayo and 1,2,3,4,5,6 junio',
    lugar: 'Villa + Hotel', jugador: 'Monchu', proveedorCampo: null,
    extra: { servicio: 'villa', cant: 1, precio: 1185 },
    campo: { cant: 1, precio: 973 }, coach: null, gym: null,
    descuento: 0, base: 2158, conIva: true, pagado: 2611.18,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 2158, aCuenta: 0, resta: 0,
    nota: 'DISCREPANCIA EN LA HOJA: la columna de coste (AX) pone 2.158,00 EUR, pero no hay ningun coste por servicio ni ningun pago a proveedor, y la columna de beneficio (BA) da 2.158,00 EUR, es decir coste cero. Se carga con coste cero, que es lo que cuadra con el beneficio total de la hoja. Si la villa costo de verdad 2.158,00 EUR, corrigelo aqui.',
  },
  {
    fila: 46, fecha: '2026-05-16', fechaTexto: '16,17,18,19,20,21 mayo and 1,2,3,4,5,6 junio',
    lugar: 'Cheff', jugador: 'Monchu', proveedorCampo: null,
    extra: { servicio: 'chef', cant: 1, precio: 1683 },
    campo: null, coach: null, gym: null,
    descuento: 0, base: 1683, conIva: true, pagado: 2036.43,
    cChef: { cant: 1, precio: 1404, iva: true }, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 1404, beneficio: 279, aCuenta: 1698.84, resta: 0,
    nota: '',
  },
  {
    fila: 47, fecha: '2026-05-16', fechaTexto: '16,17,18,19,20,21 mayo and 1,2,3,4,5,6 junio',
    lugar: 'Villa Lanzini', jugador: 'Fraser', proveedorCampo: null,
    extra: { servicio: 'villa', cant: 1, precio: 960 },
    campo: null, coach: null, gym: null,
    descuento: 0, base: 960, conIva: false, pagado: 960,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 960, aCuenta: 0, resta: 0,
    nota: 'La hoja no registra coste de la villa.',
  },
  {
    fila: 48, fecha: '2026-06-02', fechaTexto: '2nd, 3rd, 5th, 8th, 9th, 11th and 12th of June',
    lugar: 'Banus FC', jugador: 'Gabz', proveedorCampo: 'prov_banus',
    extra: { servicio: 'otro', cant: 1, precio: 300 },
    campo: { cant: 7, precio: 360 }, coach: null, gym: null,
    descuento: 0, base: 2820, conIva: true, pagado: 3412.2,
    cChef: null, cFisio: null, cCampo: { cant: 7, precio: 250, iva: true },
    cCoach: null, cGym: null,
    costeBase: 1750, beneficio: 1070, aCuenta: 2117.5, resta: 0,
    nota: 'Los 300,00 EUR estan en la columna "Cheff o Fisio o Villa" sin coste asociado: revisar a que servicio corresponden.',
  },
  {
    fila: 49, fecha: '2026-06-15', fechaTexto: '15,16,17,18,19 junio',
    lugar: 'Marbella Football Center', jugador: 'Alvaro Valles', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 2, precio: 480 }, coach: { cant: 5, precio: 110 }, gym: { cant: 3, precio: 95 },
    descuento: 0, base: 1795, conIva: false, pagado: 1795,
    cChef: null, cFisio: null, cCampo: { cant: 2, precio: 350, iva: false },
    cCoach: { cant: 5, precio: 50, iva: false }, cGym: { cant: 3, precio: 60, iva: false },
    costeBase: 1130, beneficio: 665, aCuenta: 1130, resta: 0,
    nota: '',
  },
  {
    fila: 50, fecha: '2026-06-10', fechaTexto: '10,11 junio',
    lugar: 'Banus Football Center', jugador: 'Lucas', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 2, precio: 80 },
    campo: { cant: 2, precio: 360 }, coach: { cant: 2, precio: 110 }, gym: null,
    descuento: 0, base: 1100, conIva: false, pagado: 1100,
    cChef: null, cFisio: null, cCampo: { cant: 2, precio: 250, iva: false },
    cCoach: { cant: 2, precio: 50, iva: false }, cGym: null,
    costeBase: 600, beneficio: 500, aCuenta: 600, resta: 0,
    nota: '',
  },
  {
    fila: 51, fecha: '2026-06-10', fechaTexto: '10, 11 and 12 junio',
    lugar: 'Estepona Football Center', jugador: 'Josep', proveedorCampo: 'prov_estepona',
    extra: { servicio: 'fisio', cant: 3, precio: 80 },
    campo: null, coach: { cant: 3, precio: 110 }, gym: null,
    descuento: 0, base: 570, conIva: false, pagado: 570,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: { cant: 3, precio: 50, iva: false }, cGym: null,
    costeBase: 150, beneficio: 420, aCuenta: 150, resta: 0,
    nota: '',
  },
  {
    fila: 52, fecha: '2026-06-11', fechaTexto: '11 june',
    lugar: 'Marbella Football Center', jugador: 'Armindo (rodion)', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'fisio', cant: 1, precio: 80 },
    campo: { cant: 1, precio: 480 }, coach: { cant: 1, precio: 110 }, gym: null,
    descuento: 0, base: 670, conIva: false, pagado: 670,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 350, iva: false },
    cCoach: { cant: 1, precio: 50, iva: false }, cGym: null,
    costeBase: 400, beneficio: 270, aCuenta: 400, resta: 0,
    nota: '',
  },
  {
    fila: 53, fecha: '2026-06-13', fechaTexto: '13,15,17 june',
    lugar: 'Banus Football Center', jugador: 'Sam', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 3, precio: 80 },
    campo: { cant: 3, precio: 360 }, coach: { cant: 3, precio: 110 }, gym: null,
    descuento: 0, base: 1650, conIva: false, pagado: 1650,
    cChef: null, cFisio: null, cCampo: { cant: 3, precio: 250, iva: false },
    cCoach: { cant: 3, precio: 50, iva: false }, cGym: null,
    costeBase: 900, beneficio: 750, aCuenta: 900, resta: 0,
    nota: '',
  },
  {
    fila: 54, fecha: '2026-06-17', fechaTexto: '17 junio',
    lugar: 'Marbella Football Center', jugador: 'Luis', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 1, precio: 480 }, coach: null, gym: null,
    descuento: 0, base: 480, conIva: false, pagado: 480,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 350, iva: true },
    cCoach: null, cGym: null,
    costeBase: 350, beneficio: 130, aCuenta: 350, resta: 0,
    nota: '',
  },
  {
    fila: 55, fecha: '2026-06-21', fechaTexto: '21 -22 Junio',
    lugar: 'Banus Football Center', jugador: 'Will', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 2, precio: 360 }, coach: { cant: 2, precio: 110 }, gym: null,
    descuento: 0, base: 940, conIva: false, pagado: 940,
    cChef: null, cFisio: null, cCampo: { cant: 2, precio: 250, iva: false },
    cCoach: { cant: 2, precio: 50, iva: false }, cGym: null,
    costeBase: 600, beneficio: 340, aCuenta: 600, resta: 0,
    nota: '',
  },
  {
    fila: 56, fecha: '2026-06-29', fechaTexto: '29- 4 Julio',
    lugar: 'Marbella Football Center', jugador: 'Alvian', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'fisio', cant: 18, precio: 80 },
    campo: { cant: 7, precio: 360 }, coach: { cant: 7, precio: 110 }, gym: { cant: 2, precio: 95 },
    descuento: 0, base: 4920, conIva: true, pagado: 5953.2,
    cChef: null, cFisio: { cant: 2, precio: 120, iva: true }, cCampo: { cant: 5, precio: 250, iva: true },
    cCoach: { cant: 5, precio: 50, iva: false }, cGym: { cant: 10, precio: 60, iva: true },
    costeBase: 2340, beneficio: 2580, aCuenta: 2778.9, resta: 0,
    nota: 'Bloque de 18 sesiones facturadas en la columna de fisio con solo 2 sesiones pagadas: revisar si las otras 16 son otro concepto.',
  },
  {
    fila: 57, fecha: '2026-06-21', fechaTexto: '21 and 22 Junio',
    lugar: 'Banus Football Center', jugador: 'Buba', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 2, precio: 360 }, coach: { cant: 2, precio: 110 }, gym: null,
    descuento: 72, base: 868, conIva: false, pagado: 868,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: { cant: 2, precio: 50, iva: false }, cGym: null,
    costeBase: 100, beneficio: 768, aCuenta: 100, resta: 0,
    nota: '',
  },
  {
    fila: 58, fecha: '2026-05-29', fechaTexto: '29,30,2,7,9,10 Junio',
    lugar: 'Marbella Football Center', jugador: 'Dean', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'fisio', cant: 4, precio: 50 },
    campo: null, coach: { cant: 4, precio: 110 }, gym: null,
    descuento: 0, base: 640, conIva: false, pagado: 640,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: { cant: 4, precio: 50, iva: false }, cGym: null,
    costeBase: 200, beneficio: 440, aCuenta: 200, resta: 0,
    nota: '',
  },
  {
    fila: 59, fecha: '2026-06-26', fechaTexto: '26,29,30,1,3 Julio',
    lugar: 'Marbella Football Center', jugador: 'Fer', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 1, precio: 360 }, coach: { cant: 5, precio: 110 }, gym: { cant: 6, precio: 95 },
    descuento: 0, base: 1480, conIva: false, pagado: 1480,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 250, iva: true },
    cCoach: { cant: 6, precio: 50, iva: false }, cGym: { cant: 3, precio: 60, iva: false },
    costeBase: 730, beneficio: 750, aCuenta: 782.5, resta: 0,
    nota: '',
  },
  {
    fila: 60, fecha: '2026-05-30', fechaTexto: '30, 1, 2, 3 junio',
    lugar: 'Marbella Football Center', jugador: 'Noah', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'fisio', cant: 4, precio: 180 },
    campo: { cant: 4, precio: 480 }, coach: { cant: 6, precio: 110 }, gym: { cant: 2, precio: 95 },
    descuento: 0, base: 3490, conIva: true, pagado: 4222.9,
    cChef: null, cFisio: { cant: 4, precio: 120, iva: true }, cCampo: { cant: 4, precio: 350, iva: true },
    cCoach: { cant: 6, precio: 50, iva: false }, cGym: { cant: 2, precio: 60, iva: true },
    costeBase: 2300, beneficio: 1190, aCuenta: 2720, resta: 0,
    nota: '',
  },
  {
    fila: 61, fecha: '2026-06-29', fechaTexto: '29,30,1,2 Julio',
    lugar: 'Banus Football Center', jugador: 'Javi Robles', proveedorCampo: 'prov_banus',
    extra: null,
    campo: null, coach: null, gym: { cant: 3, precio: 80 },
    descuento: 0, base: 240, conIva: false, pagado: 240,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 240, aCuenta: 0, resta: 0,
    nota: 'La hoja no registra coste de gimnasio.',
  },
  {
    fila: 62, fecha: '2026-06-05', fechaTexto: '5 junio',
    lugar: 'Banus Football Center', jugador: 'Boli', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 1, precio: 360 }, coach: { cant: 1, precio: 110 }, gym: null,
    descuento: 70, base: 400, conIva: false, pagado: 400,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: { cant: 1, precio: 50, iva: true }, cGym: null,
    costeBase: 50, beneficio: 350, aCuenta: 50, resta: 0,
    nota: '',
  },
  {
    fila: 63, fecha: '2026-06-09', fechaTexto: '9 junio',
    lugar: 'Marbella Football Center', jugador: 'Anthony', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 1, precio: 480 }, coach: null, gym: { cant: 1, precio: 95 },
    descuento: 0, base: 575, conIva: true, pagado: 695.75,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 350, iva: true },
    cCoach: null, cGym: { cant: 1, precio: 60, iva: true },
    costeBase: 410, beneficio: 165, aCuenta: 496.1, resta: 0,
    nota: '',
  },
  {
    fila: 64, fecha: '2026-06-10', fechaTexto: '10 y 11 Junio',
    lugar: 'Marbella Football Center', jugador: 'Anthony', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 1, precio: 480 }, coach: null, gym: { cant: 1, precio: 95 },
    descuento: 125, base: 450, conIva: false, pagado: 450,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 350, iva: false },
    cCoach: null, cGym: { cant: 1, precio: 60, iva: false },
    costeBase: 410, beneficio: 40, aCuenta: 410, resta: 0,
    nota: '',
  },
  {
    fila: 65, fecha: '2026-06-01', fechaTexto: '(sin fecha en la hoja)',
    lugar: 'Marbella Football Center', jugador: 'Unique', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 3, precio: 480 }, coach: { cant: 3, precio: 110 }, gym: { cant: 3, precio: 95 },
    descuento: 0, base: 2055, conIva: true, pagado: 2486.55,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 2055, aCuenta: 0, resta: 0,
    nota: 'Sin fecha y sin ningun coste registrado en la hoja.',
  },
  {
    fila: 66, fecha: '2026-06-10', fechaTexto: '10 junio',
    lugar: 'Banus Football Center', jugador: 'Sebastian', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 1, precio: 80 },
    campo: { cant: 1, precio: 360 }, coach: { cant: 1, precio: 110 }, gym: null,
    descuento: 0, base: 550, conIva: false, pagado: 550,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 550, aCuenta: 0, resta: 0,
    nota: 'Sin costes registrados en la hoja.',
  },
  {
    fila: 67, fecha: '2026-06-17', fechaTexto: '17 y 20 junio',
    lugar: 'Banus Football Center', jugador: 'Felix', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 2, precio: 360 }, coach: { cant: 2, precio: 110 }, gym: { cant: 2, precio: 95 },
    descuento: 0, base: 1130, conIva: true, pagado: 1367.3,
    cChef: null, cFisio: null, cCampo: { cant: 2, precio: 250, iva: true },
    cCoach: { cant: 2, precio: 70, iva: false }, cGym: { cant: 1, precio: 60, iva: true },
    costeBase: 700, beneficio: 430, aCuenta: 817.6, resta: 0,
    nota: '',
  },
  {
    fila: 68, fecha: '2026-06-26', fechaTexto: '26 junio',
    lugar: 'Banus Football Center', jugador: 'Sebastian', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 1, precio: 80 },
    campo: { cant: 1, precio: 360 }, coach: { cant: 1, precio: 110 }, gym: null,
    descuento: 0, base: 550, conIva: false, pagado: 550,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: { cant: 1, precio: 70, iva: false }, cGym: null,
    costeBase: 70, beneficio: 480, aCuenta: 70, resta: 0,
    nota: '',
  },
  {
    fila: 69, fecha: '2026-07-26', fechaTexto: '26 julio',
    lugar: 'Banus Football Center', jugador: 'Jeremy', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 1, precio: 80 },
    campo: { cant: 1, precio: 360 }, coach: { cant: 1, precio: 110 }, gym: null,
    descuento: 0, base: 550, conIva: false, pagado: 550,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 250, iva: false },
    cCoach: { cant: 1, precio: 70, iva: false }, cGym: null,
    costeBase: 320, beneficio: 230, aCuenta: 320, resta: 0,
    nota: '',
  },
  {
    fila: 70, fecha: '2026-08-01', fechaTexto: '1 agosto',
    lugar: 'Banus Football Center', jugador: 'Manuel Angel', proveedorCampo: 'prov_banus',
    extra: null,
    campo: null, coach: null, gym: null,
    descuento: 0, base: 0, conIva: false, pagado: 0,
    cChef: null, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 0, beneficio: 0, aCuenta: 0, resta: 0,
    nota: 'Fila sin importes en la hoja.',
  },
  {
    fila: 71, fecha: '2026-07-31', fechaTexto: '31 julio',
    lugar: 'Banus Football Center', jugador: 'Luke', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 1, precio: 360 }, coach: null, gym: null,
    descuento: 0, base: 360, conIva: false, pagado: 0,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 250, iva: false },
    cCoach: null, cGym: null,
    costeBase: 250, beneficio: 110, aCuenta: 250, resta: 0,
    nota: 'Unica operacion de 2026 pendiente de cobro: 360,00 EUR.',
  },
  {
    fila: 72, fecha: '2026-09-30', fechaTexto: '30,1,2,3 octubre',
    lugar: 'Banus Football Center', jugador: 'Mangala', proveedorCampo: 'prov_banus',
    extra: null,
    campo: { cant: 4, precio: 480 }, coach: { cant: 4, precio: 110 }, gym: { cant: 5, precio: 85 },
    descuento: 0, base: 2785, conIva: true, pagado: 3369.85,
    cChef: null, cFisio: null, cCampo: { cant: 4, precio: 250, iva: true },
    cCoach: { cant: 4, precio: 70, iva: false }, cGym: { cant: 2, precio: 50, iva: true },
    costeBase: 1380, beneficio: 1405, aCuenta: 0, resta: 1611,
    nota: 'Pendiente de pago a proveedores: 1.611,00 EUR.',
  },
  {
    fila: 73, fecha: '2026-09-24', fechaTexto: '24 al 27 septiembre',
    lugar: 'Chef Villa', jugador: 'Noni', proveedorCampo: null,
    extra: { servicio: 'chef', cant: 1, precio: 3300 },
    campo: null, coach: null, gym: null,
    descuento: 0, base: 3300, conIva: true, pagado: 3993,
    cChef: { cant: 1, precio: 2720, iva: true }, cFisio: null, cCampo: null,
    cCoach: null, cGym: null,
    costeBase: 2720, beneficio: 580, aCuenta: 3291.2, resta: 0,
    nota: '',
  },
  {
    fila: 74, fecha: '2026-09-24', fechaTexto: '24,25,26 septiembre',
    lugar: 'Marbella Football Center', jugador: 'Brice', proveedorCampo: 'prov_mfc',
    extra: null,
    campo: { cant: 2, precio: 480 }, coach: null, gym: { cant: 3, precio: 90 },
    descuento: 0, base: 1230, conIva: true, pagado: 1488.3,
    cChef: null, cFisio: null, cCampo: { cant: 2, precio: 350, iva: true },
    cCoach: { cant: 1, precio: 70, iva: false }, cGym: null,
    costeBase: 770, beneficio: 460, aCuenta: 0, resta: 917,
    nota: 'Pendiente de pago a proveedores: 917,00 EUR.',
  },
  {
    fila: 75, fecha: '2026-10-01', fechaTexto: '1,2,3 octubre',
    lugar: 'Banus Football Center', jugador: 'Gabz', proveedorCampo: 'prov_banus',
    extra: { servicio: 'fisio', cant: 3, precio: 80 },
    campo: { cant: 4, precio: 360 }, coach: { cant: 1, precio: 200 }, gym: { cant: 12, precio: 85 },
    descuento: 0, base: 2900, conIva: true, pagado: 3509,
    cChef: null, cFisio: null, cCampo: { cant: 3, precio: 250, iva: true },
    cCoach: null, cGym: null,
    costeBase: 750, beneficio: 2150, aCuenta: 0, resta: 907.5,
    nota: 'Pendiente de pago a proveedores: 907,50 EUR. La hoja no registra coste de coach ni de gimnasio.',
  },
  {
    fila: 76, fecha: '2026-10-07', fechaTexto: '7 octubre al 11 diciembre',
    lugar: 'Marbella Football Center', jugador: 'AJ', proveedorCampo: 'prov_mfc',
    extra: { servicio: 'otro', cant: 1, precio: 40000 },
    campo: { cant: 1, precio: 16000 }, coach: null, gym: null,
    descuento: 0, base: 56000, conIva: true, pagado: 67760,
    cChef: null, cFisio: null, cCampo: { cant: 1, precio: 20000, iva: true },
    cCoach: { cant: 1, precio: 14600, iva: true }, cGym: { cant: 1, precio: 8200, iva: true },
    costeBase: 42800, beneficio: 13200, aCuenta: 51788, resta: 9922,
    nota: 'Bloque de temporada completa. Los 40.000,00 EUR estan en la columna "Cheff o Fisio o Villa" sin desglose: revisar el concepto. Pendiente de pago a proveedores: 9.922,00 EUR (gimnasio).',
  },
]

/* ------------------------------------------------------------------------- */

import { SERVICIO_LABEL, type LineaServicio, type Operacion, type ServicioKey } from '../types'

const PROVEEDOR_POR_SERVICIO: Partial<Record<ServicioKey, string>> = {
  coach: 'prov_coach',
  gimnasio: 'prov_gym',
  fisio: 'prov_fisio',
  chef: 'prov_chef',
  villa: 'prov_alojamiento',
}

const NOMBRE_PROVEEDOR: Record<string, string> = {
  prov_mfc: 'Marbella Football Center (MFC)',
  prov_banus: 'Banus FC',
  prov_estepona: 'Estepona Sports Complex',
  prov_coach: 'Staff de Entrenadores Magno',
  prov_chef: 'Chef Privado Marbella',
  prov_alojamiento: 'Villas & Hoteles Marbella',
  prov_fisio: 'Fisioterapia Deportiva Marbella',
  prov_gym: 'Gimnasio High Performance',
}

/** Redondeo a 4 decimales: deja el total exacto aunque la tarifa no sea redonda. */
const r4 = (n: number) => Math.round(n * 1e4) / 1e4

interface Pieza {
  servicio: ServicioKey
  nombre: string
  proveedorId: string | null
  venta: BloqueVenta | null
  coste: BloqueCoste | null
}

/**
 * Orden de pago a proveedores. La hoja salda primero la instalacion, luego el
 * entrenador y deja el gimnasio para el final, que es lo que explica el
 * pendiente de la fila 76.
 */
const ORDEN_PAGO: ServicioKey[] = ['campo', 'coach', 'gimnasio', 'fisio', 'chef', 'villa', 'otro']

function piezas(f: FilaHoja2026): Pieza[] {
  const lista: Pieza[] = []

  if (f.extra) {
    const servicio = f.extra.servicio as ServicioKey
    lista.push({
      servicio,
      nombre: SERVICIO_LABEL[servicio],
      proveedorId: PROVEEDOR_POR_SERVICIO[servicio] ?? null,
      venta: { cant: f.extra.cant, precio: f.extra.precio },
      coste: servicio === 'chef' ? f.cChef : servicio === 'fisio' ? f.cFisio : null,
    })
  }

  // Fila 45: la hoja mete la parte de hotel en la columna de campo, pero no es
  // un alquiler de campo. Se separa como segunda linea de alojamiento.
  const campoEsHotel = f.extra?.servicio === 'villa' && f.campo !== null
  if (f.campo && campoEsHotel) {
    lista.push({
      servicio: 'villa',
      nombre: 'Hotel',
      proveedorId: 'prov_alojamiento',
      venta: f.campo,
      coste: null,
    })
  } else if (f.campo || f.cCampo) {
    lista.push({
      servicio: 'campo',
      nombre: SERVICIO_LABEL.campo,
      proveedorId: f.proveedorCampo,
      venta: f.campo,
      coste: f.cCampo,
    })
  }

  if (f.coach || f.cCoach) {
    lista.push({
      servicio: 'coach',
      nombre: SERVICIO_LABEL.coach,
      proveedorId: 'prov_coach',
      venta: f.coach,
      coste: f.cCoach,
    })
  }

  if (f.gym || f.cGym) {
    lista.push({
      servicio: 'gimnasio',
      nombre: SERVICIO_LABEL.gimnasio,
      proveedorId: 'prov_gym',
      venta: f.gym,
      coste: f.cGym,
    })
  }

  // Costes que la hoja registra sin que haya venta de ese servicio.
  if (f.cFisio && f.extra?.servicio !== 'fisio') {
    lista.push({
      servicio: 'fisio',
      nombre: SERVICIO_LABEL.fisio,
      proveedorId: 'prov_fisio',
      venta: null,
      coste: f.cFisio,
    })
  }
  if (f.cChef && f.extra?.servicio !== 'chef') {
    lista.push({
      servicio: 'chef',
      nombre: SERVICIO_LABEL.chef,
      proveedorId: 'prov_chef',
      venta: null,
      coste: f.cChef,
    })
  }

  return lista
}

function construirFila(f: FilaHoja2026, indice: number): Operacion {
  const ivaVentaPct = f.conIva ? 0.21 : 0
  const lista = piezas(f)

  const lineas: LineaServicio[] = lista.map((p, i) => {
    const ventaTotal = p.venta ? p.venta.cant * p.venta.precio : 0
    const costeTotal = p.coste ? p.coste.cant * p.coste.precio : 0
    const cantidad = p.venta ? p.venta.cant : (p.coste?.cant ?? 0)
    return {
      id: `op_2026_h${f.fila}_${i}`,
      nombre: p.nombre,
      cantidad,
      tarifaVenta: cantidad > 0 ? r4(ventaTotal / cantidad) : 0,
      tarifaCoste: cantidad > 0 ? r4(costeTotal / cantidad) : 0,
      proveedorId: p.proveedorId,
      proveedorNombre: p.proveedorId ? (NOMBRE_PROVEEDOR[p.proveedorId] ?? '') : '',
      ivaVentaPct,
      ivaCostePct: p.coste?.iva ? 0.21 : 0,
    }
  })

  // Pagos a proveedores: la hoja salda la operacion entera salvo que la columna
  // Resta diga lo contrario; en ese caso se paga por orden hasta agotar lo pagado.
  const costeConIva = lista.reduce((a, p) => {
    if (!p.coste) return a
    return a + p.coste.cant * p.coste.precio * (p.coste.iva ? 1.21 : 1)
  }, 0)
  let porPagar = Math.max(0, Math.round((costeConIva - f.resta) * 100) / 100)

  const pagosProveedor: Record<string, number> = {}
  for (const servicio of ORDEN_PAGO) {
    for (const p of lista) {
      if (p.servicio !== servicio || !p.coste || !p.proveedorId) continue
      const importe = p.coste.cant * p.coste.precio * (p.coste.iva ? 1.21 : 1)
      const pagado = Math.min(importe, porPagar)
      if (pagado <= 0) continue
      pagosProveedor[p.proveedorId] = Math.round(((pagosProveedor[p.proveedorId] ?? 0) + pagado) * 100) / 100
      porPagar = Math.round((porPagar - pagado) * 100) / 100
    }
  }

  const referencia = `Hoja MAGNO ENTRENOS, fila ${f.fila}. Fechas: ${f.fechaTexto}.`

  return {
    id: `op_2026_h${f.fila}`,
    numeroFactura: `MM-2026-${String(indice + 1).padStart(3, '0')}`,
    fecha: f.fecha,
    temporada: 2026,
    ubicacion: f.lugar,
    jugador: f.jugador,
    lineas,
    feePct: 0,
    descuento: f.descuento,
    pagado: f.pagado,
    pagosProveedor,
    notas: f.nota ? `${referencia} ${f.nota}` : referencia,
  }
}

/** Las 36 operaciones reales de la temporada 2026. */
export function operaciones2026(): Operacion[] {
  return FILAS_2026.map(construirFila)
}
