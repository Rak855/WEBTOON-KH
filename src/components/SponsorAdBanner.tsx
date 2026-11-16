import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import { AdStyle, AdTone, Language, SponsorAdCampaign } from '../types';

interface SponsorAdBannerProps {
  campaign: SponsorAdCampaign;
  lang: Language;
  variant?: 'banner' | 'compact';
  onAdClick?: (campaignId: string) => void;
  onAdImpression?: (campaignId: string) => void;
  previewMode?: boolean;
}

const TONE_STYLES: Record<
  AdTone,
  {
    wrapper: string;
    accentBorder: string;
    kicker: string;
    title: string;
    desc: string;
    cta: string;
    ctaLink: string;
    thumbBg: string;
    monogram: string;
  }
> = {
  emerald: {
    wrapper: 'border-emerald-200 bg-white hover:border-emerald-300',
    accentBorder: 'border-l-[#00DC64]',
    kicker: 'text-emerald-700',
    title: 'text-zinc-950',
    desc: 'text-zinc-600',
    cta: 'bg-[#00DC64] text-zinc-950 hover:bg-[#00c458]',
    ctaLink: 'text-emerald-700 hover:text-emerald-800',
    thumbBg: 'from-emerald-950 via-emerald-900 to-zinc-900',
    monogram: 'text-[#00DC64]',
  },
  amber: {
    wrapper: 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
    accentBorder: 'border-l-amber-500',
    kicker: 'text-amber-800',
    title: 'text-zinc-950',
    desc: 'text-zinc-600',
    cta: 'bg-zinc-950 text-white hover:bg-zinc-800',
    ctaLink: 'text-amber-900 hover:text-zinc-950',
    thumbBg: 'from-amber-950 via-stone-900 to-zinc-950',
    monogram: 'text-amber-300',
  },
  slate: {
    wrapper: 'border-zinc-800 bg-zinc-950 hover:border-zinc-700',
    accentBorder: 'border-l-[#00DC64]',
    kicker: 'text-[#00DC64]',
    title: 'text-white',
    desc: 'text-zinc-300',
    cta: 'bg-[#00DC64] text-zinc-950 hover:bg-[#00c458]',
    ctaLink: 'text-[#00DC64] hover:text-emerald-300',
    thumbBg: 'from-zinc-800 via-zinc-900 to-black',
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

export function SponsorAdBanner({
  campaign,
  lang,
  variant = 'banner',
  onAdClick,
  onAdImpression,
  previewMode = false,
}: SponsorAdBannerProps) {
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

  const theme = TONE_STYLES[campaign.tone] ?? TONE_STYLES.emerald;
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

  let content: React.ReactNode;

  if (style === 'hero_image') {
    content = (
      <div
        className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br ${theme.thumbBg} ${
          campaign.tone === 'amber'
            ? 'border-amber-300/60'
            : campaign.tone === 'slate'
              ? 'border-zinc-700'
              : 'border-emerald-300/60'
        }`}
      >
        {showImage && (
          <img
            src={campaign.imageUrl}
            alt={campaign.sponsorName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-zinc-950/92 via-zinc-950/75 to-zinc-950/35"
        />

        <div
          className={`relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
            variant === 'compact' ? 'min-h-[124px] p-4 sm:p-5' : 'min-h-[156px] p-5 sm:p-6'
          }`}
        >
          <div className="max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className="text-[#00DC64]">
                {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
              </span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className="text-zinc-200">{campaign.sponsorName}</span>
            </div>
            <h3 className="mt-1 text-base font-extrabold tracking-tight text-white sm:text-lg">
              {headline}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-200 sm:text-sm">
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                campaign.tone === 'amber'
                  ? 'bg-amber-400 text-zinc-950 group-hover:bg-amber-300'
                  : 'bg-[#00DC64] text-zinc-950 group-hover:bg-[#00c458]'
              }`}
            >
              <span>{ctaLabel}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    );
  } else if (style === 'spotlight') {
    content = (
      <div
        className={`group flex flex-col overflow-hidden rounded-xl border border-l-4 transition-colors sm:flex-row sm:items-stretch ${theme.wrapper} ${theme.accentBorder}`}
      >
        <div
          className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${theme.thumbBg} ${
            variant === 'compact'
              ? 'h-32 w-full sm:h-auto sm:w-44'
              : 'h-36 w-full sm:h-auto sm:w-56'
          }`}
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
            <div className="flex h-full w-full flex-col items-center justify-center px-3 text-center">
              <span className={`text-xl font-black tracking-tight ${theme.monogram}`}>
                {initials}
              </span>
              <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-white/75">
                {campaign.sponsorName}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className={theme.kicker}>
                {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
              </span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className={campaign.tone === 'slate' ? 'text-zinc-300' : 'text-zinc-700'}>
                {campaign.sponsorName}
              </span>
            </div>
            <h3 className={`mt-1 text-base font-extrabold tracking-tight ${theme.title}`}>
              {headline}
            </h3>
            {description && (
              <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${theme.desc}`}>
                {description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${theme.cta}`}
            >
              <span>{ctaLabel}</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    );
  } else if (style === 'minimal') {
    content = (
      <div
        className={`group flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors ${theme.wrapper}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-gradient-to-br ${theme.thumbBg}`}
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
                <span className={`text-[11px] font-black ${theme.monogram}`}>{initials}</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              <span className={`font-semibold ${theme.kicker}`}>
                {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
              </span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className={`font-bold ${theme.title}`}>{campaign.sponsorName}</span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className={`truncate font-medium ${theme.desc}`}>{headline}</span>
            </div>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 ${theme.ctaLink}`}
        >
          <span>{ctaLabel}</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    );
  } else {
    content = (
      <div
        className={`group flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
          variant === 'compact' ? 'p-3.5' : 'p-4 sm:p-5'
        } ${theme.wrapper}`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className={`relative shrink-0 overflow-hidden rounded-lg border border-black/10 bg-gradient-to-br ${theme.thumbBg} ${
              variant === 'compact' ? 'h-14 w-20 sm:h-16 sm:w-24' : 'h-16 w-24 sm:h-20 sm:w-32'
            }`}
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
              <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
                <span className={`text-sm font-black tracking-tight ${theme.monogram}`}>
                  {initials}
                </span>
                <span className="mt-0.5 max-w-full truncate text-[9px] font-medium text-white/70">
                  {campaign.sponsorName}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
              <span className={theme.kicker}>
                {t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}
              </span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className={campaign.tone === 'slate' ? 'text-zinc-300' : 'text-zinc-700'}>
                {campaign.sponsorName}
              </span>
            </div>
            <h3
              className={`mt-0.5 truncate font-extrabold tracking-tight ${
                variant === 'compact' ? 'text-sm' : 'text-sm sm:text-base'
              } ${theme.title}`}
            >
              {headline}
            </h3>
            {description && (
              <p className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${theme.desc}`}>
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${theme.cta}`}
          >
            <span>{ctaLabel}</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    );
  }

  if (previewMode) {
    return <div aria-label={`Sponsor preview: ${campaign.sponsorName}`}>{content}</div>;
  }

  return (
    <aside aria-label={`${t(UI_TEXT.adminPanel.adsManager.sponsoredTag, lang)}: ${campaign.sponsorName}`}>
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onAdClick?.(campaign.id)}
        className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00DC64]"
      >
        {content}
      </a>
    </aside>
  );
}
