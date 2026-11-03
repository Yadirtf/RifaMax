# RifaMax 🎟️

Rifas interactivas y configurables: varios premios con distintas formas de ganar, pago por abonos, ruletas en vivo con azar público verificable, resultados de lotería oficiales y temas por temporada en 3D (Navidad, Amor y Amistad, Día de la Madre, Siembra).

La primera rifa configurada es la **Rifa Navideña 2026**: 100 números de $20.000, cinco premios (Lotería de Medellín, dos ruletas, reintegro por número invertido y bono madrugador).

## Qué hace

**Para el jugador** (`/rifa/<slug>`)

- Tablero con todos los números: libre, apartado, abonando o pagado.
- Aparta un número con nombre y WhatsApp, y paga por abonos.
- Ve los premios, cómo se gana cada uno y los resultados en vivo (se actualiza solo).
- Ve la ruleta girar en vivo, la repite cuando quiera y verifica el resultado con drand desde su navegador.
- Consulta sus números y saldo con su WhatsApp.

**Para quien organiza** (`/admin`)

- Crear rifas con cualquier cantidad de premios, cada uno con su método:
  - **Lotería**: últimas cifras de una lotería oficial.
  - **Ruleta**: ruleta en vivo con drand entre los números pagados.
  - **Número invertido**: el invertido del ganador de otro premio (37 → 73).
- Reglas por premio: solo pagados hasta cierta fecha (bono madrugador), excluir ganadores de otras ruletas y qué hacer si el número no está pagado (ruleta entre pagados o desierto).
- Registrar abonos (Nequi, Daviplata, efectivo, transferencia), asignar y liberar números.
- Recordatorios por WhatsApp con el saldo de cada jugador ya escrito.
- Ruleta animada para girar en vivo compartiendo pantalla.
- Historial de actividad (quién apartó, abonó o liberó y cuándo) y avisos por Telegram.
- Apartados hechos desde la página que no abonan en un tiempo configurable (48 h por defecto) se liberan solos, salvo que fijes al jugador. Los WhatsApp de registros falsos se pueden bloquear.

## Sorteos que cualquiera puede comprobar

**Lotería (premio mayor).** Ninguna lotería colombiana ofrece una API pública, así que RifaMax lee la página oficial de resultados de la [Lotería de Medellín](https://loteriademedellin.com.co/resultados/). Quien organiza busca el resultado del día, lo revisa y lo confirma; el servidor vuelve a leer la página oficial antes de guardarlo. Si la página no responde, se digita a mano. Al lado del resultado siempre está el enlace a la página oficial para que el jugador compare.

**Ruletas.** Usan [drand](https://drand.love) (red *quicknet* de la League of Entropy), un número aleatorio público que se publica cada 3 segundos y que nadie puede predecir ni alterar, ni siquiera quien organiza:

1. Al programar la ruleta quedan fijos los números que participan (pagados a la fecha de corte) y una ronda futura de drand.
2. Cuando llega esa ronda, el ganador es `aleatorio de drand mod cantidad de participantes`, sobre la lista ordenada.
3. El jugador puede verificarlo desde su navegador: la página consulta drand directamente, sin pasar por nuestro servidor. También puede abrir el enlace de la ronda en `api.drand.sh`.

La lógica está en [`src/lib/drand.ts`](src/lib/drand.ts), [`src/lib/lotteries.ts`](src/lib/lotteries.ts) y [`src/lib/draws.ts`](src/lib/draws.ts), con pruebas en `src/lib/*.test.ts`.

## Desarrollo local

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

Sin `MONGODB_URI` usa una base en memoria con la Rifa Navideña 2026 ya cargada (se borra al reiniciar). Para ver la rifa con movimiento: `RIFAMAX_DEMO_TICKETS=1 npm run dev`.

- Tablero: http://localhost:3000/rifa/navidad-2026
- Panel: http://localhost:3000/admin (clave `admin` si no defines `ADMIN_PASSWORD` en desarrollo)

Otros comandos: `npm test`, `npm run lint`, `npm run build`.

## Publicar gratis (Vercel + MongoDB Atlas)

1. **Base de datos.** Crea un clúster gratis **M0** en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register). En *Database Access* crea un usuario; en *Network Access* permite `0.0.0.0/0` (Vercel no tiene IP fija). Copia la cadena `mongodb+srv://...`.
2. **Rifa inicial.** Desde tu equipo: `MONGODB_URI="mongodb+srv://..." npm run db:seed`. Crea la Rifa Navideña 2026 y los índices. (También puedes crear rifas desde el panel.)
3. **Vercel.** Importa el repositorio en [Vercel](https://vercel.com/new) y define estas variables:
   - `MONGODB_URI`: la cadena de Atlas.
   - `ADMIN_PASSWORD`: la clave del panel.
   - `SESSION_SECRET`: una frase larga al azar.
   - `MONGODB_DB` (opcional, por defecto `rifamax`).
   - `TELEGRAM_BOT_TOKEN` (opcional): para recibir un aviso en Telegram cada vez que alguien aparta. Créalo con [@BotFather](https://t.me/BotFather) y conecta tu chat en **Ajustes** del panel.
4. En el panel, abre la rifa y en **Ajustes** llena los datos de pago y el WhatsApp de quien organiza.

## Estructura

```
src/
  app/
    rifa/[slug]/        tablero público
    admin/              panel (login, rifas, abonos, sorteos)
    actions.ts          apartar número y "mis números"
    admin/actions.ts    acciones del panel
  components/
    three/              escenas 3D (ruleta, balotas, alcancía, figuras del tema)
    public/             tablero, premios, reglas
    admin/              panel
  lib/
    repo/               MongoDB y base en memoria (misma interfaz)
    drand.ts            azar público verificable
    lotteries.ts        lectura de resultados oficiales
    draws.ts            reglas de cada sorteo
    raffle.ts           reglas del juego
    themes.ts           temas por temporada
scripts/seed.ts         crea la rifa inicial en MongoDB
```

## Aviso legal

En Colombia las rifas con premios suelen requerir autorización de Coljuegos o de la autoridad territorial (Ley 643 de 2001). Verifica los requisitos antes de vender.
