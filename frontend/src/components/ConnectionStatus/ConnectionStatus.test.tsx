import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ConnectionStatus } from './ConnectionStatus';

describe('ConnectionStatus', () => {
  it('shows the online state', () => {
    renderWithProviders(<ConnectionStatus isOnline reconnectAttempts={0} />);
    expect(screen.getByText('Подключено')).toBeInTheDocument();
  });

  it('shows a reconnecting state with the attempt count', () => {
    renderWithProviders(<ConnectionStatus isOnline={false} reconnectAttempts={3} />);
    expect(screen.getByText('Переподключение... (3)')).toBeInTheDocument();
  });

  it('shows the offline state before any reconnect attempt has been made', () => {
    renderWithProviders(<ConnectionStatus isOnline={false} reconnectAttempts={0} />);
    expect(screen.getByText('Нет соединения')).toBeInTheDocument();
  });
});
