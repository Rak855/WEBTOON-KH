import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import { AdStyle, AdTone, Language, SponsorAdCampaign } from '../types';

interface SponsorModalAdProps {
  campaign: SponsorAdCampaign;
  lang: Language;
  onDismiss: () => void;
  onAdClick?: (campaignId: string) => void;
  onAdImpression?: (campaignId: string) => void;
  previewMode?: boolean;
}

const MODAL_TONE_STYLES: Record<
  AdTone,
  {
    card: string;
    headerBar: string;
    accentBorder: string;
    kicker: string;
    title: string;
    desc: string;
    cta: string;
    dismissBtn: string;
    artworkBg: string;
    monogram: string;
  }
> = {
  emerald: {
    card: 'border-emerald-200 bg-white text-zinc-950',
    headerBar: 'border-zinc-100 bg-zinc-50/80',
    accentBorder: 'border-t-4 border-t-[#00DC64]',
    kicker: 'text-emerald-700',
    title: 'text-zinc-950',
    desc: 'text-zinc-600',
    cta: 'bg-[#00DC64] text-zinc-950 hover:bg-[#00c458]',
    dismissBtn: 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
    artworkBg: 'from-emerald-950 via-emerald-900 to-zinc-900',
    monogram: 'text-[#00DC64]',
  },
  amber: {
    card: 'border-amber-200 bg-white text-zinc-950',
    headerBar: 'border-amber-100 bg-amber-50/70',
    accentBorder: 'border-t-4 border-t-amber-500',
    kicker: 'text-amber-800',
    title: 'text-zinc-950',
    desc: 'text-zinc-600',
    cta: 'bg-zinc-950 text-white hover:bg-zinc-800',
    dismissBtn: 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50',
    artworkBg: 'from-amber-950 via-stone-900 to-zinc-950',
    monogram: 'text-amber-300',
  },
  slate: {
    card: 'border-zinc-800 bg-zinc-950 text-white',
    headerBar: 'border-zinc-800 bg-zinc-900/90',
    accentBorder: 'border-t-4 border-t-[#00DC64]',
    kicker: 'text-[#00DC64]',
    title: 'text-white',
    desc: 'text-zinc-300',
    cta: 'bg-[#00DC64] text-zinc-950 hover:bg-[#00c458]',
    dismissBtn: 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
    artworkBg: 'from-zinc-800 via-zinc-900 to-black',
    monogram: 'text-white',
  },
};

function sanitizeTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return 'https://example.com';
}

