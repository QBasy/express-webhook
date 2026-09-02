import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/renderWithProviders';
import { PublicWebhooksPage } from './PublicWebhooksPage';
import { webhooksApi } from '../../api/webhooks';
import { ApiError } from '../../api/client';
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
    sendTest: vi.fn(),
  },
}));

const mockedList = vi.mocked(webhooksApi.list);
const mockedSearch = vi.mocked(webhooksApi.search);

const webhook: Webhook = {
  receiptId: 'r1',
  roomId: '9903001001',
  body: { hello: 'world' },
  metadata: {
    method: 'POST',
    url: '/hook/9903001001',
    headers: {},
    query: {},
    host: 'localhost',
    ip: '127.0.0.1',
  },
  timestamp: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-02T00:00:00.000Z',
};

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/webhooks/:roomId" element={<PublicWebhooksPage />} />
    </Routes>,
    ['/webhooks/9903001001']
  );
}

beforeEach(() => {
  mockedList.mockReset();
  mockedSearch.mockReset();
});

describe('PublicWebhooksPage', () => {
  it('shows the full webhook list for an existing room, unauthenticated', async () => {
    mockedList.mockResolvedValue([webhook]);

    renderPage();

    expect(await screen.findByText(/9903001001/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /ID: r1/i })).toBeInTheDocument();
  });

  it('does not offer a delete button (read-only)', async () => {
    mockedList.mockResolvedValue([webhook]);

    renderPage();

    await screen.findByRole('button', { name: /ID: r1/i });
    expect(screen.queryByRole('button', { name: /удалить/i })).not.toBeInTheDocument();
  });

  it('shows the search tab and can run a search', async () => {
    mockedList.mockResolvedValue([webhook]);
    mockedSearch.mockResolvedValue({ mode: 'substring', total: 1, offset: 0, limit: 50, matches: [{ receiptId: 'r1', body: webhook.body }] });

    renderPage();
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /ID: r1/i });
    await user.click(screen.getByRole('tab', { name: 'Поиск' }));
    await user.type(screen.getByPlaceholderText('Что ищем?'), 'hello');
    await user.click(screen.getByRole('button', { name: /искать/i }));

    expect(mockedSearch).toHaveBeenCalledWith('9903001001', 'substring', 'hello');
    expect(await screen.findByText('Найдено: 1')).toBeInTheDocument();
  });

  it('shows a not-found state for a room that does not exist', async () => {
    mockedList.mockRejectedValue(new ApiError('Room not found', 404));

    renderPage();

    expect(await screen.findByText('Комната не найдена')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Вебхуки' })).not.toBeInTheDocument();
  });
});
