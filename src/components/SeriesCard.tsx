import { Heart, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import { Language, WebtoonSeries } from '../types';

interface SeriesCardProps {
  series: WebtoonSeries;
  lang: Language;
  rank?: number;
  onSelect: (seriesId: string) => void;
}

export function SeriesCard({ series, lang, rank, onSelect }: SeriesCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const totalLikes = series.episodes.reduce((acc, ep) => acc + ep.likes, 0);

  return (
    <button
      type="button"
      onClick={() => onSelect(series.id)}
      className="group flex w-full cursor-pointer flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00DC64]"
    >
      {/* Cover Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100 border border-zinc-200/80 transition-transform duration-150 group-hover:-translate-y-0.5">
        {!imgFailed ? (
          <img
            src={series.coverUrl}
            alt={t(series.title, lang)}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 p-4 text-center"
            aria-hidden="true"
          >
            <BookOpen className="mb-2 h-8 w-8 text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-600">
              {t(series.title, lang)}
            </span>
          </div>
        )}

        {/* Single subtle text indicator at top-left if ranked or new */}
        {typeof rank === 'number' ? (
          <div className="absolute left-2.5 top-2.5 flex h-7 min-w-7 items-center justify-center rounded-md bg-zinc-950/85 px-2 text-xs font-bold text-white font-mono-num">
            {rank}
          </div>
        ) : series.isNew ? (
          <div className="absolute left-2.5 top-2.5 rounded-md bg-[#00DC64] px-2 py-0.5 text-[11px] font-bold text-zinc-950">
            {t(UI_TEXT.home.newLabel, lang)}
          </div>
        ) : null}
      </div>

      {/* Unboxed Metadata below cover */}
      <div className="mt-2.5 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          <span className="truncate">{t(UI_TEXT.genres[series.genre], lang)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono-num text-emerald-700">
            <Heart className="h-3 w-3 fill-emerald-600 text-emerald-600" aria-hidden="true" />
            {formatCompactNumber(totalLikes, lang)}
          </span>
        </div>

        <h3 className="mt-1 line-clamp-1 text-base font-bold text-zinc-950 transition-colors group-hover:text-[#00A84C]">
          {t(series.title, lang)}
        </h3>

        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
          {t(series.author, lang)}
        </p>
      </div>
    </button>
  );
}
