// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import tailwindcss from '@tailwindcss/vite'
// import fs from "fs";
// import mkcert from 'vite-plugin-mkcert'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [
//     react(), tailwindcss(),mkcert()],
//     server: {
//       https: true,
//       host: true, // Allow access from network
//       port: 5173, // Default Vite port
//       https: {
//         key: fs.readFileSync("localhost+2-key.pem"),
//         cert: fs.readFileSync("localhost+2.pem"),
//       },
//     },

// })
import fs from "fs";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa';
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator';
import terser  from '@rollup/plugin-terser';

export default defineConfig({
//  server: {
//     proxy: {
//       "/": {
//         target: "https://oxadmedia.online", // your backend domain
//         changeOrigin: true,
//         secure: false, // if your SSL cert is self-signed in dev
//       },
//     },
//   },
  // server: {
  //   host: true, // allow access from network
  //   port: 5173, // default port
  //   https: false // remove HTTPS, use HTTP
  // },
    server: {
          https: true,
             host: true, // Allow access from network
           port: 5173, // Default Vite port
             https: {
               key: fs.readFileSync("localhost+2-key.pem"),
              cert: fs.readFileSync("localhost+2.pem"),
             },
           },
  base: '/fitoxme/', // <-- your subdirectory path

  plugins: [
    react(), tailwindcss(),  javascriptObfuscator({
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      debugProtection: true,
      stringArray: true,
      rotateStringArray: true,
    }, ['**/vendor/**']), // exclude vendor files if needed
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
    }),  
     terser({
      compress: true, // Enable compression
      mangle: true,   // Enable mangling of variable and function names
      format: {
        comments: false, // Remove all comments
      },
    }),
  ]
});

