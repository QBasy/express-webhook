import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeSlash, Lock, SignIn, User } from '@phosphor-icons/react';
import { useAuth } from '../../auth/AuthContext';
import { ApiError } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { Alert, type AlertType } from '../../components/Alert/Alert';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher/LanguageSwitcher';
import styles from './LoginPage.module.scss';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  useEffect(() => {
    if (user && user.status === 'approved') {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from;
      navigate(from?.pathname ?? '/', { replace: true });
    }
  }, [user, location.state, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAlert(null);

    if (!username.trim() || !password) {
      setAlert({ type: 'error', message: t.auth.login.fillAllFields });
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login(username.trim(), password);

      if (loggedInUser.status === 'pending') {
        setAlert({ type: 'warning', message: t.auth.login.pendingApproval });
        return;
      }
      if (loggedInUser.status === 'rejected') {
        setAlert({ type: 'error', message: t.auth.login.rejected });
        return;
      }

      setAlert({ type: 'success', message: t.auth.login.successRedirect });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t.auth.login.genericError;
      setAlert({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.topControls}>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <BrandMark />
          <h1>{t.auth.login.title}</h1>
          <p className={styles.tagline}>{t.auth.login.tagline}</p>
          <p className={styles.subtitle}>{t.auth.login.subtitle}</p>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} />}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>
              <User size={16} /> {t.auth.login.username}
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.auth.login.usernamePlaceholder}
              autoComplete="username"
            />
          </label>

          <label className={styles.field}>
            <span>
              <Lock size={16} /> {t.auth.login.password}
            </span>
            <div className={styles.passwordRow}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.login.passwordPlaceholder}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            <SignIn size={18} />
            <span>{isSubmitting ? t.auth.login.submitting : t.auth.login.submit}</span>
          </button>
        </form>

        <p className={styles.registerHint}>
          {t.auth.login.noAccount} <Link to="/register">{t.auth.login.registerLink}</Link>
        </p>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="100" height="100" rx="12" fill="#3B9702" />
      <text x="50" y="70" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle">
        G
      </text>
    </svg>
  );
}
