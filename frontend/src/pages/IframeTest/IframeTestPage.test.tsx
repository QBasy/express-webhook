import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import { IframeTestPage } from './IframeTestPage';

describe('IframeTestPage', () => {
  it('shows a prompt and no iframes until a room id is applied', () => {
    localStorage.clear();
    renderWithProviders(<IframeTestPage />);

    expect(screen.getByText(/введите room id/i)).toBeInTheDocument();
    expect(screen.queryAllByTitle(/preview/i)).toHaveLength(0);
  });

  it('renders a preview iframe per size, each pointing at /webhooks/:roomId', async () => {
    localStorage.clear();
    renderWithProviders(<IframeTestPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Room ID:'), '9903001001');
    await user.click(screen.getByRole('button', { name: /обновить все/i }));

    const frames = screen.getAllByTitle(/preview/i) as HTMLIFrameElement[];
    expect(frames.length).toBeGreaterThan(1);
    frames.forEach((frame) => {
      expect(frame.getAttribute('src')).toBe('/webhooks/9903001001');
    });
  });
});
