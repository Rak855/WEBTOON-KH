import { ChevronLeft, ChevronRight, BookOpen, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import { Language, WebtoonSeries } from '../types';

interface HeroShowcaseProps {
  featured: WebtoonSeries[];
  lang: Language;
  onOpenSeries: (seriesId: string) => void;
  onReadEpisode: (seriesId: string, episodeId: string) => void;
}

export function HeroShowcase({
  featured,
  lang,
  onOpenSeries,
  onReadEpisode,
}: HeroShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [imgErrorMap, setImgErrorMap] = useState<Record<string, boolean>>({});

  if (featured.length === 0) return null;

  const current = featured[index % featured.length];
  const firstEp = current.episodes[0];
  const hasImgError = Boolean(imgErrorMap[current.id]);

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 shadow-sm">
        {/* Background artwork or fallback */}
        <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full overflow-hidden">
          {!hasImgError ? (
            <img
              src={current.bannerUrl}
              alt={t(current.title, lang)}
              referrerPolicy="no-referrer"
              onError={() =>
                setImgErrorMap((prev) => ({ ...prev, [current.id]: true }))
              }
              className="h-full w-full object-cover object-center transition-transform duration-500"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950"
              aria-hidden="true"
            >
              <BookOpen className="h-16 w-16 text-emerald-400/50" />
            </div>
          )}

          {/* Measured contrast scrim */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-zinc-950/15 sm:bg-gradient-to-r sm:from-zinc-950/92 sm:via-zinc-950/60 sm:to-transparent"
          />

          {/* Foreground copy */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 sm:justify-center sm:p-10 lg:p-12">
            <div className="max-w-xl">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-300">
                <span>{t(UI_TEXT.hero.featuredTag, lang)}</span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="text-zinc-200">{t(UI_TEXT.genres[current.genre], lang)}</span>
                <span aria-hidden="true" className="text-zinc-400">·</span>
                <span className="font-mono-num text-zinc-200">
                  {formatCompactNumber(current.viewsCount, lang)} {t(UI_TEXT.home.viewsLabel, lang)}
                </span>
              </div>

              <h1 className="text-balance text-2xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
                {t(current.title, lang)}
              </h1>

              <p className="mt-2.5 line-clamp-2 sm:line-clamp-3 text-sm leading-relaxed text-zinc-200 sm:text-base">
                {t(current.synopsis, lang)}
              </p>

              <p className="mt-2 text-xs text-zinc-300">
                {t(current.author, lang)}
                <span aria-hidden="true" className="mx-1.5 text-zinc-500">·</span>
                <span className="font-mono-num text-emerald-300">★ {current.rating.toFixed(1)}</span>
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {firstEp && (
                  <button
                    type="button"
                    onClick={() => onReadEpisode(current.id, firstEp.id)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#00DC64] px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors duration-150 hover:bg-[#00c458] whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    <span>{t(UI_TEXT.hero.readEp1, lang)}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenSeries(current.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xs transition-colors duration-150 hover:bg-white/20 whitespace-nowrap shrink-0"
                >
                  <span>{t(UI_TEXT.hero.viewSeries, lang)}</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          {featured.length > 1 && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-6 sm:right-6">
              <div className="mr-2 hidden sm:flex items-center gap-1.5">
                {featured.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={t(item.title, lang)}
                    onClick={() => setIndex(idx)}
                    className={`h-1.5 cursor-pointer rounded-full transition-all ${
                      idx === index ? 'w-6 bg-[#00DC64]' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label={t(UI_TEXT.hero.previousSlide, lang)}
                onClick={handlePrev}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-zinc-950/60 text-white backdrop-blur-xs transition-colors hover:bg-zinc-950/85"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t(UI_TEXT.hero.nextSlide, lang)}
                onClick={handleNext}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-zinc-950/60 text-white backdrop-blur-xs transition-colors hover:bg-zinc-950/85"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
