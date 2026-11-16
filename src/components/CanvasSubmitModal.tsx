import { X } from 'lucide-react';
import { useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import { GenreKey, Language, WebtoonSeries } from '../types';

interface CanvasSubmitModalProps {
  lang: Language;
  onClose: () => void;
  onPublish: (series: WebtoonSeries) => void;
}

const GENRE_OPTIONS: Exclude<GenreKey, 'all'>[] = [
  'fantasy',
  'romance',
  'action',
  'mystery',
  'slice_of_life',
  'horror',
];

export function CanvasSubmitModal({
  lang,
  onClose,
  onPublish,
}: CanvasSubmitModalProps) {
  const [titleKh, setTitleKh] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState<Exclude<GenreKey, 'all'>>('fantasy');
  const [synopsisKh, setSynopsisKh] = useState('');
  const [synopsisEn, setSynopsisEn] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleKh.trim() && !titleEn.trim()) return;

    const cleanKh = titleKh.trim() || titleEn.trim();
    const cleanEn = titleEn.trim() || titleKh.trim();
    const creator = author.trim() || (lang === 'kh' ? 'អ្នកនិពន្ធថ្មី' : 'Indie Creator');
    const id = `canvas-${Date.now()}`;
    const coverImg = '/src/assets/images/panel_temple_quest_1794804091900.jpg';

    const newSeries: WebtoonSeries = {
      id,
      title: { kh: cleanKh, en: cleanEn },
      author: { kh: creator, en: creator },
      genre,
      scheduleDay: 'sat',
      isCanvas: true,
      isNew: true,
      coverUrl: coverImg,
      bannerUrl: coverImg,
      accentColor: '#00DC64',
      synopsis: {
        kh: synopsisKh.trim() || 'ស្នាដៃតុក្កតាថ្មីពីអ្នកនិពន្ធឯករាជ្យលើ WEBTOON កម្ពុជា។',
        en: synopsisEn.trim() || 'Fresh indie comic series published on WEBTOON KH Canvas.',
      },
      viewsCount: 120,
      subscribersCount: 18,
      rating: 9.5,
      episodes: [
        {
          id: `${id}-ep-1`,
          number: 1,
          title: { kh: 'ការចាប់ផ្តើមថ្មី', en: 'Pilot Episode' },
          publishedDate: { kh: 'ថ្ងៃនេះ', en: 'Today' },
          likes: 12,
          thumbnailUrl: coverImg,
          panels: [
            {
              id: `${id}-p1`,
              imageUrl: coverImg,
              sceneTheme: 'sanctuary',
              caption: {
                kh: synopsisKh.trim() || 'ជំពូកទី ១ នៃស្នាដៃថ្មី!',
                en: synopsisEn.trim() || 'Chapter 1 of our brand-new Canvas series!',
              },
              bubbles: [
                {
                  id: 'b1',
                  speaker: { kh: creator, en: creator },
                  text: {
                    kh: 'សូមស្វាគមន៍មកកាន់រឿងថ្មីរបស់ខ្ញុំ!',
                    en: 'Welcome to the debut chapter of my new webtoon!',
                  },
                  position: 'bottom-left',
                  variant: 'speech',
                },
              ],
            },
          ],
        },
      ],
    };

    onPublish(newSeries);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="canvas-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <h2 id="canvas-modal-title" className="text-lg font-bold text-zinc-950">
            {t(UI_TEXT.canvasModal.heading, lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {t(UI_TEXT.canvasModal.titleKh, lang)}
              </label>
              <input
                type="text"
                required
                value={titleKh}
                onChange={(e) => setTitleKh(e.target.value)}
                placeholder="ឧ. រឿងនិទានមាត់ទន្លេ"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {t(UI_TEXT.canvasModal.titleEn, lang)}
              </label>
              <input
                type="text"
                required
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="e.g. Tales by the River"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {t(UI_TEXT.canvasModal.author, lang)}
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Sokha Art"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                {t(UI_TEXT.canvasModal.genre, lang)}
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value as Exclude<GenreKey, 'all'>)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {t(UI_TEXT.genres[g], lang)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              {t(UI_TEXT.canvasModal.synopsisKh, lang)}
            </label>
            <textarea
              rows={2}
              value={synopsisKh}
              onChange={(e) => setSynopsisKh(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
              {t(UI_TEXT.canvasModal.synopsisEn, lang)}
            </label>
            <textarea
              rows={2}
              value={synopsisEn}
              onChange={(e) => setSynopsisEn(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {t(UI_TEXT.canvasModal.cancel, lang)}
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-[#00DC64] px-5 py-2 text-sm font-bold text-zinc-950 hover:bg-[#00c458]"
            >
              {t(UI_TEXT.canvasModal.submit, lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