export function SponsorModalAd({
  campaign,
  lang,
  onDismiss,
  onAdClick,
  onAdImpression,
  previewMode = false,
}: SponsorModalAdProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const lastImpressedIdRef = useRef<string | null>(null);

  useEffect(() => {
    setImgFailed(false);
  }, [campaign.imageUrl, campaign.id]);

  useEffect(() => {
    if (previewMode) return;
    if (lastImpressedIdRef.current === campaign.id) return;
    lastImpressedIdRef.current = campaign.id;
    onAdImpression?.(campaign.id);
  }, [campaign.id, previewMode, onAdImpression]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const theme = MODAL_TONE_STYLES[campaign.tone] ?? MODAL_TONE_STYLES.emerald;
  const style: AdStyle = campaign.adStyle ?? 'card';
  const headline =
    (lang === 'kh' ? campaign.titleKh.trim() : campaign.titleEn.trim()) ||
    campaign.titleEn.trim() ||
    campaign.titleKh.trim() ||
    campaign.sponsorName;
  const description =
    (lang === 'kh' ? campaign.descriptionKh.trim() : campaign.descriptionEn.trim()) ||
    campaign.descriptionEn.trim() ||
    campaign.descriptionKh.trim();
  const ctaLabel =
    (lang === 'kh' ? campaign.ctaLabelKh.trim() : campaign.ctaLabelEn.trim()) ||
    campaign.ctaLabelEn.trim() ||
    campaign.ctaLabelKh.trim() ||
    (lang === 'kh' ? 'ស្វែងយល់បន្ថែម' : 'Learn More');
  const safeHref = sanitizeTargetUrl(campaign.targetUrl);
  const showImage = Boolean(campaign.imageUrl.trim()) && !imgFailed;
  const initials = campaign.sponsorName.trim().slice(0, 2).toUpperCase() || 'AD';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}: ${campaign.sponsorName}`}
      onClick={onDismiss}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-2xl border shadow-2xl ${
          style === 'minimal' ? 'max-w-sm' : style === 'spotlight' ? 'max-w-lg' : 'max-w-md'
        } ${style === 'spotlight' ? theme.accentBorder : ''} ${theme.card}`}
      >
        {style === 'hero_image' ? (
          <div className={`relative min-h-[340px] bg-gradient-to-br ${theme.artworkBg}`}>
            {showImage && (
              <img
                src={campaign.imageUrl}
                alt={campaign.sponsorName}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/75 to-zinc-950/30"
            />

            <div className="relative z-10 flex min-h-[340px] flex-col justify-between p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                  <span className="text-[#00DC64]">
                    {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
                  </span>
                  <span aria-hidden="true" className="text-zinc-400">·</span>
                  <span className="truncate font-bold text-white">{campaign.sponsorName}</span>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label={t(UI_TEXT.adminPanel.adsManager.closeAdBtn, lang)}
                  className="cursor-pointer rounded-lg bg-black/45 p-1.5 text-zinc-200 transition-colors hover:bg-black/70 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div>
                <h2 className="text-xl font-extrabold leading-snug tracking-tight text-white">
                  {headline}
                </h2>
                {description && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-200 sm:text-sm">
                    {description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="cursor-pointer rounded-lg border border-white/25 bg-black/40 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/60 whitespace-nowrap"
                  >
                    {t(UI_TEXT.adminPanel.adsManager.skipAdBtn, lang)}
                  </button>
                  {previewMode ? (
                    <button
                      type="button"
                      onClick={onDismiss}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap"
                    >
                      <span>{ctaLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        onAdClick?.(campaign.id);
                        onDismiss();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap"
                    >
                      <span>{ctaLabel}</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Top Sponsor Header */}
            <div
              className={`flex items-center justify-between gap-3 border-b px-4 py-3 ${theme.headerBar}`}
            >
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold">
                <span className={theme.kicker}>
                  {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
                </span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="truncate font-bold">{campaign.sponsorName}</span>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                aria-label={t(UI_TEXT.adminPanel.adsManager.closeAdBtn, lang)}
                className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-colors hover:bg-black/10 hover:text-zinc-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Artwork (hidden for minimal style unless thumbnail avatar shown in body) */}
            {style !== 'minimal' && (
              <div
                className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${theme.artworkBg}`}
              >
                {showImage ? (
                  <img
                    src={campaign.imageUrl}
                    alt={campaign.sponsorName}
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                    <span className={`text-3xl font-black tracking-tight ${theme.monogram}`}>
                      {initials}
                    </span>
                    <span className="mt-1 text-xs font-semibold text-white/75">
                      {campaign.sponsorName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Body & Actions */}
            <div className="p-5 sm:p-6">
              {style === 'minimal' && (
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-gradient-to-br ${theme.artworkBg}`}
                  >
                    {showImage ? (
                      <img
                        src={campaign.imageUrl}
                        alt={campaign.sponsorName}
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className={`text-xs font-black ${theme.monogram}`}>{initials}</span>
                      </div>
                    )}
                  </div>
                  <h2 className={`text-base font-extrabold leading-snug tracking-tight ${theme.title}`}>
                    {headline}
                  </h2>
                </div>
              )}

              {style !== 'minimal' && (
                <h2 className={`text-lg font-extrabold leading-snug tracking-tight ${theme.title}`}>
                  {headline}
                </h2>
              )}

              {description && (
                <p className={`mt-2 text-xs leading-relaxed sm:text-sm ${theme.desc}`}>
                  {description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`cursor-pointer rounded-lg border px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${theme.dismissBtn}`}
                >
                  {t(UI_TEXT.adminPanel.adsManager.skipAdBtn, lang)}
                </button>

                {previewMode ? (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${theme.cta}`}
                  >
                    <span>{ctaLabel}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      onAdClick?.(campaign.id);
                      onDismiss();
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${theme.cta}`}
                  >
                    <span>{ctaLabel}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
