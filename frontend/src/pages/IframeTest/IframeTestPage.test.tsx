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

  it('renders a preview iframe per size, each pointing at /webhooks/:roomId with SSE off by default', async () => {
    localStorage.clear();
    renderWithProviders(<IframeTestPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Room ID:'), '9903001001');
    await user.click(screen.getByRole('button', { name: /обновить все/i }));

    const frames = screen.getAllByTitle(/preview/i) as HTMLIFrameElement[];
    expect(frames.length).toBeGreaterThan(1);
    // Ни один превью не живой по умолчанию — иначе N одновременных SSE на
    // один origin упрутся в лимит браузера на конкурентные соединения (см.
    // useWebhookFeed/PublicWebhooksPage: ?live=0 отключает EventSource).
    frames.forEach((frame) => {
      expect(frame.getAttribute('src')).toBe('/webhooks/9903001001?live=0');
    });
  });

  it('makes exactly one preview live at a time when "Сделать живым" is clicked', async () => {
    localStorage.clear();
    renderWithProviders(<IframeTestPage />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Room ID:'), '9903001001');
    await user.click(screen.getByRole('button', { name: /обновить все/i }));

    const makeLiveButtons = screen.getAllByRole('button', { name: /сделать живым/i });
    await user.click(makeLiveButtons[0]);

    const frames = screen.getAllByTitle(/preview/i) as HTMLIFrameElement[];
    const liveFrames = frames.filter((frame) => frame.getAttribute('src')?.includes('live=1'));
    expect(liveFrames).toHaveLength(1);

    // Переключение на другой превью гасит предыдущий, а не добавляет второй живой.
    const remainingButtons = screen.getAllByRole('button', { name: /сделать живым/i });
    await user.click(remainingButtons[0]);

    const framesAfter = screen.getAllByTitle(/preview/i) as HTMLIFrameElement[];
    const liveFramesAfter = framesAfter.filter((frame) => frame.getAttribute('src')?.includes('live=1'));
    expect(liveFramesAfter).toHaveLength(1);
  });
});
