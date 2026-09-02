import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RoomSelector } from './RoomSelector';
import { roomsApi } from '../../api/rooms';
import { authApi } from '../../api/auth';
import { TOKEN_KEY } from '../../api/client';
import type { User } from '../../api/types';

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

const mockedMe = vi.mocked(authApi.me);
const mockedCreate = vi.mocked(roomsApi.create);
const mockedAllRooms = vi.mocked(roomsApi.allRooms);

function loginAs(role: 'admin' | 'user') {
  localStorage.setItem(TOKEN_KEY, 'test-token');
  const user: User = {
    _id: role,
    username: role,
    email: `${role}@example.com`,
    role,
    status: 'approved',
    webhookTTL: 43200,
  };
  mockedMe.mockResolvedValue(user);
}

beforeEach(() => {
  mockedMe.mockReset();
  mockedCreate.mockReset();
  mockedAllRooms.mockReset();
});

describe('RoomSelector', () => {
  it('hides the integration-room form and the all-rooms button for a regular user', async () => {
    loginAs('user');
    const onSelect = vi.fn();
    const onCreated = vi.fn();

    renderWithProviders(<RoomSelector rooms={[]} onSelect={onSelect} onCreated={onCreated} />);

    await screen.findByText('У вас пока нет ни одной комнаты');
    expect(screen.queryByText('Комната для интеграции')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /все комнаты/i })).not.toBeInTheDocument();
  });

  it('lets an admin create a numeric integration room without a username prefix', async () => {
    loginAs('admin');
    mockedCreate.mockResolvedValue({ roomId: '1101555555', webhookUrl: 'unused', webhookTTL: 43200 });
    const onSelect = vi.fn();
    const onCreated = vi.fn();

    renderWithProviders(<RoomSelector rooms={[]} onSelect={onSelect} onCreated={onCreated} />);

    const input = await screen.findByPlaceholderText('10 или 12 цифр');
    const user = userEvent.setup();
    await user.type(input, '1101555555');

    const forms = screen.getAllByRole('button', { name: /создать/i });
    await user.click(forms[forms.length - 1]);

    expect(mockedCreate).toHaveBeenCalledWith('1101555555');
    expect(onCreated).toHaveBeenCalledWith('1101555555');
  });

  it('rejects an integration room id that is not 10 or 12 digits', async () => {
    loginAs('admin');
    const onSelect = vi.fn();
    const onCreated = vi.fn();

    renderWithProviders(<RoomSelector rooms={[]} onSelect={onSelect} onCreated={onCreated} />);

    const input = await screen.findByPlaceholderText('10 или 12 цифр');
    const user = userEvent.setup();
    await user.type(input, '12345');

    const forms = screen.getAllByRole('button', { name: /создать/i });
    await user.click(forms[forms.length - 1]);

    expect(await screen.findByText('ID должен состоять из 10 или 12 цифр')).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('opens the all-rooms panel for an admin and jumps to a selected room', async () => {
    loginAs('admin');
    mockedAllRooms.mockResolvedValue({ rooms: [{ roomId: 'partner_room', webhooksCount: 4 }] });
    const onSelect = vi.fn();
    const onCreated = vi.fn();

    renderWithProviders(<RoomSelector rooms={[]} onSelect={onSelect} onCreated={onCreated} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /все комнаты/i }));
    await user.click(await screen.findByRole('button', { name: /открыть/i }));

    expect(onSelect).toHaveBeenCalledWith('partner_room');
  });
});
