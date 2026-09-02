// Лёгкий фейк EventSource для тестов — jsdom его не реализует. Хранит
// созданные инстансы в реестре, чтобы тест мог найти нужный по URL и
// сэмулировать серверные события (`webhook`/`deleted`/`cleared`) вызовом
// emit(...).
type Listener = (event: { data: string }) => void;

export class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  closed = false;
  onerror: (() => void) | null = null;
  private listeners: Record<string, Listener[]> = {};

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener): void {
    (this.listeners[type] ??= []).push(cb);
  }

  removeEventListener(type: string, cb: Listener): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l !== cb);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data?: unknown): void {
    const event = { data: data !== undefined ? JSON.stringify(data) : '' };
    (this.listeners[type] ?? []).forEach((cb) => cb(event));
  }

  static reset(): void {
    MockEventSource.instances = [];
  }

  static latest(): MockEventSource {
    const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
    if (!instance) throw new Error('No MockEventSource instance was created yet');
    return instance;
  }
}

export function installMockEventSource(): void {
  (globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;
}
