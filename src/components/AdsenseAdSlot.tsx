import { useEffect, useRef } from 'react';
import { UI_TEXT, t } from '../i18n';
import { AdsenseUnit, Language } from '../types';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function normalizeAdsensePublisherId(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return '';
  if (/^ca-pub-\d{10,20}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^pub-\d{10,20}$/.test(cleaned)) {
    return `ca-${cleaned}`;
  }
  if (/^\d{14,20}$/.test(cleaned)) {
    return `ca-pub-${cleaned}`;
  }
  return '';
}

function sanitizeSlotId(raw: string): string {
  return raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

export function AdsenseHeadScript({
  publisherId,
  enabled,
}: {
  publisherId: string;
  enabled: boolean;
}) {
  const safePub = normalizeAdsensePublisherId(publisherId);

  useEffect(() => {
    if (!enabled || !safePub) return;
    const selector = `script[data-adsense-client="${safePub}"]`;
    let scriptEl = document.head.querySelector<HTMLScriptElement>(selector);
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.async = true;
      scriptEl.crossOrigin = 'anonymous';
      scriptEl.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        safePub,
      )}`;
      scriptEl.setAttribute('data-adsense-client', safePub);
      document.head.appendChild(scriptEl);
    }

    return () => {
      const existing = document.head.querySelector<HTMLScriptElement>(selector);
      existing?.remove();
    };
  }, [enabled, safePub]);

  return null;
}

interface AdsenseAdSlotProps {
  unit: AdsenseUnit;
  publisherId: string;
  lang: Language;
  previewMode?: boolean;
  onAdImpression?: (unitId: string) => void;
}

export function AdsenseAdSlot({
  unit,
  publisherId,
  lang,
  previewMode = false,
  onAdImpression,
}: AdsenseAdSlotProps) {
  const pushedKeyRef = useRef<string | null>(null);
  const lastImpressedRef = useRef<string | null>(null);

  const safePub = normalizeAdsensePublisherId(publisherId);
  const safeSlot = sanitizeSlotId(unit.slotId);
  const width = Math.max(120, Math.min(2000, Math.round(unit.width || 728)));
  const height = Math.max(50, Math.min(2000, Math.round(unit.height || 90)));

  useEffect(() => {
    if (previewMode || !safePub || !safeSlot) return;
    if (lastImpressedRef.current !== unit.id) {
      lastImpressedRef.current = unit.id;
      onAdImpression?.(unit.id);
    }
    const pushKey = `${unit.id}:${safePub}:${safeSlot}:${unit.sizeMode}:${width}x${height}`;
    if (pushedKeyRef.current === pushKey) return;
    pushedKeyRef.current = pushKey;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore AdSense runtime push errors if blocked by ad blockers or preview CSP
    }
  }, [previewMode, unit.id, unit.sizeMode, safePub, safeSlot, width, height, onAdImpression]);

  if (previewMode) {
    const sizeText =
      unit.sizeMode === 'fixed'
        ? `${width}×${height} px`
        : t(UI_TEXT.adminPanel.adsense.sizeModes.responsive, lang);
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-zinc-950">{unit.name}</span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="text-zinc-600">
                {t(UI_TEXT.adminPanel.adsense.formats[unit.format], lang)}
              </span>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <span className="font-mono-num text-zinc-500">{sizeText}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-zinc-500 font-mono-num">
              {safePub || 'ca-pub-...'} · slot: {safeSlot || '—'}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700">Google AdSense</span>
        </div>
      </div>
    );
  }

  if (!safePub || !safeSlot) {
    return null;
  }

  const resolvedFormat =
    unit.sizeMode === 'fixed'
      ? undefined
      : unit.format === 'multiplex'
        ? 'autorelaxed'
        : unit.format === 'in_feed' || unit.format === 'in_article'
          ? 'fluid'
          : 'auto';

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>
          {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)} ·{' '}
          {t(UI_TEXT.adminPanel.adsense.networkLabel, lang)}
        </span>
        <span className="font-mono-num">
          {unit.sizeMode === 'fixed' ? `${width}×${height}` : 'Responsive'}
        </span>
      </div>

      <div className="flex w-full justify-center overflow-x-auto">
        <ins
          className="adsbygoogle"
          style={
            unit.sizeMode === 'fixed'
              ? { display: 'inline-block', width: `${width}px`, height: `${height}px` }
              : { display: 'block', width: '100%' }
          }
          data-ad-client={safePub}
          data-ad-slot={safeSlot}
          {...(resolvedFormat ? { 'data-ad-format': resolvedFormat } : {})}
          {...(unit.sizeMode === 'responsive' && unit.fullWidthResponsive
            ? { 'data-full-width-responsive': 'true' }
            : {})}
          {...(unit.format === 'in_article' ? { 'data-ad-layout': 'in-article' } : {})}
        />
      </div>
    </div>
  );
}
