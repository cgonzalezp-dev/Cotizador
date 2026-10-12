/* Datos de JR Multiservicios que aparecen en el encabezado y el pie del PDF.
   Edita solo este archivo para cambiar teléfonos y textos. */
window.JR_CONFIG = {
  /* Registro central (Supabase): alimenta el dashboard y asigna los números sin repetirse.
     La llave "publishable" es pública por diseño; la base solo permite registrar documentos con ella. */
  supabaseUrl: "https://jhsysydexkhsmfuvoekm.supabase.co",
  supabaseKey: "sb_publishable_3mbVY0MF519-hUY2Z6Zo6w_k3wtl3wj",

  empresa: "JR Multiservicios",
  slogan: "Tecnología bien instalada",
  servicios: "CCTV · Citofonía · Alarmas · Control de acceso",
  telefono: "322 243 5087",
  whatsapp: "573222435087",          // formato internacional, sin + ni espacios
  correo: "",                        // opcional: aparece en el pie si lo llenas
  ciudad: "Bogotá",
  validezPorDefecto: "15 días",
  frasePie: "Tecnología bien instalada para tu hogar y tu negocio.",
  garantias: "Equipos originales · Garantía · Instaladores certificados"
};
