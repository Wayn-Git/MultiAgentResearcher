import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
<<<<<<< HEAD
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
=======
>>>>>>> faf9a8812d1f5627deb1fd27eae718c980e60478
})
