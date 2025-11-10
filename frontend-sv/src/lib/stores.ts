import { writable } from 'svelte/store';
import type { User, Alert } from './types';

export const currentUser = writable<User | null>(null);
export const alert = writable<Alert | null>(null);

export function showAlert(message: string, type: Alert['type'] = 'info') {
    alert.set({ message, type });
    setTimeout(() => alert.set(null), 5000);
}