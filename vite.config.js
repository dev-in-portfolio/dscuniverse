import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        recognition: resolve(process.cwd(), 'recognition.html'),
        supplierProfile: resolve(process.cwd(), 'supplier-profile.html'),
        restaurantConsulting: resolve(process.cwd(), 'restaurant-consulting.html'),
        thoughtExperiment: resolve(process.cwd(), 'thought-experiment.html'),
        thoughtExperimentCounter: resolve(process.cwd(), 'thought-experement-counter.html'),
      },
    },
  },
});
