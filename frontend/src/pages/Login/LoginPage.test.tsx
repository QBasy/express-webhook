import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { LoginPage } from './LoginPage';
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

const mockedLogin = vi.mocked(authApi.login);

beforeEach(() => {
  mockedLogin.mockReset();
});

describe('LoginPage', () => {
  it('shows a validation error when submitting an empty form', async () => {
    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText('Заполните все поля')).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('logs in with approved user and shows a success message', async () => {
    mockedLogin.mockResolvedValue({
      token: 'fake-jwt-token',
      user: {
        _id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        status: 'approved',
        webhookTTL: 43200,
      },
    });

    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Введите имя пользователя'), 'admin');
    await user.type(screen.getByPlaceholderText('Введите пароль'), 'admin');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(mockedLogin).toHaveBeenCalledWith('admin', 'admin');
    expect(await screen.findByText(/успешный вход/i)).toBeInTheDocument();
  });

  it('shows a warning for a pending account instead of redirecting', async () => {
    mockedLogin.mockResolvedValue({
      token: 'fake-jwt-token',
      user: {
        _id: '2',
        username: 'newbie',
        email: 'newbie@example.com',
        role: 'user',
        status: 'pending',
        webhookTTL: 43200,
      },
    });

    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Введите имя пользователя'), 'newbie');
    await user.type(screen.getByPlaceholderText('Введите пароль'), 'secret1');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText(/ожидает одобрения/i)).toBeInTheDocument();
  });

  it('surfaces the API error message on failed login', async () => {
    mockedLogin.mockRejectedValue(new ApiError('Неверный пароль', 401));

    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Введите имя пользователя'), 'admin');
    await user.type(screen.getByPlaceholderText('Введите пароль'), 'wrong');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    expect(await screen.findByText('Неверный пароль')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    renderWithProviders(<LoginPage />);
    const user = userEvent.setup();

    const passwordInput = screen.getByPlaceholderText('Введите пароль') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: /показать пароль/i }));
    expect(passwordInput.type).toBe('text');
  });
});
