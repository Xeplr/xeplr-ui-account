import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The standalone dev app only (dev/). Not part of what is published.
// Absolute, so it is the same folder whoever starts the server and from where
// (npm run dev, or test/phone.check.js).
export default defineConfig({
  root: fileURLToPath(new URL('./dev', import.meta.url)),
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
  server: { port: 19008 }
})
