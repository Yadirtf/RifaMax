# RifaMax 🎟️

Rifas interactivas y configurables: varios premios con distintas formas de ganar, pago por abonos, ruletas en vivo verificables y temas por temporada (Navidad, Amor y Amistad, Día de la Madre, Siembra).

La primera rifa configurada es la **Rifa Navideña 2026**: 100 números de $20.000, cinco premios (Lotería de Medellín, dos ruletas, reintegro por número invertido y bono madrugador).

## Qué hace

**Para el jugador** (`/rifa/<slug>`)

- Tablero con todos los números: libre, apartado, abonando o pagado.
- Aparta un número con nombre y WhatsApp, y paga por abonos.
- Ve los premios, cómo se gana cada uno y los resultados en vivo (se actualiza solo).
- Puede repetir el giro de cada ruleta y verificar el resultado desde su navegador.

**Para quien organiza** (`/admin`)

- Crear rifas con cualquier cantidad de premios, cada uno con su método:
  - **Lotería**: últimas cifras de una lotería oficial.
  - **Ruleta**: ruleta verificable entre los números pagados.
  - **Número invertido**: el invertido del ganador de otro premio (37 → 73).
- Reglas por premio: solo pagados hasta cierta fecha (bono madrugador), excluir ganadores de otras ruletas y qué hacer si el número no está pagado (ruleta entre pagados o desierto).
- Registrar abonos (Nequi, Daviplata, efectivo, transferencia), asignar y liberar números.
- Recordatorios por WhatsApp con el saldo de cada jugador ya escrito.
- Ruleta animada para girar en vivo compartiendo pantalla.

## Ruleta verificable

1. Al preparar la ruleta se genera una semilla secreta y se publica su hash SHA-256.
2. Al girar se revela la semilla. El ganador es `SHA-256(semilla + "|" + elegibles ordenados separados por coma)` módulo la cantidad de elegibles.
3. Como el hash se publicó antes, nadie puede cambiar la semilla para escoger ganador. Una ruleta ya girada no se puede repetir desde el panel.

La lógica está en [`src/lib/raffle.ts`](src/lib/raffle.ts) y tiene pruebas en `src/lib/raffle.test.ts`.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm install
cp .env.example .env.local   # cambia ADMIN_PASSWORD
npm run db:setup             # crea la base SQLite y la Rifa Navideña 2026
npm run dev
```

- Tablero: http://localhost:3000/rifa/navidad-2026
- Panel: http://localhost:3000/admin (clave `admin` si no defines `ADMIN_PASSWORD` en desarrollo)

Otros comandos: `npm test`, `npm run lint`, `npm run build`, `npm run db:generate` (tras cambiar `src/db/schema.ts`).

## Publicar gratis (Vercel + Turso)

1. Crea una base en [Turso](https://turso.tech) y copia su URL (`libsql://...`) y token.
2. Desde tu equipo, con esas variables definidas, ejecuta `npm run db:setup`.
3. Importa el repositorio en [Vercel](https://vercel.com) y define `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL` y `DATABASE_AUTH_TOKEN`.
4. En el panel, abre la rifa y llena "Datos de pago y descripción" (Nequi y WhatsApp de quien organiza).

## Estructura

```
src/
  app/
    rifa/[slug]/        tablero público
    admin/              panel (login, rifas, abonos, sorteos)
    actions.ts          apartar número (público)
    admin/actions.ts    acciones del panel
  components/           tablero, ruleta, premios, panel
  db/                   esquema Drizzle, migraciones y semilla
  lib/
    raffle.ts           reglas del juego y ruleta verificable
    draws.ts            sorteos contra la base de datos
    themes.ts           temas por temporada
drizzle/                migraciones SQL
```

## Aviso legal

En Colombia las rifas con premios suelen requerir autorización de Coljuegos o de la autoridad territorial (Ley 643 de 2001). Verifica los requisitos antes de vender.
