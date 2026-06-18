import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' — чтобы прод-сборка грузилась по file:// внутри Electron
export default defineConfig({ plugins: [react()], base: './', server: { port: 5173 } })
