# OLGADLE

Jugá a OLGADLE o EN UNA NOTA en https://olgadle.nazadoto.com

¿Cómo se juega a OLGADLE?
- Elegí un integrante de OLGA (conductor, productor o técnica) y te mostrará una serie de pistas (verde = correcto, rojo = incorrecto, amarillo = tiene una coincidencia)

¿Cómo se juega a EN UNA NOTA?
- Escuchá fragmentos de una canción elegida aleatoriamente de la playlist de Tapados de Laburo (https://open.spotify.com/playlist/2kumFei7d5KRoI2fLFgu2G?si=6q55edvYSPW6YeWtWJKOAA&nd=1&dlsi=eb218ff031284d4f) e intentá adivinarla en el menor tiempo posible!

## Desarrollo y despliegue

- Usá Node 20.19+ (serie 20) o 22.12+ y MySQL. Ejecutá `npm ci`.
- Creá la base MySQL y ejecutá `schema.sql` dentro de ella para crear las tablas de integrantes y programas. El backend crea las tablas de rondas y SQP al iniciar. Cargá integrantes desde el panel para habilitar los desafíos de personas.
- Copiá `.env.example` a `.env` y configurá la conexión. Configurá una contraseña administrativa nueva y un `JWT_SECRET` aleatorio y persistente para conservar sesiones entre reinicios. Configurá `YOUTUBE_API_KEY` si usás la API de YouTube.
- Ejecutá `npm start` para la API y `npm run dev` para Vite. En producción publicá `dist/` generado por `npm run build` y dirigí `/api`, `/uploads` y `/place-socket` al backend. El proxy de Socket.IO debe admitir WebSocket.
- El ciclo de SQP dura 30 días. En la primera ejecución con este cambio, configurá `PLACE_CYCLE_STARTED_AT` con la fecha de inicio del ciclo actual si la conocés. Si se omite, se usa la fecha de la última captura registrada o, si no hay ninguna, la fecha de instalación del cambio. Después del primer arranque la base conserva el vencimiento. Si el servidor estuvo apagado al vencer, guarda una captura al volver y avanza al siguiente vencimiento del calendario.
- Rotá las credenciales antiguas de MySQL, administración, JWT y YouTube si siguen activas. Las versiones anteriores del repositorio todavía las contienen.

Las nuevas capturas de SQP se guardan en `canvas_cycle_snapshots`. Cada fila contiene el tamaño del lienzo y sus bytes RGB comprimidos con gzip en orden por filas. Las capturas anteriores siguen en `canvas_snapshots`.
