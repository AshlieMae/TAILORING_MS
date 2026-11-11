import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    {
      name: 'copy-hostinger-htaccess',
      closeBundle() {
        fs.copyFileSync(
          path.resolve('public/.htaccess'),
          path.resolve('dist/.htaccess'),
        )
      },
    },
  ],
})
