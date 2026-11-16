import { ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { UI_TEXT, t } from '../i18n';
import { AdskeeperUnit, Language } from '../types';
import { normalizeHttpsUrl } from './AdsterraAdSlot';

interface AdskeeperAdSlotProps {
  unit: AdskeeperUnit;
  lang: Language;
  previewMode?: boolean;
  onAdImpression?: (unitId: string) => void;
  onAdClick?: (unitId: string) => void;
}

declare global {
  interface Window {
    _mgq?: unknown[][];
  }
}

function sanitizeSafeToken(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || fallback;
}

export function AdskeeperAdSlot({
  unit,
  lang,
  previewMode = false,
  onAdImpression,
  onAdClick,
}: AdskeeperAdSlotProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const lastImpressedRef = useRef<string | null>(null);

  const safeScriptSrc = normalizeHttpsUrl(unit.scriptSrc);
  const safeDirectUrl = normalizeHttpsUrl(unit.directUrl);
  const safeWidgetId = sanitizeSafeToken(unit.widgetId, '');
  const safeRootId = sanitizeSafeToken(unit.rootId, '');

  useEffect(() => {
    if (previewMode) return;
    if (lastImpressedRef.current === unit.id) return;
    lastImpressedRef.current = unit.id;
    onAdImpression?.(unit.id);
  }, [unit.id, previewMode, onAdImpression]);

  useEffect(() => {
    if (
      previewMode ||
      unit.format === 'direct_link' ||
      unit.format === 'smart_widget' ||
      (!safeScriptSrc && !safeWidgetId && !safeRootId)
    ) {
      return;
    }

    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';

    const containerEl = document.createElement('div');
    if (safeRootId) {
      containerEl.id = safeRootId;
    }
    if (safeWidgetId) {
      containerEl.setAttribute('data-type', '_mgwidget');
      containerEl.setAttribute('data-widget-id', safeWidgetId);
    } else if (!safeRootId) {
      containerEl.id = `adskeeper-${unit.id}`;
    }
    host.appendChild(containerEl);

    if (safeWidgetId) {
      window._mgq = window._mgq || [];
      window._mgq.push(['_mgc.load']);
    }

    if (safeScriptSrc) {
      const script = document.createElement('script');
      script.async = true;
      script.src = safeScriptSrc;
      host.appendChild(script);
    }

    return () => {
      host.innerHTML = '';
    };
  }, [previewMode, unit.id, unit.format, safeScriptSrc, safeWidgetId, safeRootId]);

  if (previewMode) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-950">{unit.name}</span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="text-zinc-500">
                {t(UI_TEXT.adminPanel.adskeeper.formats[unit.format], lang)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-zinc-500 font-mono-num">
              {unit.format === 'direct_link'
                ? safeDirectUrl || 'https://...'
                : [
                    safeWidgetId ? `widget: ${safeWidgetId}` : '',
                    safeRootId ? `root: ${safeRootId}` : '',
                    safeScriptSrc,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'jsc.adskeeper.com'}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">AdsKeeper</span>
        </div>
      </div>
    );
  }

  if (unit.format === 'direct_link') {
    if (!safeDirectUrl) return null;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-colors hover:border-zinc-300">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="font-semibold text-emerald-700">
                {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{t(UI_TEXT.adminPanel.adskeeper.networkLabel, lang)}</span>
            </div>
            <p className="mt-0.5 truncate text-sm font-bold text-zinc-950">{unit.name}</p>
          </div>
          <a
            href={safeDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onAdClick?.(unit.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap shrink-0"
          >
            <span>{t(UI_TEXT.adminPanel.adskeeper.directLinkCta, lang)}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  if (unit.format === 'smart_widget') {
    return null;
  }

  if (!safeScriptSrc && !safeWidgetId && !safeRootId) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>
          {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)} ·{' '}
          {t(UI_TEXT.adminPanel.adskeeper.networkLabel, lang)}
        </span>
        <span className="truncate font-mono-num">{unit.name}</span>
      </div>
      <div ref={hostRef} className="min-h-[80px] w-full overflow-hidden" />
    </div>
  );
}

export function AdskeeperGlobalScripts({
  units,
  onAdImpression,
}: {
  units: AdskeeperUnit[];
  onAdImpression?: (unitId: string) => void;
}) {
  const mountedScriptsRef = useRef<Map<string, HTMLScriptElement>>(new Map());
  const impressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeScripts = units
      .filter((u) => u.isActive && u.format === 'smart_widget')
      .map((u) => ({
        unit: u,
        src: normalizeHttpsUrl(u.scriptSrc),
      }))
      .filter((entry) => Boolean(entry.src));

    const activeIds = new Set(activeScripts.map((s) => s.unit.id));

    for (const [id, el] of mountedScriptsRef.current.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        mountedScriptsRef.current.delete(id);
      }
    }

    for (const { unit, src } of activeScripts) {
      if (!mountedScriptsRef.current.has(unit.id)) {
        if (unit.widgetId) {
          window._mgq = window._mgq || [];
          window._mgq.push(['_mgc.load']);
        }
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.setAttribute('data-adskeeper-unit', unit.id);
        script.src = src;
        document.body.appendChild(script);
        mountedScriptsRef.current.set(unit.id, script);
      }
      if (!impressedRef.current.has(unit.id)) {
        impressedRef.current.add(unit.id);
        onAdImpression?.(unit.id);
      }
    }

    return () => {
      for (const el of mountedScriptsRef.current.values()) {
        el.remove();
      }
      mountedScriptsRef.current.clear();
    };
  }, [units, onAdImpression]);

  return null;
}
