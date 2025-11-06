type Locale = 'ru' | 'en';

interface Translations {
	[key: string]: {
		ru: string;
		en: string;
	};
}

const translations: Translations = {
	// Navbar
	'nav.home': { ru: 'Главная', en: 'Home' },
	'nav.tester': { ru: 'API Тестер', en: 'API Tester' },
	'nav.docs': { ru: 'Документация', en: 'Documentation' },
	'nav.admin': { ru: 'Админ панель', en: 'Admin Panel' },
	'nav.logout': { ru: 'Выйти', en: 'Logout' },
	'nav.login': { ru: 'Войти', en: 'Login' },
	'nav.register': { ru: 'Регистрация', en: 'Register' },
	
	// Auth
	'auth.username': { ru: 'Имя пользователя', en: 'Username' },
	'auth.email': { ru: 'Email', en: 'Email' },
	'auth.password': { ru: 'Пароль', en: 'Password' },
	'auth.confirmPassword': { ru: 'Подтвердите пароль', en: 'Confirm Password' },
	'auth.loginButton': { ru: 'Войти', en: 'Login' },
	'auth.registerButton': { ru: 'Зарегистрироваться', en: 'Register' },
	'auth.noAccount': { ru: 'Нет аккаунта?', en: "Don't have an account?" },
	'auth.hasAccount': { ru: 'Уже есть аккаунт?', en: 'Already have an account?' },
	'auth.loginTitle': { ru: 'Войдите в свой аккаунт', en: 'Login to your account' },
	'auth.registerTitle': { ru: 'Создайте аккаунт', en: 'Create an account' },
	'auth.reason': { ru: 'Причина регистрации', en: 'Reason for registration' },
	'auth.reasonPlaceholder': { ru: 'Почему вам нужен доступ?', en: 'Why do you need access?' },
	'auth.pendingApproval': { ru: 'Ожидание одобрения администратором', en: 'Pending admin approval' },
	
	// Webhooks
	'webhooks.title': { ru: 'Просмотр Webhooks', en: 'View Webhooks' },
	'webhooks.roomPlaceholder': { ru: 'Введите Room ID...', en: 'Enter Room ID...' },
	'webhooks.load': { ru: 'Загрузить', en: 'Load' },
	'webhooks.loading': { ru: 'Загрузка...', en: 'Loading...' },
	'webhooks.empty': { ru: 'Нет webhooks', en: 'No webhooks' },
	'webhooks.delete': { ru: 'Удалить', en: 'Delete' },
	'webhooks.deleteAll': { ru: 'Удалить все webhooks', en: 'Delete all webhooks' },
	'webhooks.room': { ru: 'Комната', en: 'Room' },
	'webhooks.count': { ru: 'Webhooks', en: 'Webhooks' },
	'webhooks.method': { ru: 'Метод', en: 'Method' },
	'webhooks.body': { ru: 'Тело запроса', en: 'Body' },
	'webhooks.headers': { ru: 'Заголовки', en: 'Headers' },
	'webhooks.ip': { ru: 'IP адрес', en: 'IP Address' },
	
	// Admin
	'admin.title': { ru: 'Управление пользователями', en: 'User Management' },
	'admin.pending': { ru: 'Ожидают', en: 'Pending' },
	'admin.approved': { ru: 'Одобрены', en: 'Approved' },
	'admin.rejected': { ru: 'Отклонены', en: 'Rejected' },
	'admin.approve': { ru: 'Одобрить', en: 'Approve' },
	'admin.reject': { ru: 'Отклонить', en: 'Reject' },
	'admin.deleteUser': { ru: 'Удалить', en: 'Delete' },
	'admin.role': { ru: 'Роль', en: 'Role' },
	'admin.status': { ru: 'Статус', en: 'Status' },
	'admin.created': { ru: 'Создан', en: 'Created' },
	
	// Tester
	'tester.title': { ru: 'API Тестер', en: 'API Tester' },
	'tester.url': { ru: 'URL', en: 'URL' },
	'tester.method': { ru: 'Метод', en: 'Method' },
	'tester.headers': { ru: 'Заголовки', en: 'Headers' },
	'tester.body': { ru: 'Тело запроса', en: 'Body' },
	'tester.send': { ru: 'Отправить', en: 'Send' },
	'tester.response': { ru: 'Ответ', en: 'Response' },
	'tester.status': { ru: 'Статус', en: 'Status' },
	
	// Docs
	'docs.title': { ru: 'Документация API', en: 'API Documentation' },
	'docs.endpoints': { ru: 'Эндпоинты', en: 'Endpoints' },
	'docs.authentication': { ru: 'Аутентификация', en: 'Authentication' },
	'docs.examples': { ru: 'Примеры', en: 'Examples' },
	
	// Common
	'common.save': { ru: 'Сохранить', en: 'Save' },
	'common.cancel': { ru: 'Отмена', en: 'Cancel' },
	'common.close': { ru: 'Закрыть', en: 'Close' },
	'common.search': { ru: 'Поиск', en: 'Search' },
	'common.filter': { ru: 'Фильтр', en: 'Filter' },
	'common.export': { ru: 'Экспорт', en: 'Export' },
	'common.import': { ru: 'Импорт', en: 'Import' },
	'common.settings': { ru: 'Настройки', en: 'Settings' },
	'common.language': { ru: 'Язык', en: 'Language' },
	'common.error': { ru: 'Ошибка', en: 'Error' },
	'common.success': { ru: 'Успешно', en: 'Success' },
	'common.confirm': { ru: 'Подтвердить', en: 'Confirm' },
	'common.user': { ru: 'Пользователь', en: 'User' },
	'common.admin': { ru: 'Администратор', en: 'Administrator' },
};

class I18nState {
	locale = $state<Locale>('ru');
	
	setLocale(newLocale: Locale) {
		this.locale = newLocale;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('locale', newLocale);
		}
	}
	
	t(key: string): string {
		return translations[key]?.[this.locale] || key;
	}
	
	loadFromStorage() {
		if (typeof localStorage === 'undefined') return;
		
		const saved = localStorage.getItem('locale') as Locale;
		if (saved === 'ru' || saved === 'en') {
			this.locale = saved;
		}
	}
	
	toggleLocale() {
		this.setLocale(this.locale === 'ru' ? 'en' : 'ru');
	}
}

export const i18n = new I18nState();
