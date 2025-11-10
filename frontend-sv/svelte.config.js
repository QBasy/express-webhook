import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
        adapter: adapter(),
        env: {
            publicPrefix: 'PUBLIC_',
            // Делаем API_URL доступной на клиенте (если нужно)
            // privatePrefix: 'PRIVATE_'
        }
    }
};

export default config;
