import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    resolve: {
        alias: {
            $lib: path.resolve('./src/lib'),
            $components: path.resolve('./src/lib/components'),
            $stores: path.resolve('./src/lib/stores'),
            $server: path.resolve('./src/lib/server'),
            $utils: path.resolve('./src/lib/utils'),
            $types: path.resolve('./src/lib/types')
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/auth': 'https://webhook-ga.onrender.com',
            '/room': 'https://webhook-ga.onrender.com',
            '/hook': 'https://webhook-ga.onrender.com',
            '/admin': 'https://webhook-ga.onrender.com',
            '/health': 'https://webhook-ga.onrender.com'
        }
    }
});
