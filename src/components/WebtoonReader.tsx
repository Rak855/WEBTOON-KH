import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Send,
  Check,
  Plus,
  Star,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import {
  AdsenseUnit,
  AdskeeperUnit,
  AdsterraUnit,
  ComicPanel,
  ComicSpeechBubble,
  CommentItem,
  Episode,
  Language,
  SponsorAdCampaign,
  WebtoonSeries,
} from '../types';
import { AdsenseAdSlot } from './AdsenseAdSlot';
import { AdskeeperAdSlot } from './AdskeeperAdSlot';
import { AdsterraAdSlot } from './AdsterraAdSlot';
import { SponsorAdBanner } from './SponsorAdBanner';

interface WebtoonReaderProps {
  series: WebtoonSeries;
  episode: Episode;
  lang: Language;
  onToggleLang: (next: Language) => void;
  isLiked: boolean;
  isSubscribed: boolean;
  comments: CommentItem[];
  sponsorAd?: SponsorAdCampaign | null;
  adsterraFooterAd?: AdsterraUnit | null;
  adskeeperFooterAd?: AdskeeperUnit | null;
  adsenseFooterAd?: AdsenseUnit | null;
  adsensePublisherId?: string;
  onAdClick?: (campaignId: string) => void;
  onAdImpression?: (campaignId: string) => void;
  onToggleLike: (episodeId: string) => void;
  onToggleSubscribe: (seriesId: string) => void;
  onSelectEpisode: (episodeId: string) => void;
  onAddComment: (episodeId: string, text: string) => void;
  onEpisodeFinished: (episodeId: string) => void;
  onBackToSeries: () => void;
}

const SCENE_BACKDROPS: Record<ComicPanel['sceneTheme'], string> = {
  temple: 'from-amber-950 via-stone-900 to-emerald-950',
  rain: 'from-slate-900 via-indigo-950 to-amber-950',
  rooftop: 'from-zinc-950 via-slate-900 to-rose-950',
  library: 'from-stone-950 via-neutral-900 to-amber-950',
  noodle: 'from-orange-950 via-amber-950 to-zinc-900',
  sanctuary: 'from-stone-900 via-amber-950 to-zinc-950',
};

