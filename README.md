# Tierra Desarrollos — tierra.vip

Sitio web de **Tierra Desarrollos (Grupo Tierra)**: desarrollo y construcción eco-luxury en la Costa de Oaxaca.

## Estructura

```
/
├── index.html              # Landing (hero video, manifiesto, proyectos, galería, confianza, contacto)
├── azimut.html             # Página de proyecto
├── nabani.html             # Página de proyecto
├── aldea-tao.html          # Página de proyecto
├── depas-kora.html         # Página de proyecto (preventa)
├── serena.html             # Página de proyecto (próximamente)
├── construccion.html       # Obras construidas (Yuu'Kee, Chololo) + procedimiento + testimonios
├── nosotros.html           # About Us
├── server.js               # Backend opcional (chat IA con Claude /api/chat)
├── assets/
│   ├── pages.css           # Estilos compartidos de las páginas secundarias
│   ├── pages.js            # JS compartido (nav, lightbox, scroll-reveal)
│   ├── img/<proyecto>/     # Fotos reales (webp) — fuente: D:\TIERRA FOTOS
│   └── video/hero.mp4      # Video del hero
└── _wix/                   # Scripts de build (no se publica) — convert-fotos.mjs, build-pages.mjs
```

> Las 5 páginas de proyecto se generan con `node _wix/build-pages.mjs` (editar los datos ahí, no el HTML).
> Las imágenes se optimizan a webp con `node _wix/convert-fotos.mjs`.

## Deploy

- **GitHub Pages** (deploy activo): se publica solo con cada `git push` a `main` → https://bravvess.github.io/tierra-vip/
- **Dominio**: tierra.vip (Netlify). Para que se actualice solo, conectar el repo en Netlify (Build & deploy → Link repository).
- Es un sitio estático: no requiere build. Subir los archivos a cualquier hosting estático funciona.

## Chat IA (opcional)

`server.js` expone `POST /api/chat` con un asistente de ventas (Claude). Para activarlo:

```bash
npm install
# crear .env con:  ANTHROPIC_API_KEY=sk-ant-...
npm start            # http://localhost:3000
```

El chat que se muestra en el sitio publicado es una versión simulada (sin backend); el asistente real con Claude requiere desplegar `server.js`.

## Marca

- Colores: negro `#080706`, dorado `#C9A96E`, crema `#F0EAE0`
- Tipografías: Cormorant Garamond + DM Sans
- Contacto: ventas@tierra.vip · +52 958 108 7977 · Mazunte, Oaxaca
