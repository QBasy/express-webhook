import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RegisterPage } from './RegisterPage';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';

vi.mock('../../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    register: vi.fn(),
    updateTTL: vi.fn(),
  },
}));

const mockedRegister = vi.mocked(authApi.register);

beforeEach(() => {
  mockedRegister.mockReset();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('только латиница, цифры, _'), 'newuser');
  await user.type(screen.getByPlaceholderText('you@example.com'), 'newuser@example.com');
  await user.type(screen.getByPlaceholderText('минимум 6 символов'), 'secret1');
  await user.type(screen.getByLabelText(/повторите пароль/i), 'secret1');
  await user.type(screen.getByPlaceholderText('зачем вам webhook viewer'), 'QA testing');
}

describe('RegisterPage', () => {
  it('rejects mismatched passwords before calling the API', async () => {
    renderWithProviders(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('только латиница, цифры, _'), 'newuser');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'newuser@example.com');
    await user.type(screen.getByPlaceholderText('минимум 6 символов'), 'secret1');
    await user.type(screen.getByLabelText(/повторите пароль/i), 'different');

    await user.click(screen.getByRole('button', { name: /отправить заявку/i }));

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('rejects a username with invalid characters', async () => {
    renderWithProviders(<RegisterPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('только латиница, цифры, _'), 'invalid user!');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'a@example.com');
    await user.type(screen.getByPlaceholderText('минимум 6 символов'), 'secret1');
    await user.type(screen.getByLabelText(/повторите пароль/i), 'secret1');

    await user.click(screen.getByRole('button', { name: /отправить заявку/i }));

    expect(await screen.findByText(/латиницу, цифры и _/)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('submits a valid registration', async () => {
    mockedRegister.mockResolvedValue({ message: 'ok', userId: 'u1' });

    renderWithProviders(<RegisterPage />);
    const user = userEvent.setup();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /отправить заявку/i }));

    expect(mockedRegister).toHaveBeenCalledWith('newuser', 'newuser@example.com', 'secret1', 'QA testing');
    expect(await screen.findByText(/заявка успешно отправлена/i)).toBeInTheDocument();
  });

  it('shows the API error message when registration fails', async () => {
    mockedRegister.mockRejectedValue(new ApiError('Username already taken', 400));

    renderWithProviders(<RegisterPage />);
    const user = userEvent.setup();
    await fillValidForm(user);

    await user.click(screen.getByRole('button', { name: /отправить заявку/i }));

    expect(await screen.findByText('Username already taken')).toBeInTheDocument();
  });
});
