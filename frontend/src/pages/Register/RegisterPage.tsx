import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Envelope, Eye, EyeSlash, Lock, User, UserPlus } from '@phosphor-icons/react';
import { authApi } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { Alert, type AlertType } from '../../components/Alert/Alert';
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher/LanguageSwitcher';
import styles from '../Login/LoginPage.module.scss';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const REDIRECT_DELAY_MS = 3000;

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tr = t.auth.register;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  function validate(): string | null {
    if (password !== confirmPassword) return tr.passwordMismatch;
    if (password.length < 6) return tr.passwordTooShort;
    if (!USERNAME_PATTERN.test(username)) return tr.usernameInvalid;
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAlert(null);

    const validationError = validate();
    if (validationError) {
      setAlert({ type: 'error', message: validationError });
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.register(username.trim(), email.trim(), password, reason.trim() || undefined);
      setAlert({ type: 'success', message: tr.successMessage });
      setTimeout(() => navigate('/login', { replace: true }), REDIRECT_DELAY_MS);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : tr.genericError;
      setAlert({ type: 'error', message });
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
          <h1>{tr.title}</h1>
          <p className={styles.subtitle}>{tr.subtitle}</p>
        </div>

        {alert && <Alert type={alert.type} message={alert.message} />}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>
              <User size={16} /> {tr.username}
            </span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={tr.usernamePlaceholder} />
          </label>

          <label className={styles.field}>
            <span>
              <Envelope size={16} /> {tr.email}
            </span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>

          <label className={styles.field}>
            <span>
              <Lock size={16} /> {tr.password}
            </span>
            <div className={styles.passwordRow}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tr.passwordPlaceholder}
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

          <label className={styles.field}>
            <span>
              <Lock size={16} /> {tr.confirmPassword}
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>{tr.reason}</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr.reasonPlaceholder} />
          </label>

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
            <UserPlus size={18} />
            <span>{isSubmitting ? tr.submitting : tr.submit}</span>
          </button>
        </form>

        <p className={styles.registerHint}>
          {tr.haveAccount} <Link to="/login">{tr.loginLink}</Link>
        </p>
      </div>
    </div>
  );
}
