import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MockEventSource, installMockEventSource } from '../../test/mockEventSource';
import { WebhookList } from './WebhookList';
import { webhooksApi } from '../../api/webhooks';
import type { Webhook } from '../../api/types';

vi.mock('../../api/webhooks', () => ({
  webhooksApi: {
    list: vi.fn(),
    page: vi.fn(),
    streamUrl: vi.fn((roomId: string, since?: string) =>
      since ? `/hook/${roomId}/stream?since=${encodeURIComponent(since)}` : `/hook/${roomId}/stream`
    ),
    get: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    duplicatesSummary: vi.fn(),
    duplicateGroup: vi.fn(),
    search: vi.fn(),
  },
}));

const mockedPage = vi.mocked(webhooksApi.page);
const mockedList = vi.mocked(webhooksApi.list);
const mockedRemove = vi.mocked(webhooksApi.remove);

const webhook: Webhook = {
  receiptId: 'r1',
  roomId: 'room1',
  body: { hello: 'world' },
  metadata: {
    method: 'POST',
    url: '/hook/room1',
    headers: { 'x-test': '1' },
    query: {},
    host: 'localhost',
    ip: '127.0.0.1',
  },
  timestamp: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-02T00:00:00.000Z',
};

beforeEach(() => {
  mockedPage.mockReset();
  mockedList.mockReset();
  mockedRemove.mockReset();
  installMockEventSource();
  MockEventSource.reset();
});

function makeWebhooks(count: number): Webhook[] {
  return Array.from({ length: count }, (_, i) => ({
    ...webhook,
    receiptId: `r${i + 1}`,
    timestamp: new Date(2026, 0, 1, 0, i).toISOString(),
    createdAt: new Date(2026, 0, 1, 0, i).toISOString(),
  }));
}

// Мок /hook/:id/page, реально применяющий offset/limit/order — как настоящий
// сервер, чтобы тесты пагинации/сортировки проверяли то же поведение, что и
// раньше (когда сортировка/пагинация были клиентскими), но теперь через
// параметры запроса к серверу.
function mockServerPaging(all: Webhook[]) {
  mockedPage.mockImplementation((_roomId, opts) => {
    const sorted = [...all].sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return opts.order === 'oldest' ? diff : -diff;
    });
    return Promise.resolve({
      roomId: 'room1',
      offset: opts.offset,
      limit: opts.limit,
      order: opts.order,
      total: all.length,
      webhooks: sorted.slice(opts.offset, opts.offset + opts.limit),
    });
  });
}

describe('WebhookList', () => {
  it('paginates results 25 per page and can navigate to the next page', async () => {
    mockServerPaging(makeWebhooks(30));

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);

    await screen.findByRole('button', { name: /ID: r30/i });
    expect(screen.queryByRole('button', { name: /ID: r1$/i })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /вперёд/i }));

    expect(await screen.findByRole('button', { name: /ID: r1$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ID: r30/i })).not.toBeInTheDocument();
  });

  it('sorts newest first by default and re-sorts when switched to oldest first', async () => {
    mockServerPaging(makeWebhooks(3));

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r3/i });

    const ids = screen.getAllByRole('button', { name: /^ID: r\d$/ }).map((el) => el.textContent);
    expect(ids).toEqual(['ID: r3', 'ID: r2', 'ID: r1']);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Сначала новые'), 'oldest');

    // Сортировка теперь серверная (асинхронный рефетч /hook/:id/page), а не
    // мгновенный локальный ресорт — ждём итогового порядка, а не просто
    // наличия элементов (которые изначально ещё в старом порядке).
    await waitFor(() => {
      const reordered = screen.getAllByRole('button', { name: /^ID: r\d$/ });
      expect(reordered.map((el) => el.textContent)).toEqual(['ID: r1', 'ID: r2', 'ID: r3']);
    });
  });

  it('always shows the webhook body inline, without needing to expand a row', async () => {
    mockServerPaging([webhook]);

    const { container } = renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r1/i });

    const pre = container.querySelector('pre');
    expect(pre?.textContent).toContain('"hello"');
    expect(pre?.textContent).toContain('"world"');
  });

  it('copies an individual JSON token when it is clicked (interactive body)', async () => {
    mockServerPaging([webhook]);

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /ID: r1/i });
    await user.click(screen.getByTitle('Копировать ключ'));

    await expect(navigator.clipboard.readText()).resolves.toBe('hello');
  });

  it('opens the details modal (with headers) when the ID is clicked, and closes it again', async () => {
    mockServerPaging([webhook]);

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /ID: r1/i }));

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('Подробности')).toBeInTheDocument();
    expect(within(modal).getByText('x-test')).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes a webhook when its delete button is clicked', async () => {
    mockServerPaging([webhook]);
    mockedRemove.mockResolvedValue({ status: 'ok' });

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /ID: r1/i });
    await user.click(screen.getByRole('button', { name: /удалить/i }));

    expect(mockedRemove).toHaveBeenCalledWith('room1', 'r1');
    expect(await screen.findByText('Вебхуки ещё не поступали')).toBeInTheDocument();
  });

  it('prepends a webhook pushed over SSE when viewing the newest-first first page', async () => {
    mockServerPaging(makeWebhooks(2));

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r2/i });

    const es = MockEventSource.latest();
    const pushed: Webhook = {
      ...webhook,
      receiptId: 'r3',
      timestamp: new Date(2026, 0, 1, 0, 5).toISOString(),
      createdAt: new Date(2026, 0, 1, 0, 5).toISOString(),
    };
    act(() => {
      es.emit('webhook', pushed);
    });

    expect(await screen.findByRole('button', { name: /ID: r3/i })).toBeInTheDocument();
    expect(await screen.findByText('Показано 3 из 3')).toBeInTheDocument();
  });

  it('shows a "new" nudge instead of reflowing when a webhook arrives while sorted oldest-first, and jumps to it on click', async () => {
    const dataset = [webhook];
    mockServerPaging(dataset);

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r1/i });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Сначала новые'), 'oldest');
    await screen.findByRole('button', { name: /ID: r1/i });

    const es = MockEventSource.latest();
    const pushed: Webhook = { ...webhook, receiptId: 'r2' };
    // Клик по "показать" ниже дёрнет реальный рефетч страницы — данные должны
    // быть "уже сохранены" на бэкенде к моменту SSE-события, как в реальности.
    dataset.push(pushed);
    act(() => {
      es.emit('webhook', pushed);
    });

    const nudge = await screen.findByRole('button', { name: /новые/i });
    expect(nudge).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ID: r2/i })).not.toBeInTheDocument();

    await user.click(nudge);

    expect(await screen.findByRole('button', { name: /ID: r2/i })).toBeInTheDocument();
  });

  it('removes a webhook pushed as deleted over SSE, even without a local delete action', async () => {
    mockServerPaging([webhook]);

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r1/i });

    const es = MockEventSource.latest();
    act(() => {
      es.emit('deleted', { receiptId: 'r1' });
    });

    expect(await screen.findByText('Вебхуки ещё не поступали')).toBeInTheDocument();
  });
});
