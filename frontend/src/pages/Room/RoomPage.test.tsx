import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { installMockEventSource, MockEventSource } from '../../test/mockEventSource';
import { RoomPage } from './RoomPage';
import { roomsApi } from '../../api/rooms';
import { webhooksApi } from '../../api/webhooks';
import { authApi } from '../../api/auth';
import { TOKEN_KEY } from '../../api/client';
import type { Room, User } from '../../api/types';

vi.mock('../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    updateTTL: vi.fn(),
  },
}));

vi.mock('../../api/rooms', () => ({
  roomsApi: {
    create: vi.fn(),
    myRooms: vi.fn(),
    allRooms: vi.fn(),
    close: vi.fn(),
    getFakeError: vi.fn(),
    setFakeError: vi.fn(),
    getForwarding: vi.fn(),
    setForwarding: vi.fn(),
  },
}));

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
    sendTest: vi.fn(),
  },
}));

const mockedMyRooms = vi.mocked(roomsApi.myRooms);
const mockedCreate = vi.mocked(roomsApi.create);
const mockedClose = vi.mocked(roomsApi.close);
const mockedList = vi.mocked(webhooksApi.list);
const mockedPage = vi.mocked(webhooksApi.page);
const mockedSendTest = vi.mocked(webhooksApi.sendTest);
const mockedDuplicatesSummary = vi.mocked(webhooksApi.duplicatesSummary);
const mockedMe = vi.mocked(authApi.me);
const mockedGetFakeError = vi.mocked(roomsApi.getFakeError);
const mockedGetForwarding = vi.mocked(roomsApi.getForwarding);

function loginAs(role: 'admin' | 'user') {
  localStorage.setItem(TOKEN_KEY, 'test-token');
  const loggedInUser: User = {
    _id: role,
    username: role,
    email: `${role}@example.com`,
    role,
    status: 'approved',
    webhookTTL: 43200,
  };
  mockedMe.mockResolvedValue(loggedInUser);
}

const room: Room = {
  roomId: 'test_room_1',
  userId: 'u1',
  webhookTTL: 43200,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActivityAt: '2026-01-01T00:00:00.000Z',
};

function stubRoomStats() {
  mockedList.mockResolvedValue([]);
  mockedPage.mockResolvedValue({
    roomId: room.roomId,
    offset: 0,
    limit: 25,
    order: 'newest',
    total: 0,
    webhooks: [],
  });
  mockedDuplicatesSummary.mockResolvedValue({
    roomId: room.roomId,
    page: 1,
    totalPages: 1,
    totalGroups: 0,
    totalDuplicateWebhooks: 0,
    totalWebhooks: 0,
    groups: [],
  });
  mockedGetForwarding.mockResolvedValue({ roomId: room.roomId, enabled: false, url: null });
}

beforeEach(() => {
  mockedMyRooms.mockReset();
  mockedCreate.mockReset();
  mockedClose.mockReset();
  mockedList.mockReset();
  mockedPage.mockReset();
  mockedSendTest.mockReset();
  mockedDuplicatesSummary.mockReset();
  mockedGetForwarding.mockReset();
  mockedMe.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  installMockEventSource();
  MockEventSource.reset();
});

describe('RoomPage', () => {
  it('shows the empty state when the user has no rooms', async () => {
    mockedMyRooms.mockResolvedValue({ rooms: [] });

    renderWithProviders(<RoomPage />);

    expect(await screen.findByText('У вас пока нет ни одной комнаты')).toBeInTheDocument();
  });

  it('opens an existing room and shows its webhook URL', async () => {
    mockedMyRooms.mockResolvedValue({ rooms: [room] });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('test_room_1'));

    expect(await screen.findByText('Webhook URL')).toBeInTheDocument();
    expect(screen.getByText(`/hook/${room.roomId}`, { exact: false })).toBeInTheDocument();
  });

  it('creates a new room and switches to its detail view', async () => {
    mockedMyRooms.mockResolvedValueOnce({ rooms: [] }).mockResolvedValueOnce({ rooms: [room] });
    mockedCreate.mockResolvedValue({ roomId: room.roomId, webhookUrl: 'unused', webhookTTL: room.webhookTTL });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await screen.findByText('У вас пока нет ни одной комнаты');
    await user.type(screen.getByPlaceholderText('идентификатор комнаты'), 'room_1');
    await user.click(screen.getByRole('button', { name: /создать/i }));

    expect(mockedCreate).toHaveBeenCalled();
    expect(await screen.findByText('Webhook URL')).toBeInTheDocument();
  });

  it('closes a room and returns to the selector', async () => {
    mockedMyRooms.mockResolvedValue({ rooms: [room] });
    mockedClose.mockResolvedValue({ message: 'ok', roomId: room.roomId });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('test_room_1'));
    await screen.findByText('Webhook URL');

    await user.click(screen.getByRole('button', { name: /закрыть комнату/i }));

    expect(mockedClose).toHaveBeenCalledWith(room.roomId);
    expect(await screen.findByText('У вас пока нет ни одной комнаты')).toBeInTheDocument();
  });

  it('hides the duplicates tab and stat for a regular user', async () => {
    loginAs('user');
    mockedMyRooms.mockResolvedValue({ rooms: [room] });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('test_room_1'));
    await screen.findByText('Webhook URL');

    expect(screen.queryByRole('tab', { name: 'Дубли' })).not.toBeInTheDocument();
    expect(mockedDuplicatesSummary).not.toHaveBeenCalled();
  });

  it('shows the duplicates tab for an admin', async () => {
    loginAs('admin');
    mockedMyRooms.mockResolvedValue({ rooms: [room] });
    mockedGetFakeError.mockResolvedValue({ roomId: room.roomId, enabled: false, statusCode: null });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('test_room_1'));
    await screen.findByText('Webhook URL');

    expect(await screen.findByRole('tab', { name: 'Дубли' })).toBeInTheDocument();
  });

  it('sends a test webhook and shows a confirmation toast', async () => {
    mockedMyRooms.mockResolvedValue({ rooms: [room] });
    mockedSendTest.mockResolvedValue({ status: 'ok' });
    stubRoomStats();

    renderWithProviders(<RoomPage />);
    const user = userEvent.setup();

    await user.click(await screen.findByText('test_room_1'));
    await screen.findByText('Webhook URL');

    await user.click(screen.getByRole('button', { name: /отправить тест/i }));

    expect(mockedSendTest).toHaveBeenCalledWith(room.roomId);
    expect(await screen.findByText('Тестовый вебхук отправлен')).toBeInTheDocument();
  });
});