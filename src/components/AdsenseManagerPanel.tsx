import {
  BadgeDollarSign,
  Check,
  Cloud,
  ExternalLink,
  Pause,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import {
  AdsenseConfig,
  AdsenseDisplayMode,
  AdsenseFormat,
  AdsensePlacement,
  AdsenseSizeMode,
  AdsenseUnit,
  Language,
} from '../types';
import { AdsenseAdSlot, normalizeAdsensePublisherId } from './AdsenseAdSlot';

interface AdsenseManagerPanelProps {
  lang: Language;
  adsense: AdsenseConfig;
  isVerifiedAdmin: boolean;
  syncingCloud: boolean;
  onSaveAdsense: (
    next: AdsenseConfig,
    audit?: {
      action:
        | 'ads_settings_updated'
        | 'ad_created'
        | 'ad_updated'
        | 'ad_toggled'
        | 'ad_deleted';
      targetId?: string;
      targetLabel: string;
      details?: string;
    },
  ) => Promise<void>;
}

const MAX_ADSENSE_UNITS = 10;

const FORMAT_OPTIONS: AdsenseFormat[] = ['display', 'in_feed', 'in_article', 'multiplex'];

const PLACEMENT_OPTIONS: AdsensePlacement[] = [
  'home_banner',
  'discovery_inline',
  'reader_footer',
];

const DISPLAY_MODES: AdsenseDisplayMode[] = ['backfill', 'coexist', 'primary'];

const SIZE_PRESETS: Array<{
  label: string;
  sizeMode: AdsenseSizeMode;
  width: number;
  height: number;
}> = [
  { label: 'Responsive (Auto)', sizeMode: 'responsive', width: 728, height: 90 },
  { label: '728×90 Leaderboard', sizeMode: 'fixed', width: 728, height: 90 },
  { label: '970×90 Large Banner', sizeMode: 'fixed', width: 970, height: 90 },
  { label: '300×250 Rectangle', sizeMode: 'fixed', width: 300, height: 250 },
  { label: '320×50 Mobile', sizeMode: 'fixed', width: 320, height: 50 },
  { label: '320×100 Large Mobile', sizeMode: 'fixed', width: 320, height: 100 },
  { label: '468×60 Banner', sizeMode: 'fixed', width: 468, height: 60 },
  { label: '160×600 Skyscraper', sizeMode: 'fixed', width: 160, height: 600 },
];

interface UnitDraft {
  id: string | null;
  name: string;
  slotId: string;
  format: AdsenseFormat;
  placement: AdsensePlacement;
  sizeMode: AdsenseSizeMode;
  width: number;
  height: number;
  fullWidthResponsive: boolean;
  isActive: boolean;
}

function emptyUnitDraft(): UnitDraft {
  return {
    id: null,
    name: '',
    slotId: '',
    format: 'display',
    placement: 'home_banner',
    sizeMode: 'responsive',
    width: 728,
    height: 90,
    fullWidthResponsive: true,
    isActive: true,
  };
}

function parseAdsenseSnippet(raw: string): {
  unitPatch?: Partial<UnitDraft>;
  publisherId?: string;
} | null {
  const input = raw.trim();
  if (!input) return null;

  const clientAttrMatch = input.match(/data-ad-client\s*=\s*["']([^"']+)["']/i);
  const clientQueryMatch = input.match(/client=(ca-pub-\d{10,20})/i);
  const rawPubMatch = input.match(/(ca-pub-\d{10,20}|pub-\d{10,20})/i);
  const slotMatch = input.match(/data-ad-slot\s*=\s*["']([a-zA-Z0-9_-]+)["']/i);
  const formatMatch = input.match(/data-ad-format\s*=\s*["']([^"']+)["']/i);
  const layoutMatch = input.match(/data-ad-layout\s*=\s*["']([^"']+)["']/i);
  const widthStyleMatch = input.match(/width\s*:\s*(\d{2,4})px/i);
  const heightStyleMatch = input.match(/height\s*:\s*(\d{2,4})px/i);
  const fullWidthMatch = input.match(/data-full-width-responsive\s*=\s*["'](true|false)["']/i);

  const parsedPub = normalizeAdsensePublisherId(
    clientAttrMatch?.[1] || clientQueryMatch?.[1] || rawPubMatch?.[1] || '',
  );
  const slotId = slotMatch?.[1]?.replace(/[^a-zA-Z0-9_-]/g, '') ?? '';

  if (!parsedPub && !slotId) {
    return null;
  }

  let format: AdsenseFormat = 'display';
  const rawFmt = (formatMatch?.[1] || '').toLowerCase();
  const rawLayout = (layoutMatch?.[1] || '').toLowerCase();
  if (rawFmt === 'autorelaxed') {
    format = 'multiplex';
  } else if (rawLayout === 'in-article') {
    format = 'in_article';
  } else if (rawFmt === 'fluid') {
    format = 'in_feed';
  }

  const hasFixedDimensions = Boolean(widthStyleMatch && heightStyleMatch);
  const width = widthStyleMatch ? Number(widthStyleMatch[1]) : 728;
  const height = heightStyleMatch ? Number(heightStyleMatch[1]) : 90;

  return {
    ...(parsedPub ? { publisherId: parsedPub } : {}),
    unitPatch: {
      ...(slotId ? { slotId } : {}),
      format,
      sizeMode: hasFixedDimensions ? 'fixed' : 'responsive',
      width,
      height,
      fullWidthResponsive: fullWidthMatch ? fullWidthMatch[1].toLowerCase() === 'true' : true,
      name: slotId
        ? hasFixedDimensions
          ? `AdSense ${width}×${height} (${slotId})`
          : `AdSense Slot ${slotId}`
        : undefined,
    },
  };
}

export function AdsenseManagerPanel({
  lang,
  adsense,
  isVerifiedAdmin,
  syncingCloud,
  onSaveAdsense,
}: AdsenseManagerPanelProps) {
  const [publisherInput, setPublisherInput] = useState(adsense.publisherId);
  const [publisherError, setPublisherError] = useState<string | null>(null);
  const [publisherSavedMsg, setPublisherSavedMsg] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<UnitDraft>(emptyUnitDraft);
  const [snippetInput, setSnippetInput] = useState('');
  const [parseFeedback, setParseFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setPublisherInput(adsense.publisherId);
  }, [adsense.publisherId]);

  useEffect(() => {
    if (!editorOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditorOpen(false);
        setFormError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorOpen]);

  const normalizedStoredPub = normalizeAdsensePublisherId(adsense.publisherId);

  const handleSavePublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    setPublisherError(null);
    setPublisherSavedMsg(null);
    const trimmed = publisherInput.trim();
    const normalized = trimmed ? normalizeAdsensePublisherId(trimmed) : '';
    if (trimmed && !normalized) {
      setPublisherError(t(UI_TEXT.adminPanel.adsense.publisherError, lang));
      return;
    }

    await onSaveAdsense(
      {
        ...adsense,
        publisherId: normalized,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adsense_publisher',
        targetLabel: normalized || 'Google AdSense Publisher ID Cleared',
        details: normalized ? `Publisher ID set to ${normalized}` : 'Cleared AdSense Publisher ID',
      },
    );
    setPublisherInput(normalized);
    setPublisherSavedMsg(t(UI_TEXT.adminPanel.adsense.publisherSavedToast, lang));
    window.setTimeout(() => setPublisherSavedMsg(null), 3000);
  };

  const handleToggleEnabled = async () => {
    const nextEnabled = !adsense.enabled;
    await onSaveAdsense(
      {
        ...adsense,
        enabled: nextEnabled,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adsense',
        targetLabel: 'Google AdSense Network',
        details: nextEnabled ? 'Enabled Google AdSense' : 'Disabled Google AdSense',
      },
    );
  };

  const handleToggleAutoAds = async () => {
    const nextAuto = !adsense.autoAdsEnabled;
    await onSaveAdsense(
      {
        ...adsense,
        autoAdsEnabled: nextAuto,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adsense_auto_ads',
        targetLabel: 'Google AdSense Auto Ads',
        details: nextAuto ? 'Enabled AdSense Auto Ads' : 'Disabled AdSense Auto Ads',
      },
    );
  };

  const handleChangeDisplayMode = async (mode: AdsenseDisplayMode) => {
    if (mode === adsense.displayMode) return;
    await onSaveAdsense(
      {
        ...adsense,
        displayMode: mode,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adsense_mode',
        targetLabel: 'Google AdSense Delivery Mode',
        details: `Mode: ${mode}`,
      },
    );
  };

  const openCreateModal = () => {
    setDraft(emptyUnitDraft());
    setSnippetInput('');
    setParseFeedback(null);
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditModal = (unit: AdsenseUnit) => {
    setDraft({
      id: unit.id,
      name: unit.name,
      slotId: unit.slotId,
      format: unit.format,
      placement: unit.placement,
      sizeMode: unit.sizeMode,
      width: unit.width || 728,
      height: unit.height || 90,
      fullWidthResponsive: unit.fullWidthResponsive,
      isActive: unit.isActive,
    });
    setSnippetInput('');
    setParseFeedback(null);
    setFormError(null);
    setEditorOpen(true);
  };

  const applySnippetParse = (rawText: string) => {
    const parsed = parseAdsenseSnippet(rawText);
    if (!parsed) {
      setParseFeedback({
        type: 'error',
        text: t(UI_TEXT.adminPanel.adsense.parsedWarning, lang),
      });
      return;
    }
    if (parsed.publisherId && !publisherInput.trim()) {
      setPublisherInput(parsed.publisherId);
    }
    if (parsed.unitPatch) {
      setDraft((prev) => ({
        ...prev,
        ...parsed.unitPatch,
        name: prev.name.trim() ? prev.name : parsed.unitPatch?.name || prev.name,
      }));
    }
    setParseFeedback({
      type: 'success',
      text: t(UI_TEXT.adminPanel.adsense.parsedSuccess, lang),
    });
    setFormError(null);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draft.name.trim().slice(0, 80);
    const cleanSlotId = draft.slotId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);

    if (!cleanName || !cleanSlotId) {
      setFormError(t(UI_TEXT.adminPanel.adsense.validationError, lang));
      return;
    }

    if (!draft.id && adsense.units.length >= MAX_ADSENSE_UNITS) {
      setFormError(`Maximum limit of ${MAX_ADSENSE_UNITS} AdSense ad slots reached.`);
      return;
    }

    // If user parsed a publisherId while editing the slot and hasn't saved publisherId yet, persist it too
    const candidatePub = normalizeAdsensePublisherId(publisherInput);
    const nextPublisherId = normalizedStoredPub || candidatePub;

    const isEditing = Boolean(draft.id);
    const unitId = draft.id || `adsense_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextUnit: AdsenseUnit = {
      id: unitId,
      name: cleanName,
      slotId: cleanSlotId,
      format: draft.format,
      placement: draft.placement,
      sizeMode: draft.sizeMode,
      width: Math.max(120, Math.min(2000, Math.round(draft.width || 728))),
      height: Math.max(50, Math.min(2000, Math.round(draft.height || 90))),
      fullWidthResponsive: draft.fullWidthResponsive,
      isActive: draft.isActive,
      updatedAtMs: Math.round(Date.now()),
    };

    const nextUnits = isEditing
      ? adsense.units.map((u) => (u.id === unitId ? nextUnit : u))
      : [...adsense.units, nextUnit];

    await onSaveAdsense(
      {
        ...adsense,
        publisherId: nextPublisherId,
        units: nextUnits,
      },
      {
        action: isEditing ? 'ad_updated' : 'ad_created',
        targetId: unitId,
        targetLabel: `AdSense · ${cleanName}`,
        details: `Slot ${cleanSlotId} · ${
          nextUnit.sizeMode === 'fixed' ? `${nextUnit.width}x${nextUnit.height}` : 'Responsive'
        } · ${nextUnit.placement}`,
      },
    );

    setEditorOpen(false);
    setDraft(emptyUnitDraft());
    setFormError(null);
  };

  const handleToggleUnitActive = async (unit: AdsenseUnit) => {
    const nextActive = !unit.isActive;
    const nextUnits = adsense.units.map((u) =>
      u.id === unit.id ? { ...u, isActive: nextActive, updatedAtMs: Math.round(Date.now()) } : u,
    );
    await onSaveAdsense(
      {
        ...adsense,
        units: nextUnits,
      },
      {
        action: 'ad_toggled',
        targetId: unit.id,
        targetLabel: `AdSense · ${unit.name}`,
        details: nextActive ? 'Activated AdSense slot' : 'Paused AdSense slot',
      },
    );
  };

  const handleDeleteUnit = async (unit: AdsenseUnit) => {
    const nextUnits = adsense.units.filter((u) => u.id !== unit.id);
    await onSaveAdsense(
      {
        ...adsense,
        units: nextUnits,
      },
      {
        action: 'ad_deleted',
        targetId: unit.id,
        targetLabel: `AdSense · ${unit.name}`,
        details: `Slot ${unit.slotId} · ${unit.placement}`,
      },
    );
    setConfirmDeleteId(null);
  };

  const previewUnit: AdsenseUnit = {
    id: draft.id ?? 'preview_adsense',
    name: draft.name.trim() || 'AdSense Ad Slot',
    slotId: draft.slotId.trim() || '1234567890',
    format: draft.format,
    placement: draft.placement,
    sizeMode: draft.sizeMode,
    width: draft.width,
    height: draft.height,
    fullWidthResponsive: draft.fullWidthResponsive,
    isActive: draft.isActive,
    updatedAtMs: Math.round(Date.now()),
  };

  return (
    <div className="space-y-6">
      {/* Google AdSense Publisher Configuration Card */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="h-4 w-4 shrink-0 text-[#00A84C]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-zinc-950">
                {t(UI_TEXT.adminPanel.adsense.sectionTitle, lang)}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adsense.sectionSub, lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://adsense.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
            >
              <span>{t(UI_TEXT.adminPanel.adsense.openDashboardBtn, lang)}</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            </a>

            <button
              type="button"
              disabled={adsense.units.length >= MAX_ADSENSE_UNITS}
              onClick={openCreateModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.adsense.addUnitBtn, lang)}</span>
            </button>
          </div>
        </div>

        {/* Enable Switch */}
        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4">
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-950">
              {t(UI_TEXT.adminPanel.adsense.enableToggleTitle, lang)}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {t(UI_TEXT.adminPanel.adsense.enableToggleDesc, lang)}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={adsense.enabled}
            disabled={syncingCloud}
            onClick={() => void handleToggleEnabled()}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              adsense.enabled ? 'bg-[#00DC64]' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                adsense.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Publisher ID Form + Auto Ads Toggle */}
        <form
          onSubmit={(e) => void handleSavePublisher(e)}
          className="border-t border-zinc-100 pt-4 space-y-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {t(UI_TEXT.adminPanel.adsense.publisherIdLabel, lang)}
              </label>
              <input
                type="text"
                maxLength={40}
                value={publisherInput}
                onChange={(e) => {
                  setPublisherInput(e.target.value);
                  setPublisherError(null);
                }}
                placeholder="ca-pub-1234567890123456"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                {t(UI_TEXT.adminPanel.adsense.publisherIdHint, lang)}
              </p>
            </div>

            <button
              type="submit"
              disabled={syncingCloud}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap shrink-0 sm:mb-5"
            >
              {isVerifiedAdmin && <Cloud className="h-3.5 w-3.5" aria-hidden="true" />}
              <span>{t(UI_TEXT.adminPanel.adsense.savePublisherBtn, lang)}</span>
            </button>
          </div>

          {publisherError && (
            <p role="alert" className="text-xs font-medium text-rose-700">
              {publisherError}
            </p>
          )}
          {publisherSavedMsg && (
            <p role="status" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{publisherSavedMsg}</span>
            </p>
          )}

          <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs font-semibold text-zinc-800">
            <input
              type="checkbox"
              disabled={syncingCloud}
              checked={adsense.autoAdsEnabled}
              onChange={() => void handleToggleAutoAds()}
              className="h-4 w-4 accent-[#00DC64]"
            />
            <span>{t(UI_TEXT.adminPanel.adsense.autoAdsLabel, lang)}</span>
          </label>
        </form>

        {adsense.enabled && !normalizedStoredPub && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900">
            {t(UI_TEXT.adminPanel.adsense.missingPublisherNotice, lang)}
          </div>
        )}

        {/* Priority / Delivery Mode Selector */}
        <div className="border-t border-zinc-100 pt-4">
          <span className="mb-2 block text-xs font-semibold text-zinc-700">
            {t(UI_TEXT.adminPanel.adsense.displayModeLabel, lang)}
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            {DISPLAY_MODES.map((mode) => {
              const selected = adsense.displayMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={syncingCloud}
                  aria-pressed={selected}
                  onClick={() => void handleChangeDisplayMode(mode)}
                  className={`flex cursor-pointer flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition-all ${
                    selected
                      ? 'border-[#00DC64] bg-emerald-50/40 ring-2 ring-[#00DC64]/20'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-950">
                      {t(UI_TEXT.adminPanel.adsense.displayModes[mode].title, lang)}
                    </span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#00A84C]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    {t(UI_TEXT.adminPanel.adsense.displayModes[mode].desc, lang)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Configured AdSense Slots List */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        {adsense.units.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-zinc-900">
              {t(UI_TEXT.adminPanel.adsense.emptyTitle, lang)}
            </p>
            <p className="mx-auto mt-1.5 max-w-lg text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adsense.emptyHint, lang)}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.adsense.addUnitBtn, lang)}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {adsense.units.map((unit) => {
              const confirmingDelete = confirmDeleteId === unit.id;
              const sizeLabel =
                unit.sizeMode === 'fixed'
                  ? `${unit.width}×${unit.height} px`
                  : t(UI_TEXT.adminPanel.adsense.sizeModes.responsive, lang);

              return (
                <div
                  key={unit.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-zinc-950">{unit.name}</span>
                      <span aria-hidden="true" className="text-zinc-300">·</span>
                      <span
                        className={`font-semibold ${
                          unit.isActive ? 'text-emerald-700' : 'text-zinc-500'
                        }`}
                      >
                        {unit.isActive
                          ? t(UI_TEXT.adminPanel.adsManager.statusActive, lang)
                          : t(UI_TEXT.adminPanel.adsManager.statusPaused, lang)}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">·</span>
                      <span className="text-[11px] font-medium text-zinc-600">
                        {t(UI_TEXT.adminPanel.adsense.formats[unit.format], lang)}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">·</span>
                      <span className="text-[11px] font-medium text-zinc-500">
                        {t(UI_TEXT.adminPanel.adsense.placements[unit.placement], lang)}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[11px] text-zinc-500 font-mono-num">
                      slot: {unit.slotId} · {sizeLabel}
                      {normalizedStoredPub ? ` · ${normalizedStoredPub}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {confirmingDelete ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-rose-700">
                          {t(UI_TEXT.adminPanel.confirmDeleteLabel, lang)}
                        </span>
                        <button
                          type="button"
                          disabled={syncingCloud}
                          onClick={() => void handleDeleteUnit(unit)}
                          className="cursor-pointer rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                        >
                          {t(UI_TEXT.adminPanel.confirmYes, lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="cursor-pointer rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          {t(UI_TEXT.adminPanel.confirmNo, lang)}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={syncingCloud}
                          onClick={() => void handleToggleUnitActive(unit)}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                            unit.isActive
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {unit.isActive ? (
                            <>
                              <Pause className="h-3 w-3" aria-hidden="true" />
                              <span>{t(UI_TEXT.adminPanel.adsManager.pauseBtn, lang)}</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" aria-hidden="true" />
                              <span>{t(UI_TEXT.adminPanel.adsManager.activateBtn, lang)}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(unit)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          <span>{t(UI_TEXT.adminPanel.actionEdit, lang)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(unit.id)}
                          aria-label={t(UI_TEXT.adminPanel.actionDelete, lang)}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit AdSense Slot Modal */}
      {editorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            draft.id
              ? t(UI_TEXT.adminPanel.adsense.editUnitHeading, lang)
              : t(UI_TEXT.adminPanel.adsense.createUnitHeading, lang)
          }
          onClick={() => {
            setEditorOpen(false);
            setFormError(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950">
                  {draft.id
                    ? t(UI_TEXT.adminPanel.adsense.editUnitHeading, lang)
                    : t(UI_TEXT.adminPanel.adsense.createUnitHeading, lang)}
                </h2>
                <a
                  href="https://adsense.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00A84C] hover:underline"
                >
                  <span>adsense.google.com</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false);
                  setFormError(null);
                }}
                aria-label={t(UI_TEXT.adminPanel.adsManager.cancelEditBtn, lang)}
                className="cursor-pointer rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveUnit(e)} className="space-y-4">
              {/* Auto-Parse AdSense <ins> Snippet */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-zinc-800">
                    {t(UI_TEXT.adminPanel.adsense.pasteSnippetLabel, lang)}
                  </label>
                  <button
                    type="button"
                    onClick={() => applySnippetParse(snippetInput)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3 text-[#00A84C]" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.adsense.parseBtn, lang)}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={snippetInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSnippetInput(val);
                    if (val.trim().length > 16) {
                      const auto = parseAdsenseSnippet(val);
                      if (auto) {
                        if (auto.publisherId && !publisherInput.trim()) {
                          setPublisherInput(auto.publisherId);
                        }
                        if (auto.unitPatch) {
                          setDraft((prev) => ({
                            ...prev,
                            ...auto.unitPatch,
                            name: prev.name.trim() ? prev.name : auto.unitPatch?.name || prev.name,
                          }));
                        }
                        setParseFeedback({
                          type: 'success',
                          text: t(UI_TEXT.adminPanel.adsense.parsedSuccess, lang),
                        });
                      }
                    }
                  }}
                  placeholder={t(UI_TEXT.adminPanel.adsense.pasteSnippetPlaceholder, lang)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 font-mono-num focus:border-[#00DC64] focus:outline-none"
                />
                {parseFeedback && (
                  <p
                    className={`text-[11px] font-semibold ${
                      parseFeedback.type === 'success' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {parseFeedback.text}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsense.unitNameLabel, lang)}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Home Top Leaderboard"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsense.slotIdLabel, lang)}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={draft.slotId}
                    onChange={(e) => setDraft((prev) => ({ ...prev, slotId: e.target.value }))}
                    placeholder="1234567890"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsense.placementLabel, lang)}
                  </label>
                  <select
                    value={draft.placement}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        placement: e.target.value as AdsensePlacement,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    {PLACEMENT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {t(UI_TEXT.adminPanel.adsense.placements[p], lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsense.formatLabel, lang)}
                  </label>
                  <select
                    value={draft.format}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        format: e.target.value as AdsenseFormat,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    {FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {t(UI_TEXT.adminPanel.adsense.formats[fmt], lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slot Size Configuration */}
              <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                <span className="block text-xs font-semibold text-zinc-700">
                  {t(UI_TEXT.adminPanel.adsense.sizeModeLabel, lang)}
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {(['responsive', 'fixed'] as AdsenseSizeMode[]).map((mode) => {
                    const active = draft.sizeMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setDraft((prev) => ({ ...prev, sizeMode: mode }))}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-[#00DC64] bg-emerald-50/50 text-zinc-950'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        <span>{t(UI_TEXT.adminPanel.adsense.sizeModes[mode], lang)}</span>
                        {active && <Check className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-semibold text-zinc-500">
                    {t(UI_TEXT.adminPanel.adsense.sizePresetsLabel, lang)}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SIZE_PRESETS.map((preset) => {
                      const isMatch =
                        preset.sizeMode === 'responsive'
                          ? draft.sizeMode === 'responsive'
                          : draft.sizeMode === 'fixed' &&
                            draft.width === preset.width &&
                            draft.height === preset.height;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              sizeMode: preset.sizeMode,
                              width: preset.width,
                              height: preset.height,
                            }))
                          }
                          className={`cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            isMatch
                              ? 'border-zinc-950 bg-zinc-950 text-white'
                              : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {draft.sizeMode === 'fixed' ? (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-zinc-700">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        min={120}
                        max={2000}
                        value={draft.width}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            width: Number(e.target.value) || 728,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-zinc-700">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        min={50}
                        max={2000}
                        value={draft.height}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            height: Number(e.target.value) || 90,
                          }))
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      checked={draft.fullWidthResponsive}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, fullWidthResponsive: e.target.checked }))
                      }
                      className="h-4 w-4 accent-[#00DC64]"
                    />
                    <span>{t(UI_TEXT.adminPanel.adsense.fullWidthLabel, lang)}</span>
                  </label>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-[#00DC64]"
                />
                <span>{t(UI_TEXT.adminPanel.adsense.activeLabel, lang)}</span>
              </label>

              {/* Safe Preview Summary */}
              <div className="space-y-1.5 border-t border-zinc-100 pt-3">
                <span className="text-[11px] font-semibold text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.livePreviewLabel, lang)}
                </span>
                <AdsenseAdSlot
                  unit={previewUnit}
                  publisherId={publisherInput || normalizedStoredPub}
                  lang={lang}
                  previewMode
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setFormError(null);
                  }}
                  className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {t(UI_TEXT.adminPanel.adsManager.cancelEditBtn, lang)}
                </button>
                <button
                  type="submit"
                  disabled={syncingCloud}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:opacity-50 whitespace-nowrap"
                >
                  {isVerifiedAdmin && <Cloud className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{t(UI_TEXT.adminPanel.adsense.saveUnitBtn, lang)}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
