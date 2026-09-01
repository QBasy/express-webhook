import { ComingSoon } from '../../components/ComingSoon/ComingSoon';
import { useI18n } from '../../i18n/I18nContext';

export function AdminPage() {
  const { t } = useI18n();
  return <ComingSoon title={t.nav.admin} />;
}
