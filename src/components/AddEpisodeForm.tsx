import {
  ArrowDown,
  ArrowUp,
  Info,
  Monitor,
  Smartphone,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { ComicPanel, Episode, Language, WebtoonSeries } from '../types';

interface AddEpisodeFormProps {
  lang: Language;
  seriesList: WebtoonSeries[];
  initialSeriesId: string;
  initialEpisode?: Episode | null;
  onCancel: () => void;
  onPublishEpisode: (seriesId: string, episode: Episode) => void;
  onUpdateEpisode?: (seriesId: string, episode: Episode) => void;
}

interface UploadedStripPanel {
  id: string;
  name: string;
  sizeBytes: number;
  dataUrl: string;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AddEpisodeForm({
  lang,
  seriesList,
  initialSeriesId,
  initialEpisode = null,
  onCancel,
  onPublishEpisode,
  onUpdateEpisode,
}: AddEpisodeFormProps) {
  const isEditMode = Boolean(initialEpisode);
  const [selectedSeriesId, setSelectedSeriesId] = useState(
    seriesList.some((s) => s.id === initialSeriesId)
      ? initialSeriesId
      : (seriesList[0]?.id ?? ''),
  );

  const targetSeries =
    seriesList.find((s) => s.id === selectedSeriesId) ?? seriesList[0] ?? null;
  const defaultEpNumber = targetSeries ? targetSeries.episodes.length + 1 : 1;

  const [episodeNumber, setEpisodeNumber] = useState<number>(
    initialEpisode?.number ?? defaultEpNumber,
  );
  const [episodeTitle, setEpisodeTitle] = useState(
    initialEpisode
      ? initialEpisode.title[lang] || initialEpisode.title.en || initialEpisode.title.kh
      : '',
  );
  const [thumbPreview, setThumbPreview] = useState(
    initialEpisode?.thumbnailUrl ?? '',
  );
  const [panels, setPanels] = useState<UploadedStripPanel[]>(() => {
    if (!initialEpisode) return [];
    return initialEpisode.panels
      .filter((p) => Boolean(p.imageUrl))
      .map((p, idx) => {
        const url = p.imageUrl ?? '';
        const estimatedBytes = url.startsWith('data:')
          ? Math.round((url.length * 3) / 4)
          : 0;
        return {
          id: p.id || `panel-${idx + 1}`,
          name: `Panel ${idx + 1}`,
          sizeBytes: estimatedBytes,
          dataUrl: url,
        };
      });
  });
  const [isDragging, setIsDragging] = useState(false);
  const [showProTipsDetails, setShowProTipsDetails] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pc' | 'mobile' | null>(null);
  const [creatorNote, setCreatorNote] = useState(() => {
    const cap = initialEpisode?.panels[0]?.caption;
    if (!cap) return '';
    return cap[lang] || cap.en || cap.kh || '';
  });
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const initialScheduled =
    initialEpisode && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(initialEpisode.publishedDate.en)
      ? initialEpisode.publishedDate.en
      : '';
  const [publishMode, setPublishMode] = useState<'immediately' | 'schedule'>(
    initialScheduled ? 'schedule' : 'immediately',
  );
  const [scheduledDate, setScheduledDate] = useState(initialScheduled);
  const [showScheduledInfo, setShowScheduledInfo] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const stripInputRef = useRef<HTMLInputElement | null>(null);

  const totalBytes = useMemo(
    () => panels.reduce((acc, p) => acc + p.sizeBytes, 0),
    [panels],
  );
  const totalMBLabel = (totalBytes / (1024 * 1024)).toFixed(totalBytes === 0 ? 0 : 1);

  const isValidImageFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return (
      ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
      ['jpg', 'jpeg', 'png'].includes(ext)
    );
  };

  const handleSelectThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isValidImageFile(file)) {
      setFileError(
        lang === 'kh'
          ? 'អនុញ្ញាតតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
          : 'Only JPG, JPEG, and PNG formats are allowed.',
      );
      return;
    }
    if (file.size > 500 * 1024) {
      setFileError(
        lang === 'kh'
          ? 'រូបភាពតំណាងត្រូវមានទំហំតិចជាង 500KB។'
          : 'Recommended size is 202x142px and the image must be less than 500KB.',
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFileError(null);
      setThumbPreview(dataUrl);
    } catch {
      setFileError(
        lang === 'kh' ? 'មិនអាចអានឯកសាររូបភាពបានទេ។' : 'Could not read selected thumbnail.',
      );
    }
  };

  const processStripFiles = async (files: File[]) => {
    if (files.length === 0) return;
    let runningBytes = totalBytes;
    const added: UploadedStripPanel[] = [];

    for (const file of files) {
      if (panels.length + added.length >= 100) {
        setFileError(
          lang === 'kh'
            ? 'អាចបង្ហោះបានអតិបរមា ១០០ រូបភាព។'
            : 'You can upload up to 100 images in total.',
        );
        break;
      }
      if (!isValidImageFile(file)) {
        setFileError(
          lang === 'kh'
            ? 'អនុញ្ញាតតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
            : 'Only JPG, JPEG, PNG formats are supported.',
        );
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFileError(
          lang === 'kh'
            ? `ឯកសារ "${file.name}" លើសទំហំអតិបរមា 2MB។`
            : `The maximum file size per image is 2MB ("${file.name}").`,
        );
        continue;
      }
      if (runningBytes + file.size > 50 * 1024 * 1024) {
        setFileError(
          lang === 'kh'
            ? 'ទំហំសរុបមិនអាចលើស 50MB បានទេ។'
            : 'Total upload size cannot exceed 50MB.',
        );
        break;
      }

      const dataUrl = await readFileAsDataUrl(file);
      runningBytes += file.size;
      added.push({
        id: `strip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        sizeBytes: file.size,
        dataUrl,
      });
    }

    if (added.length > 0) {
      setFileError(null);
      setPanels((prev) => [...prev, ...added].slice(0, 100));
    }
  };

  const handleSelectStripFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await processStripFiles(files);
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    await processStripFiles(files);
  };

  const handleMovePanel = (index: number, direction: -1 | 1) => {
    setPanels((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSaveDraft = () => {
    setFormError(null);
    setDraftNotice(
      lang === 'kh'
        ? 'បានរក្សាទុកព្រាងភាគនេះទុកបណ្ដោះអាសន្ន។'
        : 'Draft saved locally for this episode.',
    );
    window.setTimeout(() => setDraftNotice(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSeries) return;

    const cleanTitle = episodeTitle.trim();
    if (!cleanTitle) {
      setFormError(
        lang === 'kh' ? 'សូមបញ្ចូលចំណងជើងភាគ។' : 'Please enter the episode title.',
      );
      return;
    }

    if (publishMode === 'schedule' && !scheduledDate) {
      setFormError(
        lang === 'kh'
          ? 'សូមជ្រើសរើសកាលបរិច្ឆេទសម្រាប់ការផ្សាយពេលក្រោយ។'
          : 'Please choose a scheduled publish date and time.',
      );
      return;
    }

    setFormError(null);
    const epId = initialEpisode?.id ?? `${targetSeries.id}-ep-${Date.now()}`;
    const noteText = creatorNote.trim();
    const resolvedThumb = thumbPreview || targetSeries.coverUrl;
    const epNum = Math.max(1, Math.round(episodeNumber || defaultEpNumber));

    const builtPanels: ComicPanel[] =
      panels.length > 0
        ? panels.map((p, idx) => {
            const existingPanel = initialEpisode?.panels.find((epPanel) => epPanel.id === p.id);
            return {
              id: existingPanel?.id ?? `${epId}-p${idx + 1}`,
              imageUrl: p.dataUrl,
              sceneTheme: existingPanel?.sceneTheme ?? 'sanctuary',
              caption: idx === 0 && noteText ? { kh: noteText, en: noteText } : undefined,
              bubbles: existingPanel?.bubbles ?? [],
            };
          })
        : [
            {
              id: `${epId}-p1`,
              imageUrl: resolvedThumb,
              sceneTheme: 'sanctuary',
              caption: {
                kh: noteText || cleanTitle,
                en: noteText || cleanTitle,
              },
              bubbles: [
                {
                  id: 'b1',
                  speaker: targetSeries.author,
                  text: {
                    kh: noteText || `${cleanTitle} — ភាគទី ${epNum}`,
                    en: noteText || `${cleanTitle} — Episode ${epNum}`,
                  },
                  position: 'bottom-left',
                  variant: 'speech',
                },
              ],
            },
          ];

    const publishedLabel =
      publishMode === 'schedule' && scheduledDate
        ? { kh: scheduledDate, en: scheduledDate }
        : initialEpisode && !initialScheduled
          ? initialEpisode.publishedDate
          : { kh: 'ថ្ងៃនេះ', en: 'Today' };

    if (publishMode === 'schedule') {
      setScheduledCount((c) => c + 1);
    }

    const nextTitle = initialEpisode
      ? initialEpisode.title.kh === initialEpisode.title.en
        ? { kh: cleanTitle, en: cleanTitle }
        : { ...initialEpisode.title, [lang]: cleanTitle }
      : { kh: cleanTitle, en: cleanTitle };

    const nextEpisode: Episode = {
      id: epId,
      number: epNum,
      title: nextTitle,
      publishedDate: publishedLabel,
      likes: initialEpisode?.likes ?? 0,
      thumbnailUrl: resolvedThumb,
      panels: builtPanels,
    };

    if (isEditMode && onUpdateEpisode) {
      onUpdateEpisode(targetSeries.id, nextEpisode);
    } else {
      onPublishEpisode(targetSeries.id, nextEpisode);
    }
  };

  if (!targetSeries) {
    return null;
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Card 1: Series Title, Episode Number, Episode Title */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
              <label htmlFor="add-ep-series" className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'ចំណងជើងស៊េរីរឿង' : 'Series Title'}
              </label>
              {!isEditMode && seriesList.length > 1 ? (
                <select
                  id="add-ep-series"
                  value={targetSeries.id}
                  onChange={(e) => {
                    const next = seriesList.find((s) => s.id === e.target.value);
                    setSelectedSeriesId(e.target.value);
                    if (next) setEpisodeNumber(next.episodes.length + 1);
                  }}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                >
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.title, lang)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="add-ep-series"
                  type="text"
                  readOnly
                  value={t(targetSeries.title, lang)}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-900 focus:outline-none"
                />
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
              <label
                htmlFor="add-ep-number"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900"
              >
                <span>{lang === 'kh' ? 'លេខភាគ' : 'Episode Number'}</span>
                <Info className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              </label>
              <input
                id="add-ep-number"
                type="number"
                min={1}
                max={9999}
                value={episodeNumber}
                onChange={(e) => setEpisodeNumber(Number(e.target.value))}
                className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-center text-xs font-semibold text-zinc-900 font-mono-num focus:border-[#00DC64] focus:outline-none"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
              <label htmlFor="add-ep-title" className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'ចំណងជើងភាគ' : 'Episode Title'}
              </label>
              <div className="relative">
                <input
                  id="add-ep-title"
                  type="text"
                  maxLength={60}
                  value={episodeTitle}
                  onChange={(e) => setEpisodeTitle(e.target.value)}
                  placeholder={
                    lang === 'kh'
                      ? 'សូមបញ្ចូលចំណងជើងភាគ។'
                      : 'Please enter the episode title.'
                  }
                  className="w-full rounded-md border border-zinc-300 px-3.5 py-2 pr-16 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-[#00DC64] focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-mono-num">
                  {episodeTitle.length} / 60
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Thumbnail, Upload File, Pro Tips, Preview, Creator's Note */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
          <div className="space-y-7">
            {/* Thumbnail */}
            <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-start">
              <div className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'រូបភាពតំណាង' : 'Thumbnail'}
              </div>

              <div>
                <input
                  ref={thumbInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleSelectThumb}
                  className="sr-only"
                />

                <div className="relative flex h-36 w-52 flex-col items-center justify-center overflow-hidden rounded border border-dashed border-zinc-300 bg-zinc-100 text-center">
                  {thumbPreview ? (
                    <>
                      <img
                        src={thumbPreview}
                        alt="Episode thumbnail preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setThumbPreview('')}
                        aria-label="Remove thumbnail"
                        className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-zinc-950/75 p-1 text-white hover:bg-zinc-950"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-medium text-zinc-500 font-mono-num">
                        202x142px
                      </span>
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        className="mt-2 cursor-pointer rounded border border-zinc-300 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50"
                      >
                        {lang === 'kh' ? 'ជ្រើសរើសឯកសារ' : 'Select File'}
                      </button>
                    </>
                  )}
                </div>

                <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-zinc-500">
                  <li>
                    {lang === 'kh'
                      ? 'ទំហំដែលណែនាំគឺ 202x142px និងទំហំឯកសារតិចជាង 500KB។'
                      : 'Recommended size is 202x142px and the image must be less than 500KB.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'អនុញ្ញាតតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
                      : 'Only JPG, JPEG, and PNG formats are allowed.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'ឈ្មោះឯកសារអាចប្រើបានតែអក្សរអង់គ្លេស និងលេខប៉ុណ្ណោះ។'
                      : 'File name can only be in English letters and numbers.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'រូបភាពទំហំ 160x151px មុនឆ្នាំ 2025 នឹងបង្ហាញជា 202x142px។'
                      : 'Images uploaded in 160x151px before 2025 will be shown in 202x142px.'}
                  </li>
                </ul>
              </div>
            </div>

            {/* Upload File */}
            <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-start">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900">
                <span>{lang === 'kh' ? 'បង្ហោះឯកសារ' : 'Upload File'}</span>
                <Info className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
              </div>

              <div>
                <input
                  ref={stripInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleSelectStripFiles}
                  className="sr-only"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stripInputRef.current?.click()}
                      className="cursor-pointer rounded bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-zinc-950 whitespace-nowrap"
                    >
                      {lang === 'kh' ? 'ជ្រើសរើសឯកសារដើម្បីបង្ហោះ' : 'Select File to Upload'}
                    </button>

                    <button
                      type="button"
                      onClick={() => stripInputRef.current?.click()}
                      className="cursor-pointer rounded border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 whitespace-nowrap"
                    >
                      {lang === 'kh'
                        ? 'នាំចូលពី Clip Studio Paint'
                        : 'Import from Clip Studio Paint'}
                    </button>

                    <button
                      type="button"
                      disabled={panels.length === 0}
                      onClick={() => setPanels([])}
                      className="cursor-pointer rounded border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                    >
                      {lang === 'kh' ? 'លុបទាំងអស់' : 'Delete All'}
                    </button>
                  </div>

                  <span className="text-[11px] font-medium text-zinc-500 font-mono-num">
                    {totalMBLabel} / 50MB
                  </span>
                </div>

                {/* Drag and Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDropFiles}
                  className={`mt-2.5 min-h-48 rounded border transition-colors ${
                    isDragging
                      ? 'border-[#00DC64] bg-emerald-50/40'
                      : 'border-zinc-300 bg-white'
                  }`}
                >
                  {panels.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => stripInputRef.current?.click()}
                      className="flex h-48 w-full cursor-pointer items-center justify-center text-xs text-zinc-500 hover:text-zinc-800"
                    >
                      {lang === 'kh'
                        ? 'អូស និងទម្លាក់ឯកសាររូបភាពនៅទីនេះ'
                        : 'Drag and drop image files'}
                    </button>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {panels.map((panel, idx) => (
                        <div
                          key={panel.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 text-xs font-bold text-zinc-400 font-mono-num">
                              {idx + 1}
                            </span>
                            <img
                              src={panel.dataUrl}
                              alt={panel.name}
                              className="h-12 w-10 shrink-0 rounded border border-zinc-200 object-cover"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-zinc-900">
                                {panel.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono-num">
                                {formatBytes(panel.sizeBytes)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePanel(idx, -1)}
                              aria-label="Move up"
                              className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === panels.length - 1}
                              onClick={() => handleMovePanel(idx, 1)}
                              aria-label="Move down"
                              className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPanels((prev) => prev.filter((p) => p.id !== panel.id))
                              }
                              aria-label="Remove image"
                              className="cursor-pointer rounded p-1 text-rose-500 hover:bg-rose-50"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {fileError && (
                  <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                    {fileError}
                  </p>
                )}

                <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-zinc-500">
                  <li>
                    {lang === 'kh'
                      ? 'ប្រព័ន្ធនឹងកាត់ និងបន្ថយទំហំរូបភាពដែលលើសពី 800x1280px ដោយស្វ័យប្រវត្តិ។'
                      : 'The system will automatically slice and reduce image(s) that exceed the maximum dimensions, 800x1280px.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'រូបភាពដែលលើសទំហំអតិបរមាអាចត្រូវបានបំបែកជាផ្នែកៗ ឬកាត់បន្ថយគុណភាពដើម្បីផ្ទុករហ័ស។'
                      : 'Images that exceed the maximum dimensions may be optimized in a number of ways. They may be sliced into multiple images, the image quality may be dropped, the image dimensions may be reduced, and/or the file size and format may be changed.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'ទំហំអតិបរមាសម្រាប់រូបភាពនីមួយៗគឺ 2MB។ អ្នកអាចបង្ហោះរហូតដល់ 50MB និងសរុប 100 រូបភាព។'
                      : 'The maximum file size for all sliced, resized, and unchanged images is 2MB. You can upload up to 50MB, 100 images in total.'}
                  </li>
                  <li>
                    {lang === 'kh'
                      ? 'គាំទ្រតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
                      : 'Only JPG, JPEG, PNG formats are supported.'}
                  </li>
                </ul>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
              <div className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'គន្លឹះសំខាន់ៗ' : 'Pro Tips'}
              </div>
              <div className="text-xs leading-relaxed text-zinc-600">
                <span>
                  {lang === 'kh'
                    ? 'មិនអនុញ្ញាតខ្លឹមសារអាក្រាតកាយ ផ្លូវភេទ អំពើហិង្សាធ្ងន់ធ្ងរ ការរំលោភបំពាន ឬការរំលោភកម្មសិទ្ធិបញ្ញាឡើយ។'
                    : 'Nudity, explicit sexual content, gratuitous violence, abusive or harmful content, and any copyright or trademark infringement are not allowed.'}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => setShowProTipsDetails((prev) => !prev)}
                  className="cursor-pointer font-semibold text-blue-600 hover:underline"
                >
                  {lang === 'kh' ? 'ព័ត៌មានលម្អិត' : 'More Details'}
                </button>
                {showProTipsDetails && (
                  <div className="mt-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-600">
                    {lang === 'kh'
                      ? 'រាល់ភាគដែលបង្ហោះត្រូវជាស្នាដៃដើមរបស់អ្នកនិពន្ធ និងគោរពតាមការវាយតម្លៃកម្រិតអាយុដែលបានជ្រើសរើស។'
                      : 'Ensure all panels are original artwork, legible on 375px mobile screens, and compliant with your series Content Age Rating.'}
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'មើលជាមុន' : 'Preview'}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('pc')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-zinc-200 px-5 py-2 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-300"
                >
                  <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'kh' ? 'មើលលើ PC' : 'Preview PC'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-zinc-200 px-5 py-2 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-300"
                >
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{lang === 'kh' ? 'មើលលើទូរស័ព្ទ' : 'Preview Mobile'}</span>
                </button>
              </div>
            </div>

            {/* Creator's Note (Optional) */}
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
              <label htmlFor="add-ep-note" className="pt-2 text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'កំណត់ចំណាំអ្នកនិពន្ធ (ជម្រើស)' : "Creator's Note (Optional)"}
              </label>
              <div className="relative">
                <textarea
                  id="add-ep-note"
                  rows={4}
                  maxLength={400}
                  value={creatorNote}
                  onChange={(e) => setCreatorNote(e.target.value)}
                  placeholder={
                    lang === 'kh'
                      ? 'សរសេរសារទៅកាន់អ្នកអានរបស់អ្នក...'
                      : 'Enter a message for your readers.'
                  }
                  className="w-full rounded-md border border-zinc-300 px-3.5 py-2 pb-6 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-[#00DC64] focus:outline-none"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-zinc-400 font-mono-num">
                  {creatorNote.length} / 400
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Comments & Publish */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
          <div className="space-y-5">
            {/* Comments */}
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
              <div className="text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'មតិយោបល់' : 'Comments'}
              </div>
              <div className="flex flex-wrap items-center gap-8 text-xs text-zinc-800">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ep-comments"
                    checked={commentsEnabled}
                    onChange={() => setCommentsEnabled(true)}
                    className="h-4 w-4 accent-zinc-900"
                  />
                  <span>{lang === 'kh' ? 'បើកដំណើរការ' : 'Enable'}</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ep-comments"
                    checked={!commentsEnabled}
                    onChange={() => setCommentsEnabled(false)}
                    className="h-4 w-4 accent-zinc-900"
                  />
                  <span>{lang === 'kh' ? 'បិទ' : 'Disable'}</span>
                </label>
              </div>
            </div>

            {/* Publish */}
            <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
              <div className="pt-0.5 text-xs font-bold text-zinc-900">
                {lang === 'kh' ? 'ការផ្សាយ' : 'Publish'}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-8 text-xs text-zinc-800">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="ep-publish-mode"
                      checked={publishMode === 'immediately'}
                      onChange={() => setPublishMode('immediately')}
                      className="h-4 w-4 accent-zinc-900"
                    />
                    <span>{lang === 'kh' ? 'ផ្សាយភ្លាមៗ' : 'Immediately'}</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="ep-publish-mode"
                      checked={publishMode === 'schedule'}
                      onChange={() => setPublishMode('schedule')}
                      className="h-4 w-4 accent-zinc-900"
                    />
                    <span>{lang === 'kh' ? 'កំណត់ពេលផ្សាយ' : 'Schedule for later'}</span>
                  </label>
                </div>

                {publishMode === 'schedule' && (
                  <div>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowScheduledInfo((prev) => !prev)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <span>
                      {lang === 'kh' ? 'ពិនិត្យភាគដែលបានកំណត់ពេល' : 'Check Scheduled Episodes'}
                    </span>
                    <span className="font-bold text-[#00A84C] font-mono-num">
                      {scheduledCount}
                    </span>
                  </button>

                  {showScheduledInfo && (
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {scheduledCount === 0
                        ? lang === 'kh'
                          ? 'មិនទាន់មានភាគកំណត់ពេលផ្សាយនៅឡើយទេ។'
                          : 'You have no scheduled episodes queued right now.'
                        : lang === 'kh'
                          ? `មាន ${scheduledCount} ភាគត្រូវបានកំណត់ពេលផ្សាយ។`
                          : `${scheduledCount} episode(s) scheduled.`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700"
          >
            {formError}
          </p>
        )}

        {draftNotice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800"
          >
            {draftNotice}
          </p>
        )}

        {/* Bottom Centered Actions: Save Draft + Add Episode */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="cursor-pointer rounded bg-zinc-200 px-7 py-2.5 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-300"
          >
            {lang === 'kh' ? 'រក្សាទុកព្រាង' : 'Save Draft'}
          </button>

          <button
            type="submit"
            className={`cursor-pointer rounded px-7 py-2.5 text-xs font-bold transition-colors ${
              episodeTitle.trim().length > 0
                ? 'bg-[#00DC64] text-zinc-950 hover:bg-[#00c458]'
                : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            {isEditMode
              ? lang === 'kh'
                ? 'រក្សាទុកការផ្លាស់ប្តូរ'
                : 'Save Changes'
              : lang === 'kh'
                ? 'បន្ថែមភាគ'
                : 'Add Episode'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded border border-zinc-200 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
          </button>
        </div>
      </form>

      {/* Preview PC / Mobile Modal */}
      {previewMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Episode preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
        >
          <div
            className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 text-white shadow-2xl ${
              previewMode === 'mobile' ? 'max-w-[380px]' : 'max-w-[760px]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <span className="text-xs font-bold">
                {previewMode === 'mobile' ? 'Mobile Preview (375px)' : 'PC Preview (740px)'} —{' '}
                {episodeTitle.trim() || `${t(targetSeries.title, lang)} #${episodeNumber}`}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMode(null)}
                aria-label="Close preview"
                className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black">
              {panels.length > 0 ? (
                panels.map((p) => (
                  <img
                    key={p.id}
                    src={p.dataUrl}
                    alt={p.name}
                    className="block w-full object-cover"
                  />
                ))
              ) : (
                <div className="p-8 text-center">
                  <img
                    src={thumbPreview || targetSeries.coverUrl}
                    alt="Fallback preview"
                    className="mx-auto max-h-80 rounded object-cover"
                  />
                  <p className="mt-4 text-xs text-zinc-400">
                    {lang === 'kh'
                      ? 'សូមបង្ហោះរូបភាពភាគដើម្បីមើលផ្ទាំងបញ្ឈរពេញលេញ។'
                      : 'Upload comic strip files to preview vertical scroll panels here.'}
                  </p>
                </div>
              )}
              {creatorNote.trim() && (
                <div className="border-t border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-200">
                  <div className="font-bold text-[#00DC64]">
                    {lang === 'kh' ? 'កំណត់ចំណាំអ្នកនិពន្ធ' : "Creator's Note"}
                  </div>
                  <p className="mt-1 leading-relaxed">{creatorNote}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
