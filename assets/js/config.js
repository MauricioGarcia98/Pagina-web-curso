/* Configuración del sitio en producción. Todo vacío = el sitio funciona igual que siempre, sin cuentas ni anuncios.
 * La guía paso a paso para completar esto está en docs/produccion.md.
 *
 * Estas claves son PÚBLICAS por diseño (viajan al navegador de cada visitante):
 *  - supabaseAnonKey es la clave "anon" de Supabase, pensada para usarse en el navegador; lo que protege los
 *    datos son las reglas de seguridad por fila (RLS) de la base, no esta clave.
 *  - Nunca pegues aquí la clave "service_role" de Supabase ni ninguna contraseña.
 */
window.SITIO = {
  // Cuentas y sincronización del progreso (Supabase → Project Settings → API)
  supabaseUrl: '',        // por ejemplo: https://abcdefgh.supabase.co
  supabaseAnonKey: '',    // la clave "anon public"
  proveedores: ['google', 'github'], // botones de ingreso además del enlace por correo; deja [] para usar solo correo

  // Anuncios (Google AdSense → Anuncios → Por bloque de anuncios)
  adsenseCliente: '',     // por ejemplo: ca-pub-1234567890123456
  adsenseBloques: { leccion: '', portada: '' }, // el número "data-ad-slot" de cada bloque

  // Datos para las páginas legales
  nombreSitio: 'Academia de Datos',
  responsable: '',        // tu nombre o el de tu empresa
  contacto: '',           // un correo de contacto
};
