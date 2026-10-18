# 🦉 Aprende Conmigo AI

Un profesor personal con inteligencia artificial para niños y niñas de 6 a 12 años que tienen dificultades con las **matemáticas**, la **lectura** o el **inglés**.

## Qué hace

| Función | Cómo funciona |
|---|---|
| **Explica paso a paso** | Cada ejercicio tiene un "Paso a paso" que se muestra de uno en uno (sumas llevando, restas pidiendo prestado, tablas, divisiones, problemas). Si el niño falla, la explicación se abre sola. |
| **Lee en voz alta** | Las preguntas se leen automáticamente con la voz del navegador. Las lecturas resaltan cada palabra mientras se leen y las palabras en inglés usan voz inglesa. |
| **Se adapta al nivel** | 5 niveles por materia (Semillita → Bosque). Empieza según la edad, sube tras 3 aciertos seguidos y baja tras 2 fallos, para no frustrar ni aburrir. |
| **Juegos y recompensas** | 3 juegos (Carrera de cohetes, Memoria en inglés, Globos de palabras), estrellas, monedas, 12 medallas y una tienda de personajes, sombreros y pegatinas. |
| **Ayuda con la tarea** | El niño escribe (o dicta) su tarea y el tutor con IA (Claude) se la explica paso a paso y le propone un ejercicio parecido. |
| **Zona de padres** | Protegida con PIN: aciertos por materia, nivel, actividad de los últimos 7 días, recomendaciones, ajuste manual del nivel y de la voz. |

Funciona en móvil, tableta y ordenador, y se puede instalar como app (PWA). Sin la IA, la app sigue funcionando con las explicaciones integradas.

## Cómo usarla

Requiere [Node.js](https://nodejs.org) 21.7 o superior.

```bash
npm install
cp .env.example .env      # y pon tu ANTHROPIC_API_KEY para activar el tutor con IA
npm start                 # abre http://localhost:3000
```

Sin clave, la app funciona igual: las operaciones y el vocabulario se explican sin conexión, y sólo las preguntas abiertas de "Ayuda con mi tarea" necesitan la IA.

Pruebas:

```bash
npm test
```

## Privacidad

- Todo el progreso se guarda **sólo en el dispositivo** (localStorage).
- Al tutor con IA se envían únicamente la pregunta, la materia, la edad y el nivel. **Nunca el nombre del niño.**
- El tutor está instruido para hablar sólo de temas escolares y apropiados para niños.

## Estructura

```
server.js          Servidor (archivos estáticos + /api/tutor)
tutor-ai.js        Conexión con Claude y formato de las explicaciones
public/
  index.html       App de una sola página
  css/styles.css   Estilos (modo claro y oscuro)
  js/app.js        Pantallas y navegación
  js/adaptive.js   Ajuste automático de nivel
  js/math.js       Problemas de matemáticas y explicaciones paso a paso
  js/reading.js    Lecturas con preguntas de comprensión
  js/english.js    Vocabulario y frases de inglés
  js/games.js      Juegos educativos
  js/rewards.js    Monedas, medallas y tienda
  js/stats.js      Estadísticas del panel de padres
  js/speech.js     Lectura en voz alta y dictado
  js/tutor.js      Cliente del tutor (IA o sin conexión)
tests/             Pruebas automáticas (node --test)
```

## Ideas para seguir

- Más lecturas y vocabulario por nivel.
- Reconocimiento de voz para practicar la pronunciación en inglés.
- Sincronizar el progreso entre dispositivos con cuentas de familia.