function IllustratedSceneCanvas({ theme }: { theme: ComicPanel['sceneTheme'] }) {
  const gradient = SCENE_BACKDROPS[theme];
  return (
    <div className={`relative h-80 sm:h-[420px] w-full overflow-hidden bg-gradient-to-b ${gradient}`}>
      <svg
        viewBox="0 0 800 480"
        className="h-full w-full opacity-45"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`glow-${theme}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="480" fill={`url(#glow-${theme})`} />
        {theme === 'rain' && (
          <g stroke="#bae6fd" strokeWidth="1.2" strokeOpacity="0.35">
            {Array.from({ length: 24 }).map((_, idx) => (
              <line
                key={idx}
                x1={35 * idx}
                y1={(idx * 47) % 180}
                x2={35 * idx - 22}
                y2={((idx * 47) % 180) + 110}
              />
            ))}
          </g>
        )}
        {(theme === 'temple' || theme === 'sanctuary') && (
          <g fill="none" stroke="#fcd34d" strokeOpacity="0.35" strokeWidth="2">
            <path d="M160 440 L160 220 Q400 90 640 220 L640 440" />
            <circle cx="400" cy="180" r="46" />
            <circle cx="240" cy="310" r="14" />
            <circle cx="560" cy="300" r="10" />
          </g>
        )}
        {theme === 'rooftop' && (
          <g fill="#09090b" fillOpacity="0.55">
            <rect x="40" y="270" width="130" height="210" />
            <rect x="210" y="210" width="170" height="270" />
            <rect x="430" y="245" width="140" height="235" />
            <rect x="610" y="180" width="150" height="300" />
          </g>
        )}
        {theme === 'library' && (
          <g stroke="#d6d3d1" strokeOpacity="0.25" strokeWidth="2" fill="none">
            <rect x="80" y="60" width="120" height="360" />
            <rect x="600" y="60" width="120" height="360" />
            <line x1="80" y1="150" x2="200" y2="150" />
            <line x1="80" y1="240" x2="200" y2="240" />
            <line x1="600" y1="150" x2="720" y2="150" />
            <line x1="600" y1="240" x2="720" y2="240" />
          </g>
        )}
        {theme === 'noodle' && (
          <g fill="#fb923c" fillOpacity="0.35">
            <circle cx="190" cy="120" r="28" />
            <circle cx="400" cy="95" r="24" />
            <circle cx="610" cy="125" r="30" />
          </g>
        )}
      </svg>
    </div>
  );
}

function BubbleOverlay({ bubble, lang }: { bubble: ComicSpeechBubble; lang: Language }) {
  const posClasses: Record<ComicSpeechBubble['position'], string> = {
    'top-left': 'top-4 left-4 sm:top-6 sm:left-6',
    'top-right': 'top-4 right-4 sm:top-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  if (bubble.variant === 'narration') {
    return (
      <div
        className={`absolute ${posClasses[bubble.position]} max-w-xs sm:max-w-sm rounded-lg border border-zinc-700 bg-zinc-950/92 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg`}
      >
        {t(bubble.text, lang)}
      </div>
    );
  }

  return (
    <div
      className={`absolute ${posClasses[bubble.position]} max-w-[260px] sm:max-w-xs rounded-2xl border-2 border-zinc-900 bg-white px-4 py-3 text-zinc-950 shadow-md ${
        bubble.variant === 'thought' ? 'border-dashed bg-zinc-50/95' : ''
      }`}
    >
      {bubble.speaker && (
        <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">
          {t(bubble.speaker, lang)}
        </div>
      )}
      <p className="text-sm font-medium leading-relaxed">{t(bubble.text, lang)}</p>
    </div>
  );
}

export function WebtoonReader({
  series,
  episode,
  lang,
  onToggleLang,
  isLiked,
  isSubscribed,
  comments,
  sponsorAd = null,
  adsterraFooterAd = null,
  adskeeperFooterAd = null,
  adsenseFooterAd = null,
  adsensePublisherId = '',
  onAdClick,
  onAdImpression,
  onToggleLike,
  onToggleSubscribe,
  onSelectEpisode,
  onAddComment,
  onEpisodeFinished,
  onBackToSeries,
}: WebtoonReaderProps) {
  const [commentDraft, setCommentDraft] = useState('');
  const [userRating, setUserRating] = useState<number>(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const episodeEndRef = useRef<HTMLElement | null>(null);
  const finishedForEpisodeRef = useRef<string | null>(null);

  const currentIdx = series.episodes.findIndex((e) => e.id === episode.id);
  const prevEp = currentIdx > 0 ? series.episodes[currentIdx - 1] : null;
  const nextEp =
    currentIdx >= 0 && currentIdx < series.episodes.length - 1
      ? series.episodes[currentIdx + 1]
      : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    finishedForEpisodeRef.current = null;
  }, [episode.id]);

  useEffect(() => {
    const target = episodeEndRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && finishedForEpisodeRef.current !== episode.id) {
          finishedForEpisodeRef.current = episode.id;
          onEpisodeFinished(episode.id);
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [episode.id, onEpisodeFinished]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    onAddComment(episode.id, trimmed);
    setCommentDraft('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Compact Sticky Reader Bar */}
      <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBackToSeries}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t(UI_TEXT.reader.backToSeries, lang)}</span>
            </button>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">
                {t(series.title, lang)}
              </div>
              <div className="truncate text-xs text-zinc-400 font-mono-num">
                {t(UI_TEXT.series.episodePrefix, lang)} {episode.number} · {t(episode.title, lang)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Instant KH/ENG Switcher inside Reader */}
            <div className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
              <button
                type="button"
                onClick={() => onToggleLang('kh')}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  lang === 'kh' ? 'bg-[#00DC64] text-zinc-950' : 'text-zinc-300 hover:text-white'
                }`}
              >
                ខ្មែរ
              </button>
              <button
                type="button"
                onClick={() => onToggleLang('en')}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  lang === 'en' ? 'bg-[#00DC64] text-zinc-950' : 'text-zinc-300 hover:text-white'
                }`}
              >
                ENG
              </button>
            </div>

            <button
              type="button"
              disabled={!prevEp}
              onClick={() => prevEp && onSelectEpisode(prevEp.id)}
              aria-label={t(UI_TEXT.reader.prevEp, lang)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!nextEp}
              onClick={() => nextEp && onSelectEpisode(nextEp.id)}
              aria-label={t(UI_TEXT.reader.nextEp, lang)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vertical Scroll Comic Strip */}
      <article className="mx-auto max-w-[740px] bg-black shadow-2xl">
        {episode.panels.map((panel) => {
          const useFallback = !panel.imageUrl || Boolean(imgErrors[panel.id]);
          return (
            <div key={panel.id} className="relative border-b-4 border-black">
              {panel.caption && (
                <div className="bg-zinc-950 px-5 py-3.5 text-center text-sm font-medium leading-relaxed text-zinc-200 border-b border-zinc-800">
                  {t(panel.caption, lang)}
                </div>
              )}

              <div className="relative w-full overflow-hidden">
                {!useFallback && panel.imageUrl ? (
                  <img
                    src={panel.imageUrl}
                    alt={`${t(series.title, lang)} panel`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImgErrors((prev) => ({ ...prev, [panel.id]: true }))
                    }
                    className="block w-full object-cover"
                  />
                ) : (
                  <IllustratedSceneCanvas theme={panel.sceneTheme} />
                )}

                {panel.bubbles.map((bubble) => (
                  <BubbleOverlay key={bubble.id} bubble={bubble} lang={lang} />
                ))}
              </div>
            </div>
          );
        })}
      </article>

      {/* Episode Engagement & Navigation Footer */}
      <section
        ref={episodeEndRef}
        className="mx-auto max-w-[740px] bg-white px-5 py-8 text-zinc-900 sm:px-8"
      >
        <p className="text-center text-xs font-semibold text-zinc-500">
          {t(UI_TEXT.reader.endOfEpisode, lang)}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onToggleLike(episode.id)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-colors ${
              isLiked
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`}
              aria-hidden="true"
            />
            <span>
              {isLiked ? t(UI_TEXT.reader.likedEp, lang) : t(UI_TEXT.reader.likeEp, lang)}
            </span>
            <span className="font-mono-num">
              ({formatCompactNumber(episode.likes + (isLiked ? 1 : 0), lang)})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSubscribe(series.id)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold transition-colors ${
              isSubscribed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            {isSubscribed ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>{t(UI_TEXT.series.subscribed, lang)}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{t(UI_TEXT.series.subscribe, lang)}</span>
              </>
            )}
          </button>

          {nextEp && (
            <button
              type="button"
              onClick={() => onSelectEpisode(nextEp.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#00c458]"
            >
              <span>{t(UI_TEXT.reader.nextEp, lang)}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Interactive Rating Strip */}
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-zinc-100 pt-6">
          <span className="text-xs font-medium text-zinc-500">
            {t(UI_TEXT.reader.rateLabel, lang)}
          </span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setUserRating(score)}
                aria-label={`Rate ${score} stars`}
                className="cursor-pointer p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-5 w-5 ${
                    score <= userRating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-zinc-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {(sponsorAd || adsterraFooterAd || adskeeperFooterAd || (adsenseFooterAd && adsensePublisherId)) && (
          <div className="mt-6 space-y-4 border-t border-zinc-100 pt-6">
            {sponsorAd && (
              <SponsorAdBanner
                campaign={sponsorAd}
                lang={lang}
                variant="compact"
                onAdClick={onAdClick}
                onAdImpression={onAdImpression}
              />
            )}
            {adsenseFooterAd && adsensePublisherId && (
              <AdsenseAdSlot
                unit={adsenseFooterAd}
                publisherId={adsensePublisherId}
                lang={lang}
                onAdImpression={onAdImpression}
              />
            )}
            {adsterraFooterAd && (
              <AdsterraAdSlot
                unit={adsterraFooterAd}
                lang={lang}
                onAdClick={onAdClick}
                onAdImpression={onAdImpression}
              />
            )}
            {adskeeperFooterAd && (
              <AdskeeperAdSlot
                unit={adskeeperFooterAd}
                lang={lang}
                onAdClick={onAdClick}
                onAdImpression={onAdImpression}
              />
            )}
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-8 border-t border-zinc-200 pt-8">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-zinc-950">
              {t(UI_TEXT.reader.commentsTitle, lang)}
            </h2>
            <span className="text-xs font-medium text-zinc-500 font-mono-num">
              ({comments.length})
            </span>
          </div>

          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={t(UI_TEXT.reader.commentPlaceholder, lang)}
              className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-[#00DC64] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.reader.postComment, lang)}</span>
            </button>
          </form>

          <div className="mt-6 divide-y divide-zinc-100">
            {comments.map((c) => (
              <div key={c.id} className="py-3.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-zinc-900">{c.author}</span>
                  <span aria-hidden="true" className="text-zinc-300">·</span>
                  <span className="text-zinc-500">{t(c.timestamp, lang)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
