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
    }
});
