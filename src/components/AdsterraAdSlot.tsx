import { ExternalLink } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { UI_TEXT, t } from '../i18n';
import { AdsterraUnit, Language } from '../types';

interface AdsterraAdSlotProps {
  unit: AdsterraUnit;
  lang: Language;
  previewMode?: boolean;
  onAdImpression?: (unitId: string) => void;
  onAdClick?: (unitId: string) => void;
}

export function normalizeHttpsUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function sanitizeSafeToken(raw: string, fallback: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || fallback;
}

export function AdsterraAdSlot({
  unit,
  lang,
  previewMode = false,
  onAdImpression,
  onAdClick,
}: AdsterraAdSlotProps) {
  const nativeHostRef = useRef<HTMLDivElement | null>(null);
  const lastImpressedRef = useRef<string | null>(null);

  const safeScriptSrc = normalizeHttpsUrl(unit.scriptSrc);
  const safeDirectUrl = normalizeHttpsUrl(unit.directUrl);
  const safeKey = sanitizeSafeToken(unit.zoneKey, '');
  const safeContainerId = sanitizeSafeToken(unit.containerId, `container-${unit.id}`);
  const width = Math.max(120, Math.min(1200, Math.round(unit.width || 728)));
  const height = Math.max(50, Math.min(600, Math.round(unit.height || 90)));

  useEffect(() => {
    if (previewMode) return;
    if (lastImpressedRef.current === unit.id) return;
    lastImpressedRef.current = unit.id;
    onAdImpression?.(unit.id);
  }, [unit.id, previewMode, onAdImpression]);

  // Mount Adsterra Native Banner invoke.js into container element when live
  useEffect(() => {
    if (previewMode || unit.format !== 'native_banner' || !safeScriptSrc) return;
    const host = nativeHostRef.current;
    if (!host) return;

    host.innerHTML = '';
    const containerEl = document.createElement('div');
    containerEl.id = safeContainerId;
    host.appendChild(containerEl);

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = safeScriptSrc;
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
    };
  }, [previewMode, unit.format, safeScriptSrc, safeContainerId]);

  const bannerSrcDoc = useMemo(() => {
    if (unit.format !== 'banner') return '';
    const effectiveSrc =
      safeScriptSrc ||
      (safeKey ? `https://www.highperformanceformat.com/${safeKey}/invoke.js` : '');
    if (!effectiveSrc || !safeKey) return '';

    const escapedSrc = effectiveSrc.replace(/"/g, '&quot;');
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100%;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key': '${safeKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    </script>
    <script type="text/javascript" src="${escapedSrc}"></script>
  </body>
</html>`;
  }, [unit.format, safeScriptSrc, safeKey, width, height]);

  if (previewMode) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-950">{unit.name}</span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="text-zinc-500">
                {t(UI_TEXT.adminPanel.adsterra.formats[unit.format], lang)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-zinc-500 font-mono-num">
              {unit.format === 'banner'
                ? `${width}×${height}${safeKey ? ` · key: ${safeKey}` : ''}`
                : unit.format === 'direct_link'
                  ? safeDirectUrl || 'https://...'
                  : safeScriptSrc || safeContainerId}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">Adsterra</span>
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
              <span>{t(UI_TEXT.adminPanel.adsterra.sponsoredNetworkLabel, lang)}</span>
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
            <span>{t(UI_TEXT.adminPanel.adsterra.directLinkCta, lang)}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    );
  }

  if (unit.format === 'native_banner') {
    if (!safeScriptSrc) return null;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
          <span>
            {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)} ·{' '}
            {t(UI_TEXT.adminPanel.adsterra.sponsoredNetworkLabel, lang)}
          </span>
          <span className="truncate font-mono-num">{unit.name}</span>
        </div>
        <div ref={nativeHostRef} className="min-h-[80px] w-full overflow-hidden" />
      </div>
    );
  }

  if (unit.format === 'banner') {
    if (!bannerSrcDoc) return null;
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-400">
          <span>
            {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)} ·{' '}
            {t(UI_TEXT.adminPanel.adsterra.sponsoredNetworkLabel, lang)}
          </span>
          <span className="font-mono-num">
            {width}×{height}
          </span>
        </div>
        <div className="flex w-full justify-center overflow-x-auto">
          <iframe
            title={`Adsterra ${unit.name}`}
            srcDoc={bannerSrcDoc}
            width={width}
            height={height}
            scrolling="no"
            frameBorder={0}
            className="max-w-full border-0"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          />
        </div>
      </div>
    );
  }

  return null;
}

export function AdsterraGlobalScripts({
  units,
  onAdImpression,
}: {
  units: AdsterraUnit[];
  onAdImpression?: (unitId: string) => void;
}) {
  const mountedScriptsRef = useRef<Map<string, HTMLScriptElement>>(new Map());
  const impressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeScripts = units
      .filter((u) => u.isActive && (u.format === 'social_bar' || u.format === 'popunder'))
      .map((u) => ({
        unit: u,
        src: normalizeHttpsUrl(u.scriptSrc),
      }))
      .filter((entry) => Boolean(entry.src));

    const activeIds = new Set(activeScripts.map((s) => s.unit.id));

    // Remove stale scripts
    for (const [id, el] of mountedScriptsRef.current.entries()) {
      if (!activeIds.has(id)) {
        el.remove();
        mountedScriptsRef.current.delete(id);
      }
    }

    // Mount missing scripts
    for (const { unit, src } of activeScripts) {
      if (!mountedScriptsRef.current.has(unit.id)) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.setAttribute('data-cfasync', 'false');
        script.setAttribute('data-adsterra-unit', unit.id);
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
