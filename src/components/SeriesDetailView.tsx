import { ArrowLeft, BookOpen, Check, Heart, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import { Language, WebtoonSeries } from '../types';

interface SeriesDetailViewProps {
  series: WebtoonSeries;
  lang: Language;
  isSubscribed: boolean;
  readEpisodeIds: string[];
  likedEpisodeIds: string[];
  onToggleSubscribe: (seriesId: string) => void;
  onReadEpisode: (seriesId: string, episodeId: string) => void;
  onBack: () => void;
}

export function SeriesDetailView({
  series,
  lang,
  isSubscribed,
  readEpisodeIds,
  likedEpisodeIds,
  onToggleSubscribe,
  onReadEpisode,
  onBack,
}: SeriesDetailViewProps) {
  const [bannerError, setBannerError] = useState(false);

  const lastReadEp = [...series.episodes]
    .reverse()
    .find((ep) => readEpisodeIds.includes(ep.id));
  const targetEp = lastReadEp || series.episodes[0];
  const hasStarted = Boolean(lastReadEp);

  const totalEpisodes = series.episodes.length;
  const readCount = series.episodes.filter((ep) =>
    readEpisodeIds.includes(ep.id),
  ).length;
  const progressPercent =
    totalEpisodes > 0 ? Math.round((readCount / totalEpisodes) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>{t(UI_TEXT.series.backHome, lang)}</span>
      </button>

      {/* Series Header Banner */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="relative h-48 sm:h-64 w-full bg-zinc-900">
          {!bannerError ? (
            <img
              src={series.bannerUrl}
              alt={t(series.title, lang)}
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="h-full w-full object-cover object-center opacity-80"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-zinc-900 to-emerald-950" />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-transparent"
          />

          <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-8 sm:right-8">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-emerald-300">
              <span>{t(UI_TEXT.genres[series.genre], lang)}</span>
              <span aria-hidden="true" className="text-zinc-400">·</span>
              <span className="text-zinc-200">{t(UI_TEXT.weekdays[series.scheduleDay], lang)}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t(series.title, lang)}
            </h1>
            <p className="mt-1 text-sm text-zinc-300">{t(series.author, lang)}</p>
          </div>
        </div>

        {/* Series Info & Actions */}
        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-start sm:p-8">
          <div>
            <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
              {t(series.synopsis, lang)}
            </p>

            {/* Unboxed Clean Metrics */}
            <div className="mt-5 flex flex-wrap items-center gap-6 border-t border-zinc-100 pt-4 text-sm">
              <div>
                <div className="text-xs text-zinc-500">{t(UI_TEXT.series.views, lang)}</div>
                <div className="mt-0.5 font-bold text-zinc-950 font-mono-num">
                  {formatCompactNumber(series.viewsCount, lang)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">{t(UI_TEXT.series.subscribers, lang)}</div>
                <div className="mt-0.5 font-bold text-zinc-950 font-mono-num">
                  {formatCompactNumber(
                    series.subscribersCount + (isSubscribed ? 1 : 0),
                    lang,
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">{t(UI_TEXT.series.rating, lang)}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 font-bold text-emerald-700 font-mono-num">
                  <Star className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" aria-hidden="true" />
                  {series.rating.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Dynamic Reading Progress Bar */}
            <div className="mt-5 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-zinc-700">
                  {t(UI_TEXT.series.readingProgress, lang)}
                </span>
                <span className="font-medium text-zinc-600 font-mono-num">
                  {readCount} / {totalEpisodes} {t(UI_TEXT.series.episodesUnit, lang)}
                  <span aria-hidden="true" className="mx-1.5 text-zinc-300">·</span>
                  <span className="font-bold text-emerald-700">{progressPercent}%</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={t(UI_TEXT.series.readingProgress, lang)}
                aria-valuenow={readCount}
                aria-valuemin={0}
                aria-valuemax={totalEpisodes}
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
              >
                <div
                  className="h-full rounded-full bg-[#00DC64] transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:min-w-52">
            {targetEp && (
              <button
                type="button"
                onClick={() => onReadEpisode(series.id, targetEp.id)}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#00DC64] px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>
                  {hasStarted
                    ? t(UI_TEXT.series.continueReading, lang)
                    : t(UI_TEXT.series.firstEpisode, lang)}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleSubscribe(series.id)}
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isSubscribed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
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
          </div>
        </div>
      </section>

      {/* Episode List */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-950">
            {t(UI_TEXT.series.episodesTitle, lang)}
          </h2>
          <span className="text-xs font-medium text-zinc-500 font-mono-num">
            {series.episodes.length}
          </span>
        </div>

        <div className="divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {series.episodes.map((ep) => {
            const isRead = readEpisodeIds.includes(ep.id);
            const isLiked = likedEpisodeIds.includes(ep.id);
            return (
              <button
                key={ep.id}
                type="button"
                onClick={() => onReadEpisode(series.id, ep.id)}
                className="flex w-full cursor-pointer items-center gap-4 p-3.5 text-left transition-colors hover:bg-zinc-50 sm:p-4"
              >
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 sm:h-20 sm:w-28">
                  <img
                    src={ep.thumbnailUrl}
                    alt={t(ep.title, lang)}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-700 font-mono-num">
                      #{ep.number}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{t(ep.publishedDate, lang)}</span>
                    {isRead && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-emerald-700">
                          {t(UI_TEXT.series.readStatus, lang)}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="mt-1 truncate text-sm font-bold text-zinc-950 sm:text-base">
                    {t(ep.title, lang)}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 font-mono-num shrink-0">
                  <Heart
                    className={`h-4 w-4 ${
                      isLiked ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{formatCompactNumber(ep.likes + (isLiked ? 1 : 0), lang)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
