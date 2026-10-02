import {defineConfig} from 'vite';
export default defineConfig({base:'./',optimizeDeps:{noDiscovery:true,include:[]},build:{rollupOptions:{output:{manualChunks:{three:['three','three/addons/controls/OrbitControls.js']}}}}});
