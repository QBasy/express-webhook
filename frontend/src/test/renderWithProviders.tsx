import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { ThemeProvider } from '../theme/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';
import { ToastProvider } from '../toast/ToastContext';

export function renderWithProviders(ui: ReactElement, initialEntries: string[] = ['/']) {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <AuthProvider>{ui}</AuthProvider>
          </MemoryRouter>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
