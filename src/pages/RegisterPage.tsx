import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/common/Header';
import { ApiError } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { SELF_REGISTER_ROLES, type Language, type RegisterPayload, type User } from '@/lib/types';
import { MIN_PASSWORD_LENGTH, isValidIndianMobile, normalizePhone } from '@/lib/validation';
import { LANGUAGES, LANGUAGE_NAMES, type AppLanguage } from '@/i18n/resources';
import { getDashboardRoute } from '@/utils/routeUtils';

type RegisterRole = RegisterPayload['role'];

const inputClass =
  'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

const RegisterPage: React.FC = () => {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const initialLanguage = (LANGUAGES as readonly string[]).includes(i18n.resolvedLanguage ?? '')
    ? (i18n.resolvedLanguage as AppLanguage)
    : 'en';

  const [form, setForm] = useState({
    role: 'farmer' as RegisterRole,
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    qualifications: '',
    state: 'Maharashtra',
    district: '',
    village: '',
    preferred_language: initialLanguage as Language,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  if (user && !submitting) return <Navigate to={getDashboardRoute(user.role)} replace />;

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidIndianMobile(form.phone)) return setError(t('register.invalidPhone'));
    if (form.password.length < MIN_PASSWORD_LENGTH) return setError(t('register.passwordTooShort'));
    if (form.password !== form.confirmPassword) return setError(t('register.passwordMismatch'));

    const payload: RegisterPayload = {
      role: form.role,
      name: form.name.trim(),
      phone: normalizePhone(form.phone),
      password: form.password,
      preferred_language: form.preferred_language,
      state: form.state.trim() || undefined,
      district: form.district.trim() || undefined,
      village: form.village.trim() || undefined,
      email: form.email.trim() || undefined,
      organization: form.role !== 'farmer' ? form.organization.trim() || undefined : undefined,
      qualifications: form.role === 'expert' ? form.qualifications.trim() || undefined : undefined,
    };

    setSubmitting(true);
    try {
      const res = await register(payload);
      if (res.requires_approval) {
        setPendingUser(res.user);
        setSubmitting(false);
      } else {
        navigate(getDashboardRoute(res.user.role), { replace: true });
      }
    } catch (err) {
      const fieldMsg = err instanceof ApiError && err.fieldErrors.length > 0
        ? ` (${err.fieldErrors.map((f) => f.field).join(', ')})`
        : '';
      setError(errorMessage(t, err) + fieldMsg);
      setSubmitting(false);
    }
  };

  if (pendingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center" role="status">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 mb-4" aria-hidden="true" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('pending.title')}</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('pending.body', { name: pendingUser.name, role: t(`common:roles.${pendingUser.role}`) })}
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/login" className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold">
                {t('pending.login')}
              </Link>
              <Link to="/" className="text-green-700 dark:text-green-400 hover:underline">
                {t('pending.home')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const needsApproval = form.role !== 'farmer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Header />
      <div className="flex items-center justify-center py-8 sm:py-12 px-4">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('register.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">{t('register.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <fieldset>
              <legend className={labelClass}>{t('register.roleLabel')}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SELF_REGISTER_ROLES.map((role) => (
                  <label
                    key={role}
                    className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                      form.role === role
                        ? 'border-green-600 bg-green-50 dark:bg-green-900/40'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={form.role === role}
                      onChange={() => setForm((prev) => ({ ...prev, role }))}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-gray-900 dark:text-white">{t(`common:roles.${role}`)}</span>
                    <span className="block text-gray-600 dark:text-gray-300 mt-1">{t(`register.roleHelp.${role}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClass}>{t('register.name')}</label>
                <input id="name" type="text" autoComplete="name" value={form.name} onChange={set('name')}
                  className={inputClass} placeholder={t('register.namePlaceholder')} required minLength={2} />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>{t('register.phone')}</label>
                <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone}
                  onChange={set('phone')} className={inputClass} placeholder={t('register.phonePlaceholder')}
                  aria-describedby="phone-help" required />
                <p id="phone-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('register.phoneHelp')}</p>
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClass}>{t('register.email')}</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')}
                className={inputClass} placeholder={t('register.emailPlaceholder')} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className={labelClass}>{t('register.password')}</label>
                <input id="password" type="password" autoComplete="new-password" value={form.password}
                  onChange={set('password')} className={inputClass} aria-describedby="password-help"
                  minLength={MIN_PASSWORD_LENGTH} required />
                <p id="password-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('register.passwordHelp')}</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>{t('register.confirmPassword')}</label>
                <input id="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword}
                  onChange={set('confirmPassword')} className={inputClass} minLength={MIN_PASSWORD_LENGTH} required />
              </div>
            </div>

            {form.role !== 'farmer' && (
              <div>
                <label htmlFor="organization" className={labelClass}>{t(`register.organization.${form.role}`)}</label>
                <input id="organization" type="text" value={form.organization} onChange={set('organization')}
                  className={inputClass} required />
              </div>
            )}

            {form.role === 'expert' && (
              <div>
                <label htmlFor="qualifications" className={labelClass}>{t('register.qualifications')}</label>
                <textarea id="qualifications" rows={3} value={form.qualifications} onChange={set('qualifications')}
                  className={inputClass} placeholder={t('register.qualificationsPlaceholder')} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className={labelClass}>{t('register.state')}</label>
                <input id="state" type="text" value={form.state} onChange={set('state')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="district" className={labelClass}>{t('register.district')}</label>
                <input id="district" type="text" value={form.district} onChange={set('district')}
                  className={inputClass} placeholder={t('register.districtPlaceholder')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="village" className={labelClass}>{t('register.village')}</label>
                <input id="village" type="text" value={form.village} onChange={set('village')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="preferred_language" className={labelClass}>{t('register.language')}</label>
                <select id="preferred_language" value={form.preferred_language} onChange={set('preferred_language')}
                  className={inputClass}>
                  {LANGUAGES.map((lng) => (
                    <option key={lng} value={lng} lang={lng}>{LANGUAGE_NAMES[lng]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg text-sm ${
                needsApproval
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                  : 'bg-green-50 text-green-800 dark:bg-green-900/50 dark:text-green-200'
              }`}
            >
              {needsApproval ? t('register.approvalNote') : t('register.farmerNote')}
            </div>

            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              {submitting ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {t('register.haveAccount')}{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold">{t('register.loginLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
