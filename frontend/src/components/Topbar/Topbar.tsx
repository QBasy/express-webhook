import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './Topbar.module.scss';

export function Topbar() {
  const { user, logout } = useAuth();
  const { t } = useI18n();

  function handleLogout() {
    if (window.confirm(t.nav.logoutConfirm)) {
      logout();
    }
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.spacer} />
      <div className={styles.actions}>
        {user ? (
          <>
            <span className={styles.email}>{user.email || user.username}</span>
            <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
              {t.nav.logout}
            </button>
          </>
        ) : (
          <NavLink to="/login" className={styles.loginLink}>
            {t.nav.login}
          </NavLink>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
