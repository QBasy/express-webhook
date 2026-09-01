import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { WebhookList } from './WebhookList';
import { webhooksApi } from '../../api/webhooks';
import type { Webhook } from '../../api/types';

vi.mock('../../api/webhooks', () => ({
  webhooksApi: {
    list: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    duplicatesSummary: vi.fn(),
    duplicateGroup: vi.fn(),
    search: vi.fn(),
  },
}));

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
  mockedList.mockReset();
  mockedRemove.mockReset();
});

describe('WebhookList', () => {
  it('always shows the webhook body inline, without needing to expand a row', async () => {
    mockedList.mockResolvedValue([webhook]);

    const { container } = renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    await screen.findByRole('button', { name: /ID: r1/i });

    const pre = container.querySelector('pre');
    expect(pre?.textContent).toContain('"hello"');
    expect(pre?.textContent).toContain('"world"');
  });

  it('copies an individual JSON token when it is clicked (interactive body)', async () => {
    mockedList.mockResolvedValue([webhook]);

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /ID: r1/i });
    await user.click(screen.getByTitle('Копировать ключ'));

    await expect(navigator.clipboard.readText()).resolves.toBe('hello');
  });

  it('opens the details modal (with headers) when the ID is clicked, and closes it again', async () => {
    mockedList.mockResolvedValue([webhook]);

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
    mockedList.mockResolvedValue([webhook]);
    mockedRemove.mockResolvedValue({ status: 'ok' });

    renderWithProviders(<WebhookList roomId="room1" reloadKey={0} />);
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /ID: r1/i });
    await user.click(screen.getByRole('button', { name: /удалить/i }));

    expect(mockedRemove).toHaveBeenCalledWith('room1', 'r1');
    expect(await screen.findByText('Вебхуки ещё не поступали')).toBeInTheDocument();
  });
});
