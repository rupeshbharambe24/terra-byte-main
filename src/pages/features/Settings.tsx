import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import FieldsCard from '@/components/farm/FieldsCard';
import LocationButton from '@/components/farm/LocationButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { LANGUAGE_NAMES, LANGUAGES } from '@/i18n/resources';
import { accountApi } from '@/lib/api';
import { MAHARASHTRA_DISTRICTS } from '@/lib/constants';
import { errorMessage } from '@/lib/errors';
import { isInIndia, parseOptionalNumber, roundCoord } from '@/lib/farm';
import type { Language, MeUpdate, User } from '@/lib/types';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';

const OTHER = '__other__';
const NONE = '__none__';
const KNOWN_DISTRICTS: readonly string[] = MAHARASHTRA_DISTRICTS;

interface ProfileForm {
  name: string;
  email: string;
  state: string;
  districtChoice: string;
  districtOther: string;
  village: string;
  organization: string;
  lat: string;
  lon: string;
}

function profileFrom(user: User): ProfileForm {
  const district = user.district ?? '';
  const known = KNOWN_DISTRICTS.includes(district);
  return {
    name: user.name,
    email: user.email ?? '',
    state: user.state ?? 'Maharashtra',
    districtChoice: !district ? NONE : known ? district : OTHER,
    districtOther: known ? '' : district,
    village: user.village ?? '',
    organization: user.organization ?? '',
    lat: user.lat === null ? '' : String(user.lat),
    lon: user.lon === null ? '' : String(user.lon),
  };
}

const ProfileCard: React.FC<{ user: User }> = ({ user }) => {
  const { t } = useTranslation(['farm', 'common']);
  const { updateProfile, setLanguage } = useAuth();
  const [form, setForm] = useState<ProfileForm>(() => profileFrom(user));
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data: MeUpdate) => updateProfile(data),
    onSuccess: (updated) => {
      setForm(profileFrom(updated));
      toast.success(t('settings.profile.saved'));
    },
    onError: (err) => setError(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.name.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return setError(t('settings.profile.nameInvalid'));
    const lat = parseOptionalNumber(form.lat);
    const lon = parseOptionalNumber(form.lon);
    if ((lat === null) !== (lon === null) || (lat !== null && lon !== null && !isInIndia(lat, lon))) {
      return setError(t('location.invalid'));
    }
    const district =
      form.districtChoice === OTHER ? form.districtOther.trim() : form.districtChoice === NONE ? '' : form.districtChoice;
    const data: MeUpdate = {
      name,
      email: form.email.trim() || null,
      state: form.state.trim() || null,
      district: district || null,
      village: form.village.trim() || null,
      lat: lat === null ? null : roundCoord(lat),
      lon: lon === null ? null : roundCoord(lon),
    };
    if (user.role !== 'farmer') data.organization = form.organization.trim() || null;
    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.profile.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 max-w-xs space-y-2">
          <Label htmlFor="settings-language">{t('settings.profile.language')}</Label>
          <Select value={user.preferred_language} onValueChange={(v) => void setLanguage(v as Language)}>
            <SelectTrigger id="settings-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {LANGUAGE_NAMES[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">{t('settings.profile.languageHint')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-name">{t('settings.profile.name')}</Label>
              <Input id="settings-name" value={form.name} maxLength={120} onChange={set('name')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-phone">{t('settings.profile.phone')}</Label>
              <Input id="settings-phone" value={user.phone} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-email">{t('settings.profile.email')}</Label>
              <Input id="settings-email" type="email" value={form.email} maxLength={254} onChange={set('email')} />
            </div>
            {user.role !== 'farmer' && (
              <div className="space-y-2">
                <Label htmlFor="settings-org">{t('settings.profile.organization')}</Label>
                <Input id="settings-org" value={form.organization} maxLength={160} onChange={set('organization')} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="settings-state">{t('settings.profile.state')}</Label>
              <Input id="settings-state" value={form.state} maxLength={80} onChange={set('state')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-district">{t('settings.profile.district')}</Label>
              <Select value={form.districtChoice} onValueChange={(v) => setForm((f) => ({ ...f, districtChoice: v }))}>
                <SelectTrigger id="settings-district">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t('settings.profile.districtNone')}</SelectItem>
                  {MAHARASHTRA_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>{t('settings.profile.districtOther')}</SelectItem>
                </SelectContent>
              </Select>
              {form.districtChoice === OTHER && (
                <Input
                  aria-label={t('settings.profile.districtOtherLabel')}
                  placeholder={t('settings.profile.districtOtherLabel')}
                  value={form.districtOther}
                  maxLength={80}
                  onChange={set('districtOther')}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-village">{t('settings.profile.village')}</Label>
              <Input id="settings-village" value={form.village} maxLength={120} onChange={set('village')} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('location.title')}</legend>
            <p className="text-xs text-gray-500">{t('settings.profile.locationHint')}</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              <Input
                aria-label={t('location.lat')}
                placeholder={t('location.lat')}
                inputMode="decimal"
                value={form.lat}
                onChange={set('lat')}
              />
              <Input
                aria-label={t('location.lon')}
                placeholder={t('location.lon')}
                inputMode="decimal"
                value={form.lon}
                onChange={set('lon')}
              />
            </div>
            <LocationButton
              onLocate={({ lat, lon }) => setForm((f) => ({ ...f, lat: String(lat), lon: String(lon) }))}
            />
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={mutation.isPending}>
            {mutation.isPending ? t('common:actions.saving') : t('settings.profile.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const PasswordCard: React.FC = () => {
  const { t } = useTranslation(['farm', 'common']);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => accountApi.changePassword(current, next),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success(t('settings.password.saved'));
    },
    onError: (err) => setError(errorMessage(t, err)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) return setError(t('settings.password.currentRequired'));
    if (next.length < MIN_PASSWORD_LENGTH) return setError(t('settings.password.tooShort', { min: MIN_PASSWORD_LENGTH }));
    if (next !== confirm) return setError(t('settings.password.mismatch'));
    mutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.password.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4 max-w-md" noValidate>
          <div className="space-y-2">
            <Label htmlFor="pw-current">{t('settings.password.current')}</Label>
            <Input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-new">{t('settings.password.new')}</Label>
            <Input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="text-xs text-gray-500">{t('settings.password.tooShort', { min: MIN_PASSWORD_LENGTH })}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-confirm">{t('settings.password.confirm')}</Label>
            <Input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline" disabled={mutation.isPending}>
            {mutation.isPending ? t('common:actions.saving') : t('settings.password.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const Settings: React.FC = () => {
  const { t } = useTranslation(['farm', 'common']);
  const { user } = useAuth();
  return (
    <AppShell>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      {user && (
        <div className="space-y-6 max-w-4xl">
          <ProfileCard key={user.id} user={user} />
          {user.role === 'farmer' && <FieldsCard />}
          <PasswordCard />
        </div>
      )}
    </AppShell>
  );
};

export default Settings;
