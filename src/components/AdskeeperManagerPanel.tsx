import {
  Check,
  Cloud,
  ExternalLink,
  Layers,
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
  AdskeeperConfig,
  AdskeeperDisplayMode,
  AdskeeperFormat,
  AdskeeperPlacement,
  AdskeeperUnit,
  Language,
} from '../types';
import { AdskeeperAdSlot } from './AdskeeperAdSlot';
import { normalizeHttpsUrl } from './AdsterraAdSlot';

interface AdskeeperManagerPanelProps {
  lang: Language;
  adskeeper: AdskeeperConfig;
  isVerifiedAdmin: boolean;
  syncingCloud: boolean;
  onSaveAdskeeper: (
    next: AdskeeperConfig,
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

const MAX_ADSKEEPER_UNITS = 10;

const FORMAT_OPTIONS: AdskeeperFormat[] = [
  'native_widget',
  'under_article',
  'in_feed_banner',
  'smart_widget',
  'direct_link',
];

const PLACEMENT_OPTIONS: AdskeeperPlacement[] = [
  'home_banner',
  'discovery_inline',
  'reader_footer',
  'global_script',
];

const DISPLAY_MODES: AdskeeperDisplayMode[] = ['backfill', 'coexist', 'primary'];

interface UnitDraft {
  id: string | null;
  name: string;
  format: AdskeeperFormat;
  placement: AdskeeperPlacement;
  scriptSrc: string;
  widgetId: string;
  rootId: string;
  directUrl: string;
  isActive: boolean;
}

function emptyUnitDraft(): UnitDraft {
  return {
    id: null,
    name: '',
    format: 'native_widget',
    placement: 'discovery_inline',
    scriptSrc: '',
    widgetId: '',
    rootId: '',
    directUrl: '',
    isActive: true,
  };
}

function parseAdskeeperSnippet(raw: string): Partial<UnitDraft> | null {
  const input = raw.trim();
  if (!input) return null;

  const srcMatch = input.match(/src\s*=\s*["']([^"']+)["']/i);
  const widgetIdAttrMatch = input.match(/data-widget-id\s*=\s*["']([a-zA-Z0-9_-]+)["']/i);
  const rootIdMatch = input.match(/id\s*=\s*["'](M\d+ScriptRootC\d+)["']/i);
  const plainUrlMatch = !srcMatch ? input.match(/https?:\/\/[^\s"'<>]+/i) : null;

  const normalizedSrc = srcMatch ? normalizeHttpsUrl(srcMatch[1]) : '';
  const normalizedDirect = plainUrlMatch ? normalizeHttpsUrl(plainUrlMatch[0]) : '';

  const derivedFromRoot = rootIdMatch?.[1]?.match(/C(\d+)$/)?.[1] ?? '';
  const derivedFromSrc = normalizedSrc.match(/\.(\d{5,9})\.js/i)?.[1] ?? '';
  const widgetId = widgetIdAttrMatch?.[1] || derivedFromRoot || derivedFromSrc;
  const rootId = rootIdMatch?.[1] ?? '';

  if (!normalizedSrc && !normalizedDirect && !widgetId && !rootId) {
    return null;
  }

  if (widgetId || rootId) {
    return {
      format: 'native_widget',
      placement: 'discovery_inline',
      scriptSrc: normalizedSrc,
      widgetId,
      rootId,
      name: widgetId ? `AdsKeeper Widget #${widgetId}` : `AdsKeeper ${rootId}`,
    };
  }

  if (normalizedSrc) {
    return {
      format: 'smart_widget',
      placement: 'global_script',
      scriptSrc: normalizedSrc,
      name: 'AdsKeeper Smart Script',
    };
  }

  if (normalizedDirect) {
    return {
      format: 'direct_link',
      placement: 'discovery_inline',
      directUrl: normalizedDirect,
      name: 'AdsKeeper Direct Offer',
    };
  }

  return null;
}

export function AdskeeperManagerPanel({
  lang,
  adskeeper,
  isVerifiedAdmin,
  syncingCloud,
  onSaveAdskeeper,
}: AdskeeperManagerPanelProps) {
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

  const handleToggleEnabled = async () => {
    const nextEnabled = !adskeeper.enabled;
    await onSaveAdskeeper(
      {
        ...adskeeper,
        enabled: nextEnabled,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adskeeper',
        targetLabel: 'AdsKeeper Network',
        details: nextEnabled ? 'Enabled AdsKeeper widgets' : 'Disabled AdsKeeper widgets',
      },
    );
  };

  const handleChangeDisplayMode = async (mode: AdskeeperDisplayMode) => {
    if (mode === adskeeper.displayMode) return;
    await onSaveAdskeeper(
      {
        ...adskeeper,
        displayMode: mode,
      },
      {
        action: 'ads_settings_updated',
        targetId: 'adskeeper',
        targetLabel: 'AdsKeeper Delivery Mode',
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

  const openEditModal = (unit: AdskeeperUnit) => {
    setDraft({
      id: unit.id,
      name: unit.name,
      format: unit.format,
      placement: unit.placement,
      scriptSrc: unit.scriptSrc,
      widgetId: unit.widgetId,
      rootId: unit.rootId,
      directUrl: unit.directUrl,
      isActive: unit.isActive,
    });
    setSnippetInput('');
    setParseFeedback(null);
    setFormError(null);
    setEditorOpen(true);
  };

  const applySnippetParse = (rawText: string) => {
    const parsed = parseAdskeeperSnippet(rawText);
    if (!parsed) {
      setParseFeedback({
        type: 'error',
        text: t(UI_TEXT.adminPanel.adskeeper.parsedWarning, lang),
      });
      return;
    }
    setDraft((prev) => ({
      ...prev,
      ...parsed,
      name: prev.name.trim() ? prev.name : parsed.name || prev.name,
    }));
    setParseFeedback({
      type: 'success',
      text: t(UI_TEXT.adminPanel.adskeeper.parsedSuccess, lang),
    });
    setFormError(null);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draft.name.trim().slice(0, 80);
    const cleanScriptSrc = normalizeHttpsUrl(draft.scriptSrc).slice(0, 500);
    const cleanDirectUrl = normalizeHttpsUrl(draft.directUrl).slice(0, 500);
    const cleanWidgetId = draft.widgetId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const cleanRootId = draft.rootId.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);

    const hasValidTarget =
      draft.format === 'direct_link'
        ? Boolean(cleanDirectUrl)
        : draft.format === 'smart_widget'
          ? Boolean(cleanScriptSrc)
          : Boolean(cleanScriptSrc || cleanWidgetId || cleanRootId);

    if (!cleanName || !hasValidTarget) {
      setFormError(t(UI_TEXT.adminPanel.adskeeper.validationError, lang));
      return;
    }

    if (!draft.id && adskeeper.units.length >= MAX_ADSKEEPER_UNITS) {
      setFormError(`Maximum limit of ${MAX_ADSKEEPER_UNITS} AdsKeeper widgets reached.`);
      return;
    }

    const isEditing = Boolean(draft.id);
    const unitId = draft.id || `adskeeper_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextUnit: AdskeeperUnit = {
      id: unitId,
      name: cleanName,
      format: draft.format,
      placement: draft.format === 'smart_widget' ? 'global_script' : draft.placement,
      scriptSrc: cleanScriptSrc,
      widgetId: cleanWidgetId,
      rootId: cleanRootId,
      directUrl: cleanDirectUrl,
      isActive: draft.isActive,
      updatedAtMs: Math.round(Date.now()),
    };

    const nextUnits = isEditing
      ? adskeeper.units.map((u) => (u.id === unitId ? nextUnit : u))
      : [...adskeeper.units, nextUnit];

    await onSaveAdskeeper(
      {
        ...adskeeper,
        units: nextUnits,
      },
      {
        action: isEditing ? 'ad_updated' : 'ad_created',
        targetId: unitId,
        targetLabel: `AdsKeeper · ${cleanName}`,
        details: `${nextUnit.format} · ${nextUnit.placement} · ${nextUnit.isActive ? 'Active' : 'Paused'}`,
      },
    );

    setEditorOpen(false);
    setDraft(emptyUnitDraft());
    setFormError(null);
  };

  const handleToggleUnitActive = async (unit: AdskeeperUnit) => {
    const nextActive = !unit.isActive;
    const nextUnits = adskeeper.units.map((u) =>
      u.id === unit.id ? { ...u, isActive: nextActive, updatedAtMs: Math.round(Date.now()) } : u,
    );
    await onSaveAdskeeper(
      {
        ...adskeeper,
        units: nextUnits,
      },
      {
        action: 'ad_toggled',
        targetId: unit.id,
        targetLabel: `AdsKeeper · ${unit.name}`,
        details: nextActive ? 'Activated AdsKeeper widget' : 'Paused AdsKeeper widget',
      },
    );
  };

  const handleDeleteUnit = async (unit: AdskeeperUnit) => {
    const nextUnits = adskeeper.units.filter((u) => u.id !== unit.id);
    await onSaveAdskeeper(
      {
        ...adskeeper,
        units: nextUnits,
      },
      {
        action: 'ad_deleted',
        targetId: unit.id,
        targetLabel: `AdsKeeper · ${unit.name}`,
        details: `${unit.format} · ${unit.placement}`,
      },
    );
    setConfirmDeleteId(null);
  };

  const previewUnit: AdskeeperUnit = {
    id: draft.id ?? 'preview_adskeeper',
    name: draft.name.trim() || 'AdsKeeper Widget',
    format: draft.format,
    placement: draft.placement,
    scriptSrc: draft.scriptSrc,
    widgetId: draft.widgetId,
    rootId: draft.rootId,
    directUrl: draft.directUrl,
    isActive: draft.isActive,
    updatedAtMs: Math.round(Date.now()),
  };

  return (
    <div className="space-y-6">
      {/* AdsKeeper Integration Header Card */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 shrink-0 text-[#00A84C]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-zinc-950">
                {t(UI_TEXT.adminPanel.adskeeper.sectionTitle, lang)}
              </h2>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adskeeper.sectionSub, lang)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://dashboard.adskeeper.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
            >
              <span>{t(UI_TEXT.adminPanel.adskeeper.openDashboardBtn, lang)}</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            </a>

            <button
              type="button"
              disabled={adskeeper.units.length >= MAX_ADSKEEPER_UNITS}
              onClick={openCreateModal}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.adskeeper.addUnitBtn, lang)}</span>
            </button>
          </div>
        </div>

        {/* Enable Switch */}
        <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-4">
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-950">
              {t(UI_TEXT.adminPanel.adskeeper.enableToggleTitle, lang)}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {t(UI_TEXT.adminPanel.adskeeper.enableToggleDesc, lang)}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={adskeeper.enabled}
            disabled={syncingCloud}
            onClick={() => void handleToggleEnabled()}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              adskeeper.enabled ? 'bg-[#00DC64]' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                adskeeper.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Priority / Delivery Mode Selector */}
        <div className="border-t border-zinc-100 pt-4">
          <span className="mb-2 block text-xs font-semibold text-zinc-700">
            {t(UI_TEXT.adminPanel.adskeeper.displayModeLabel, lang)}
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            {DISPLAY_MODES.map((mode) => {
              const selected = adskeeper.displayMode === mode;
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
                      {t(UI_TEXT.adminPanel.adskeeper.displayModes[mode].title, lang)}
                    </span>
                    {selected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#00A84C]" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    {t(UI_TEXT.adminPanel.adskeeper.displayModes[mode].desc, lang)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* AdsKeeper Widgets Directory */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        {adskeeper.units.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-zinc-900">
              {t(UI_TEXT.adminPanel.adskeeper.emptyTitle, lang)}
            </p>
            <p className="mx-auto mt-1.5 max-w-lg text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adskeeper.emptyHint, lang)}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t(UI_TEXT.adminPanel.adskeeper.addUnitBtn, lang)}</span>
              </button>
              <a
                href="https://dashboard.adskeeper.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <span>{t(UI_TEXT.adminPanel.adskeeper.openDashboardBtn, lang)}</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {adskeeper.units.map((unit) => {
              const confirmingDelete = confirmDeleteId === unit.id;
              const endpointSummary =
                unit.format === 'direct_link'
                  ? unit.directUrl
                  : [
                      unit.widgetId ? `Widget #${unit.widgetId}` : '',
                      unit.rootId,
                      unit.scriptSrc,
                    ]
                      .filter(Boolean)
                      .join(' · ');

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
                        {t(UI_TEXT.adminPanel.adskeeper.formats[unit.format], lang)}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">·</span>
                      <span className="text-[11px] font-medium text-zinc-500">
                        {t(UI_TEXT.adminPanel.adskeeper.placements[unit.placement], lang)}
                      </span>
                    </div>
                    {endpointSummary && (
                      <div className="mt-1 truncate text-[11px] text-zinc-400 font-mono-num">
                        {endpointSummary}
                      </div>
                    )}
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

      <p className="text-[11px] text-zinc-500">
        {t(UI_TEXT.adminPanel.adskeeper.globalScriptNote, lang)}
      </p>

      {/* Add / Edit AdsKeeper Widget Modal */}
      {editorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            draft.id
              ? t(UI_TEXT.adminPanel.adskeeper.editUnitHeading, lang)
              : t(UI_TEXT.adminPanel.adskeeper.createUnitHeading, lang)
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
                    ? t(UI_TEXT.adminPanel.adskeeper.editUnitHeading, lang)
                    : t(UI_TEXT.adminPanel.adskeeper.createUnitHeading, lang)}
                </h2>
                <a
                  href="https://dashboard.adskeeper.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00A84C] hover:underline"
                >
                  <span>dashboard.adskeeper.com</span>
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
              {/* Auto-Parse AdsKeeper Embed Code */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-zinc-800">
                    {t(UI_TEXT.adminPanel.adskeeper.pasteSnippetLabel, lang)}
                  </label>
                  <button
                    type="button"
                    onClick={() => applySnippetParse(snippetInput)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 whitespace-nowrap"
                  >
                    <Sparkles className="h-3 w-3 text-[#00A84C]" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.adskeeper.parseBtn, lang)}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={snippetInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSnippetInput(val);
                    if (val.trim().length > 12) {
                      const auto = parseAdskeeperSnippet(val);
                      if (auto) {
                        setDraft((prev) => ({
                          ...prev,
                          ...auto,
                          name: prev.name.trim() ? prev.name : auto.name || prev.name,
                        }));
                        setParseFeedback({
                          type: 'success',
                          text: t(UI_TEXT.adminPanel.adskeeper.parsedSuccess, lang),
                        });
                      }
                    }
                  }}
                  placeholder={t(UI_TEXT.adminPanel.adskeeper.pasteSnippetPlaceholder, lang)}
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adskeeper.unitNameLabel, lang)}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={draft.name}
                    onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Under-Episode Grid"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adskeeper.formatLabel, lang)}
                  </label>
                  <select
                    value={draft.format}
                    onChange={(e) => {
                      const nextFmt = e.target.value as AdskeeperFormat;
                      setDraft((prev) => ({
                        ...prev,
                        format: nextFmt,
                        placement:
                          nextFmt === 'smart_widget'
                            ? 'global_script'
                            : prev.placement === 'global_script'
                              ? 'discovery_inline'
                              : prev.placement,
                      }));
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    {FORMAT_OPTIONS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {t(UI_TEXT.adminPanel.adskeeper.formats[fmt], lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adskeeper.placementLabel, lang)}
                  </label>
                  <select
                    value={draft.format === 'smart_widget' ? 'global_script' : draft.placement}
                    disabled={draft.format === 'smart_widget'}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        placement: e.target.value as AdskeeperPlacement,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500"
                  >
                    {PLACEMENT_OPTIONS.filter((p) =>
                      draft.format === 'smart_widget'
                        ? p === 'global_script'
                        : p !== 'global_script',
                    ).map((p) => (
                      <option key={p} value={p}>
                        {t(UI_TEXT.adminPanel.adskeeper.placements[p], lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {draft.format === 'direct_link' ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adskeeper.directUrlLabel, lang)}
                  </label>
                  <input
                    type="url"
                    required
                    maxLength={500}
                    value={draft.directUrl}
                    onChange={(e) => setDraft((prev) => ({ ...prev, directUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      {t(UI_TEXT.adminPanel.adskeeper.scriptSrcLabel, lang)}
                    </label>
                    <input
                      type="text"
                      maxLength={500}
                      value={draft.scriptSrc}
                      onChange={(e) => setDraft((prev) => ({ ...prev, scriptSrc: e.target.value }))}
                      placeholder="https://jsc.adskeeper.com/site/123456.js"
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>

                  {draft.format !== 'smart_widget' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                          {t(UI_TEXT.adminPanel.adskeeper.widgetIdLabel, lang)}
                        </label>
                        <input
                          type="text"
                          maxLength={64}
                          value={draft.widgetId}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, widgetId: e.target.value }))
                          }
                          placeholder="1674832"
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                          {t(UI_TEXT.adminPanel.adskeeper.rootIdLabel, lang)}
                        </label>
                        <input
                          type="text"
                          maxLength={128}
                          value={draft.rootId}
                          onChange={(e) =>
                            setDraft((prev) => ({ ...prev, rootId: e.target.value }))
                          }
                          placeholder="M912345ScriptRootC1674832"
                          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 font-mono-num focus:border-[#00DC64] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-[#00DC64]"
                />
                <span>{t(UI_TEXT.adminPanel.adskeeper.activeLabel, lang)}</span>
              </label>

              {/* Safe Preview Summary */}
              <div className="space-y-1.5 border-t border-zinc-100 pt-3">
                <span className="text-[11px] font-semibold text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.livePreviewLabel, lang)}
                </span>
                <AdskeeperAdSlot unit={previewUnit} lang={lang} previewMode />
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
                  <span>{t(UI_TEXT.adminPanel.adskeeper.saveUnitBtn, lang)}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
