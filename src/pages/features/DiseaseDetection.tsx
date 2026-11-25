import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CheckCircle2, HelpCircle, Leaf, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/components/common/AppShell';
import PageHeader from '@/components/common/PageHeader';
import PageSpinner from '@/components/common/PageSpinner';
import Pager from '@/components/common/Pager';
import { EmptyState, ErrorAlert } from '@/components/common/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/lib/api';
import { MAX_UPLOAD_MB, checkImageSrc, diseaseApi, diseaseName, percent, type Candidate, type DiseaseCheck } from '@/lib/disease';
import { errorMessage } from '@/lib/errors';
import { formatDateTime } from '@/lib/format';

const PAGE = 10;

const StatusBadge: React.FC<{ status: DiseaseCheck['status'] }> = ({ status }) => {
  const { t } = useTranslation('disease');
  const styles = {
    confident: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    uncertain: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    rejected: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  }[status];
  const Icon = status === 'confident' ? CheckCircle2 : status === 'uncertain' ? HelpCircle : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
};

const CandidateDetails: React.FC<{ c: Candidate; open: boolean }> = ({ c, open }) => {
  const { t, i18n } = useTranslation('disease');
  const info = c.info;
  return (
    <details open={open} className="rounded-md border p-3 dark:border-gray-700">
      <summary className="cursor-pointer">
        <span className="font-medium">{diseaseName(c, i18n.resolvedLanguage)}</span>{' '}
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('result.match', { pct: percent(c.probability) })}</span>
      </summary>
      {info && (
        <div className="mt-2 space-y-2 text-sm">
          {i18n.resolvedLanguage !== 'en' && <p className="text-xs text-gray-500">{t('result.englishOnly')}</p>}
          <p>{info.description}</p>
          {info.pathogen && <p className="text-xs text-gray-500">{t('result.pathogen', { pathogen: info.pathogen })}</p>}
          {info.symptoms.length > 0 && (
            <div>
              <h4 className="font-medium">{t('result.symptoms')}</h4>
              <ul className="list-disc pl-5">{info.symptoms.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          {info.cultural.length > 0 && (
            <div>
              <h4 className="font-medium">{t('result.cultural')}</h4>
              <ul className="list-disc pl-5">{info.cultural.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          {info.chemical.length > 0 ? (
            <div>
              <h4 className="font-medium">{t('result.chemical')}</h4>
              <ul className="list-disc pl-5">
                {info.chemical.map((ch) => (
                  <li key={`${ch.active_ingredient}-${ch.formulation}`}>
                    {ch.active_ingredient} {ch.formulation}: {ch.dose}
                  </li>
                ))}
              </ul>
              <p className="mt-1 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">{info.chemical_note}</p>
            </div>
          ) : info.chemical_withheld ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('result.chemicalWithheld')}</p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">{info.chemical_note}</p>
          )}
          <p className="text-xs">
            {t('result.sources')}:{' '}
            {info.sources.map((s, i) => (
              <React.Fragment key={s.url}>
                {i > 0 && ', '}
                <a href={s.url} target="_blank" rel="noreferrer" className="text-green-700 underline dark:text-green-400">
                  {s.title}
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </details>
  );
};

const AskExpert: React.FC<{ check: DiseaseCheck; onDone: (c: DiseaseCheck) => void }> = ({ check, onDone }) => {
  const { t } = useTranslation('disease');
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const ask = useMutation({ mutationFn: () => diseaseApi.askExpert(check.id, note.trim()), onSuccess: onDone });
  if (check.consultation_id) {
    return (
      <p className="text-sm text-green-800 dark:text-green-300">
        {t('ask.sent')}{' '}
        <Link to={`/consultations/${check.consultation_id}`} className="underline">
          {t('ask.open')}
        </Link>
      </p>
    );
  }
  return open ? (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor={`note-${check.id}`}>
        {t('ask.note')}
      </label>
      <Textarea id={`note-${check.id}`} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
      {ask.isError && <ErrorAlert error={ask.error} />}
      <Button onClick={() => ask.mutate()} disabled={ask.isPending}>
        {ask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {t('ask.send')}
      </Button>
    </div>
  ) : (
    <Button variant={check.status === 'confident' ? 'outline' : 'default'} onClick={() => setOpen(true)}>
      {t('ask.button')}
    </Button>
  );
};

const ResultCard: React.FC<{ check: DiseaseCheck; onUpdate: (c: DiseaseCheck) => void }> = ({ check, onUpdate }) => {
  const { t } = useTranslation('disease');
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {t('result.title')} <StatusBadge status={check.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <img src={checkImageSrc(check.image_url, API_BASE_URL)} alt="" className="h-40 w-full rounded-md border object-cover sm:w-48" />
          <div className="min-w-0 flex-1 space-y-2">
            {check.reason && <p className="text-sm">{t(`reason.${check.reason}`, { defaultValue: check.reason })}</p>}
            {check.top3.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('result.possibilities')}</h3>
                {check.top3.map((c, i) => (
                  <CandidateDetails key={c.class_id} c={c} open={i === 0 && check.status === 'confident'} />
                ))}
              </div>
            )}
          </div>
        </div>
        <AskExpert check={check} onDone={onUpdate} />
      </CardContent>
    </Card>
  );
};

const DiseaseDetection: React.FC = () => {
  const { t, i18n } = useTranslation(['disease', 'common']);
  const lng = i18n.resolvedLanguage;
  const qc = useQueryClient();
  const [crop, setCrop] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseCheck | null>(null);
  const [page, setPage] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const model = useQuery({ queryKey: ['disease', 'model'], queryFn: diseaseApi.model });
  const historyQuery = { limit: PAGE, offset: page * PAGE };
  const history = useQuery({
    queryKey: ['disease', 'checks', historyQuery],
    queryFn: () => diseaseApi.history(historyQuery),
    placeholderData: keepPreviousData,
  });
  const check = useMutation({
    mutationFn: () => diseaseApi.check(file as File, crop),
    onSuccess: (data) => {
      setResult(data);
      void qc.invalidateQueries({ queryKey: ['disease', 'checks'] });
    },
  });

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f: File | undefined) => {
    setFileError(null);
    if (!f) return;
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileError(t('form.tooLarge', { mb: MAX_UPLOAD_MB }));
      return;
    }
    setFile(f);
    setResult(null);
  };

  const updated = (c: DiseaseCheck) => {
    setResult(c);
    void qc.invalidateQueries({ queryKey: ['disease', 'checks'] });
  };

  return (
    <AppShell>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {model.isLoading ? (
        <PageSpinner />
      ) : model.isError || !model.data ? (
        <ErrorAlert error={model.error} />
      ) : !model.data.available ? (
        <EmptyState icon={Leaf} title={t('unavailable')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <label className="block space-y-1 text-sm font-medium">
                  <span>{t('form.crop')}</span>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                  >
                    <option value="">{t('form.chooseCrop')}</option>
                    {model.data.crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {t(`crops.${c.id}`, { defaultValue: c.name })}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-2">
                  <span className="text-sm font-medium">{t('form.photo')}</span>
                  {preview && <img src={preview} alt="" className="h-48 w-full rounded-md border object-cover" />}
                  <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="sr-only"
                    aria-label={t('form.photo')}
                    onChange={(e) => pick(e.target.files?.[0])}
                  />
                  <Button type="button" variant="outline" onClick={() => input.current?.click()}>
                    <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                    {file ? t('form.change') : t('form.choose')}
                  </Button>
                  {fileError && <p role="alert" className="text-sm text-red-600">{fileError}</p>}
                  <p className="text-xs text-gray-500">{t('form.tips')}</p>
                </div>
                {check.isError && <ErrorAlert error={check.error} />}
                <Button className="w-full" disabled={!crop || !file || check.isPending} onClick={() => check.mutate()}>
                  {check.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {check.isPending ? t('form.checking') : t('form.submit')}
                </Button>
                <p className="text-xs text-gray-500">{t('model', { version: model.data.version })}</p>
              </CardContent>
            </Card>
            {result && <ResultCard check={result} onUpdate={updated} />}
          </div>

          <section aria-labelledby="disease-history">
            <h2 id="disease-history" className="mb-3 text-lg font-semibold">
              {t('history.title')}
            </h2>
            {history.isError ? (
              <p className="text-sm text-red-600">{errorMessage(t, history.error)}</p>
            ) : !history.data ? (
              <PageSpinner />
            ) : history.data.total === 0 ? (
              <p className="text-sm text-gray-500">{t('history.empty')}</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {history.data.items.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => setResult(h)}
                        className="flex w-full items-center gap-3 rounded-md border bg-white p-2 text-left hover:bg-green-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <img src={checkImageSrc(h.image_url, API_BASE_URL)} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {t(`crops.${h.crop}`, { defaultValue: h.crop })}
                            {h.top3[0] && h.status !== 'rejected' ? ` · ${diseaseName(h.top3[0], lng)}` : ''}
                          </span>
                          <span className="block text-xs text-gray-500">{formatDateTime(h.created_at, lng)}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <StatusBadge status={h.status} />
                          {h.consultation_id && <span className="text-xs text-green-700">{t('history.asked')}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <Pager page={page} total={history.data.total} pageSize={PAGE} onPage={setPage} />
              </>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default DiseaseDetection;
