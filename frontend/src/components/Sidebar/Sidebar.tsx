import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, CaretDoubleLeft, CaretDoubleRight, Faders, Flask, House, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher';
import styles from './Sidebar.module.scss';

const STORAGE_KEY = 'ui_sidebar_collapsed';

export function Sidebar() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const isAdmin = user?.role === 'admin';

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  const navItem = (to: string, label: string, Icon: typeof House) => (
    <NavLink to={to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
      <Icon size={20} weight="regular" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <NavLink to="/" className={styles.brand}>
        <BrandMark />
        {!collapsed && (
          <div>
            <strong>Webhook Viewer</strong>
            <span>GREEN-API QA TEAM</span>
          </div>
        )}
      </NavLink>

      <nav className={styles.nav}>
        {navItem('/', t.nav.room, House)}
        {navItem('/docs', t.nav.docs, BookOpen)}
        {isAdmin && navItem('/tester', t.nav.tester, Flask)}
        {isAdmin && navItem('/json-compare', t.nav.jsonCompare, Faders)}
        {isAdmin && navItem('/admin', t.nav.admin, ShieldCheck)}
      </nav>

      <div className={styles.footer}>
        {!collapsed && <LanguageSwitcher />}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="100" height="100" rx="16" fill="#3B9702" />
      <text x="50" y="68" fontFamily="Arial, sans-serif" fontSize="56" fontWeight="bold" fill="white" textAnchor="middle">
        G
      </text>
    </svg>
  );
}
