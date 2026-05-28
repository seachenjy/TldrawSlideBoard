import { resolve } from 'node:path'
import { cpSync, mkdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

function copyBackgroundPlugin(): Plugin {
  return {
    name: 'copy-background',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist')
      mkdirSync(outDir, { recursive: true })
      cpSync(resolve(__dirname, 'src/background/main.ts'), resolve(outDir, 'background.js'))
    },
  }
}

export default defineConfig({
  plugins: [vue(), copyBackgroundPlugin()],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  build: {
    rollupOptions: {
      input: {
        sidepanel: resolve(__dirname, 'sidepanel.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
})
