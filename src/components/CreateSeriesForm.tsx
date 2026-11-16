import { Info, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { GenreKey, Language, WebtoonSeries } from '../types';

interface CreateSeriesFormProps {
  lang: Language;
  defaultAuthor: string;
  onCancel: () => void;
  onPublish: (series: WebtoonSeries) => void;
}

interface CategoryOption {
  value: string;
  mappedGenre: Exclude<GenreKey, 'all'>;
  label: { kh: string; en: string };
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'superhero', mappedGenre: 'action', label: { kh: 'កំពូលវីរបុរស (SUPERHERO)', en: 'SUPERHERO' } },
  { value: 'fantasy', mappedGenre: 'fantasy', label: { kh: 'អច្ឆរិយៈ (FANTASY)', en: 'FANTASY' } },
  { value: 'romance', mappedGenre: 'romance', label: { kh: 'ស្នេហា (ROMANCE)', en: 'ROMANCE' } },
  { value: 'action', mappedGenre: 'action', label: { kh: 'ប្រយុទ្ធ (ACTION)', en: 'ACTION' } },
  { value: 'mystery', mappedGenre: 'mystery', label: { kh: 'អាថ៌កំបាំង (MYSTERY)', en: 'MYSTERY' } },
  { value: 'slice_of_life', mappedGenre: 'slice_of_life', label: { kh: 'ជីវិតប្រចាំថ្ងៃ (SLICE OF LIFE)', en: 'SLICE OF LIFE' } },
  { value: 'horror', mappedGenre: 'horror', label: { kh: 'រន្ធត់ (HORROR)', en: 'HORROR' } },
  { value: 'short_story', mappedGenre: 'slice_of_life', label: { kh: 'រឿងខ្លី (SHORT STORY)', en: 'SHORT STORY' } },
  { value: 'comedy', mappedGenre: 'slice_of_life', label: { kh: 'កំប្លែង (COMEDY)', en: 'COMEDY' } },
  { value: 'drama', mappedGenre: 'romance', label: { kh: 'មនោសញ្ចេតនា (DRAMA)', en: 'DRAMA' } },
  { value: 'sci_fi', mappedGenre: 'fantasy', label: { kh: 'វិទ្យាសាស្ត្រ (SCI-FI)', en: 'SCI-FI' } },
  { value: 'thriller', mappedGenre: 'mystery', label: { kh: 'រន្ធត់អាថ៌កំបាំង (THRILLER)', en: 'THRILLER' } },
];

const RATING_QUESTIONS = [
  {
    key: 'violence' as const,
    label: { kh: 'អំពើហិង្សា', en: 'Violence' },
    options: [
      { value: 0, kh: '0: គ្មានអំពើហិង្សា ឬឈាម', en: '0: No violence, blood, or gore' },
      { value: 1, kh: '1: អំពើហិង្សាស្រាលបែបតុក្កតា', en: '1: Mild fantasy or cartoon violence' },
      { value: 2, kh: '2: ការប្រយុទ្ធមធ្យម ឬឈាមតិចតួច', en: '2: Moderate action violence or light blood' },
      { value: 3, kh: '3: អំពើហិង្សាខ្លាំង ឬឈាមច្រើន', en: '3: Intense violence or graphic blood' },
    ],
  },
  {
    key: 'sexual' as const,
    label: { kh: 'ខ្លឹមសារផ្លូវភេទ', en: 'Sexual Content' },
    options: [
      { value: 0, kh: '0: គ្មានខ្លឹមសារ ឬប្រធានបទផ្លូវភេទ', en: '0: No sexual content or themes' },
      { value: 1, kh: '1: ឈុតស្នេហាស្រាលៗ', en: '1: Mild romantic themes' },
      { value: 2, kh: '2: ខ្លឹមសារទាក់ទាញផ្លូវភេទ', en: '2: Suggestive themes' },
      { value: 3, kh: '3: ខ្លឹមសារផ្លូវភេទសម្រាប់មនុស្សពេញវ័យ', en: '3: Mature sexual themes' },
    ],
  },
  {
    key: 'nudity' as const,
    label: { kh: 'ភាពអាក្រាតកាយ', en: 'Nudity' },
    options: [
      { value: 0, kh: '0: គ្មានភាពអាក្រាតកាយ', en: '0: No nudity (partial and full)' },
      { value: 1, kh: '1: ភាពអាក្រាតដោយផ្នែកបែបសិល្បៈ', en: '1: Mild artistic partial nudity' },
      { value: 2, kh: '2: ភាពអាក្រាតដោយផ្នែកកម្រិតមធ្យម', en: '2: Moderate partial nudity' },
    ],
  },
  {
    key: 'profanity' as const,
    label: { kh: 'ពាក្យអសុរោះ', en: 'Profanity' },
    options: [
      { value: 0, kh: '0: គ្មានពាក្យអសុរោះ', en: '0: No profanity' },
      { value: 1, kh: '1: ពាក្យសម្ដីស្រាលៗ', en: '1: Mild language' },
      { value: 2, kh: '2: ពាក្យអសុរោះកម្រិតមធ្យម', en: '2: Moderate profanity' },
      { value: 3, kh: '3: ពាក្យអសុរោះធ្ងន់ធ្ងរ', en: '3: Strong profanity' },
    ],
  },
  {
    key: 'substances' as const,
    label: { kh: 'គ្រឿងស្រវឹង គ្រឿងញៀន ឬថ្នាំជក់', en: 'Alcohol, Drugs, or Tobacco' },
    options: [
      { value: 0, kh: '0: គ្មានគ្រឿងស្រវឹង ថ្នាំជក់ ឬគ្រឿងញៀន', en: '0: No alcohol, tobacco, or drugs' },
      { value: 1, kh: '1: បង្ហាញម្តងម្កាល', en: '1: Occasional depiction' },
      { value: 2, kh: '2: បង្ហាញញឹកញាប់', en: '2: Frequent depiction' },
    ],
  },
];

const SENSITIVITY_GROUPS = [
  {
    id: 'abuse',
    prompt: {
      kh: 'ស៊េរីរឿងនេះអាចមានប្រធានបទអំពីការកេងប្រវ័ញ្ច ឬការរំលោភបំពានលើអនីតិជន សត្វ ឬជនងាយរងគ្រោះ។',
      en: 'This series may contain themes of exploitation or abuse of minors, animals, or vulnerable adults.',
    },
    items: [
      { id: 'animal_abuse', kh: 'ការធ្វើបាបសត្វ', en: 'Animal Abuse' },
      { id: 'child_abuse', kh: 'ការរំលោភបំពានកុមារ', en: 'Child Abuse' },
      { id: 'domestic_abuse', kh: 'អំពើហិង្សាក្នុងគ្រួសារ', en: 'Domestic Abuse' },
      { id: 'sexual_abuse', kh: 'ការរំលោភបំពានផ្លូវភេទ', en: 'Sexual Abuse' },
    ],
  },
  {
    id: 'self_harm',
    prompt: {
      kh: 'ស៊េរីរឿងនេះអាចបង្ហាញពីការធ្វើបាបខ្លួនឯង ការធ្វើអត្តឃាត ឬវិបត្តិសុខភាពផ្លូវចិត្ត។',
      en: 'This series may feature or portray themes of self-harm, suicide, or mental health crises.',
    },
    items: [
      { id: 'eating_disorder', kh: 'បញ្ហាការបរិភោគ', en: 'Eating Disorder' },
      { id: 'mental_health', kh: 'សុខភាពផ្លូវចិត្ត', en: 'Mental Health' },
      { id: 'self_harm', kh: 'ការធ្វើបាបខ្លួនឯង', en: 'Self-harm' },
      { id: 'suicide', kh: 'ការធ្វើអត្តឃាត', en: 'Suicide' },
    ],
  },
  {
    id: 'extremism',
    prompt: {
      kh: 'ស៊េរីរឿងនេះអាចមានប្រធានបទ ឬសាច់រឿងពាក់ព័ន្ធនឹងអំពើជ្រុលនិយម អំពើហិង្សានយោបាយ ឬឧក្រិដ្ឋកម្មរៀបចំ។',
      en: 'The series may contain themes or storylines that include extremism, political violence, or organized criminal activity.',
    },
    items: [
      { id: 'extremism', kh: 'អំពើជ្រុលនិយម', en: 'Extremism' },
      { id: 'organized_crime', kh: 'ឧក្រិដ្ឋកម្មរៀបចំ', en: 'Organized Crime' },
      { id: 'political_content', kh: 'ខ្លឹមសារនយោបាយ', en: 'Political Content' },
      { id: 'terrorism', kh: 'អំពើភេរវកម្ម', en: 'Terrorism' },
    ],
  },
  {
    id: 'harmful_acts',
    prompt: {
      kh: 'ស៊េរីរឿងនេះអាចរួមបញ្ចូលប្រធានបទប្រើប្រាស់គ្រឿងញៀន ការជួញដូរ ការគំរាមកំហែង ឬល្បែងស៊ីសង។',
      en: 'This series may include themes or portrayal of substance use, trafficking, bullying, or gambling.',
    },
    items: [
      { id: 'bullying', kh: 'ការធ្វើបាប ឬសម្លុត', en: 'Bullying' },
      { id: 'gambling', kh: 'ល្បែងស៊ីសង', en: 'Gambling' },
      { id: 'substance_abuse', kh: 'ការប្រើប្រាស់គ្រឿងញៀន', en: 'Substance Abuse' },
      { id: 'drug_trafficking', kh: 'ការជួញដូរគ្រឿងញៀន', en: 'Drug Trafficking' },
    ],
  },
];

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function CreateSeriesForm({
  lang,
  defaultAuthor,
  onCancel,
  onPublish,
}: CreateSeriesFormProps) {
  const [sourceLang, setSourceLang] = useState<'en' | 'kh'>(lang);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('superhero');
  const [secondaryCategory, setSecondaryCategory] = useState('short_story');

  const [squarePreview, setSquarePreview] = useState('');
  const [squareFileName, setSquareFileName] = useState('');
  const [verticalPreview, setVerticalPreview] = useState('');
  const [verticalFileName, setVerticalFileName] = useState('');
  const [thumbError, setThumbError] = useState<string | null>(null);

  const [ratings, setRatings] = useState({
    violence: 0,
    sexual: 0,
    nudity: 0,
    profanity: 0,
    substances: 0,
  });
  const [sensitivities, setSensitivities] = useState<string[]>([]);

  const [ackRating, setAckRating] = useState(false);
  const [ackAgeTerms, setAckAgeTerms] = useState(false);
  const [ackCanvasTerms, setAckCanvasTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const squareInputRef = useRef<HTMLInputElement | null>(null);
  const verticalInputRef = useRef<HTMLInputElement | null>(null);

  const assignedAgeRating = useMemo(() => {
    const maxScore = Math.max(
      ratings.violence,
      ratings.sexual,
      ratings.nudity,
      ratings.profanity,
      ratings.substances,
    );
    if (maxScore >= 3) return { kh: 'មនុស្សពេញវ័យ (18+)', en: 'Mature' };
    if (maxScore === 2 || sensitivities.length >= 2) {
      return { kh: 'យុវវ័យ (16+)', en: 'Young Adult' };
    }
    if (maxScore === 1 || sensitivities.length === 1) {
      return { kh: 'វ័យជំទង់ (13+)', en: 'Teen' };
    }
    return { kh: 'គ្រប់វ័យ', en: 'All Ages' };
  }, [ratings, sensitivities.length]);

  const handleSelectThumbnail = async (
    kind: 'square' | 'vertical',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validType =
      ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
      ['jpg', 'jpeg', 'png'].includes(ext);

    if (!validType) {
      setThumbError(
        lang === 'kh'
          ? 'អនុញ្ញាតតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
          : 'Only JPG, JPEG, and PNG formats are allowed.',
      );
      return;
    }

    const maxBytes = kind === 'square' ? 500 * 1024 : 700 * 1024;
    if (file.size > maxBytes) {
      setThumbError(
        lang === 'kh'
          ? kind === 'square'
            ? 'រូបភាពការ៉េត្រូវមានទំហំតិចជាង 500KB។'
            : 'រូបភាពបញ្ឈរត្រូវមានទំហំតិចជាង 700KB។'
          : kind === 'square'
            ? 'Square Thumbnail must be less than 500KB max.'
            : 'Vertical Thumbnail must be less than 700KB max.',
      );
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setThumbError(null);
      if (kind === 'square') {
        setSquarePreview(dataUrl);
        setSquareFileName(file.name);
      } else {
        setVerticalPreview(dataUrl);
        setVerticalFileName(file.name);
      }
    } catch {
      setThumbError(
        lang === 'kh' ? 'មិនអាចអានឯកសាររូបភាពបានទេ។' : 'Could not read selected image file.',
      );
    }
  };

  const toggleSensitivity = (id: string) => {
    setSensitivities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();

    if (!cleanTitle) {
      setFormError(
        lang === 'kh' ? 'សូមបញ្ចូលចំណងជើងស៊េរីរឿង។' : 'Please enter a Series Title.',
      );
      return;
    }
    if (!ackRating || !ackAgeTerms || !ackCanvasTerms) {
      setFormError(
        lang === 'kh'
          ? 'សូមធីកប្រអប់យល់ព្រមទាំង ៣ ខាងក្រោមមុននឹងបង្កើតស៊េរីរឿង។'
          : 'Please check all three Agreement boxes before creating your series.',
      );
      return;
    }

    setFormError(null);
    const chosenCat = CATEGORY_OPTIONS.find((c) => c.value === primaryCategory);
    const mappedGenre: Exclude<GenreKey, 'all'> = chosenCat?.mappedGenre ?? 'action';
    const fallbackCover = '/src/assets/images/panel_temple_quest_1794804091900.jpg';
    const chosenCover = verticalPreview || squarePreview || fallbackCover;
    const chosenBanner = squarePreview || verticalPreview || fallbackCover;
    const id = `canvas-${Date.now()}`;
    const creator = defaultAuthor.trim() || (lang === 'kh' ? 'អ្នកនិពន្ធឯករាជ្យ' : 'Canvas Creator');

    const newSeries: WebtoonSeries = {
      id,
      title: { kh: cleanTitle, en: cleanTitle },
      author: { kh: creator, en: creator },
      genre: mappedGenre,
      scheduleDay: 'sat',
      isCanvas: true,
      isNew: true,
      coverUrl: chosenCover,
      bannerUrl: chosenBanner,
      accentColor: '#00DC64',
      synopsis: {
        kh: cleanSummary || 'ស្នាដៃតុក្កតាថ្មីពីអ្នកនិពន្ធឯករាជ្យលើ WEBTOON កម្ពុជា។',
        en: cleanSummary || 'Fresh indie comic series published on WEBTOON KH Canvas.',
      },
      viewsCount: 1,
      subscribersCount: 0,
      rating: 9.5,
      episodes: [
        {
          id: `${id}-ep-1`,
          number: 1,
          title: { kh: 'ភាគទី ១', en: 'Episode 1' },
          publishedDate: { kh: 'ថ្ងៃនេះ', en: 'Today' },
          likes: 0,
          thumbnailUrl: chosenBanner,
          panels: [
            {
              id: `${id}-p1`,
              imageUrl: chosenBanner,
              sceneTheme: 'sanctuary',
              caption: {
                kh: cleanSummary || `${cleanTitle} — ភាគដំបូង`,
                en: cleanSummary || `${cleanTitle} — Debut Episode`,
              },
              bubbles: [
                {
                  id: 'b1',
                  speaker: { kh: creator, en: creator },
                  text: {
                    kh:
                      sourceLang === 'kh'
                        ? cleanSummary || 'សូមស្វាគមន៍មកកាន់រឿងថ្មីរបស់ខ្ញុំ!'
                        : 'សូមស្វាគមន៍មកកាន់ស្នាដៃថ្មី!',
                    en:
                      sourceLang === 'en'
                        ? cleanSummary || 'Welcome to the debut episode!'
                        : 'Welcome to the debut episode!',
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
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Section 1: Basic Info */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
            <label htmlFor="canvas-source-lang" className="text-xs font-bold text-zinc-900">
              {lang === 'kh' ? 'ភាសាដើម' : 'Source Language'}
            </label>
            <select
              id="canvas-source-lang"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as 'en' | 'kh')}
              className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#00DC64] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="kh">ភាសាខ្មែរ (Khmer)</option>
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
            <label htmlFor="canvas-series-title" className="text-xs font-bold text-zinc-900">
              {lang === 'kh' ? 'ចំណងជើងស៊េរីរឿង' : 'Series Title'}
            </label>
            <div className="relative">
              <input
                id="canvas-series-title"
                type="text"
                required
                maxLength={50}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'kh' ? 'បញ្ចូលចំណងជើងរឿង...' : 'Enter series title'}
                className="w-full rounded-md border border-zinc-300 px-3.5 py-2 pr-16 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 font-mono-num">
                {title.length} / 50
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-start">
            <label htmlFor="canvas-summary" className="pt-2 text-xs font-bold text-zinc-900">
              {lang === 'kh' ? 'សេចក្តីសង្ខេប' : 'Summary'}
            </label>
            <div className="relative">
              <textarea
                id="canvas-summary"
                rows={4}
                maxLength={500}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={
                  lang === 'kh' ? 'សរសេរសេចក្តីសង្ខេបសាច់រឿង...' : 'Write a brief summary of your series...'
                }
                className="w-full rounded-md border border-zinc-300 px-3.5 py-2 pb-6 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-zinc-400 font-mono-num">
                {summary.length} / 500
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
            <label htmlFor="canvas-cat-1" className="text-xs font-bold text-zinc-900">
              {lang === 'kh' ? 'ប្រភេទរឿង' : 'Category'}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                id="canvas-cat-1"
                value={primaryCategory}
                onChange={(e) => setPrimaryCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#00DC64] focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label[lang]}
                  </option>
                ))}
              </select>

              <select
                aria-label="Secondary Category"
                value={secondaryCategory}
                onChange={(e) => setSecondaryCategory(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#00DC64] focus:outline-none"
              >
                <option value="none">{lang === 'kh' ? 'គ្មាន (ជម្រើសបន្ថែម)' : 'None (Optional)'}</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Thumbnail Upload */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
            <span>{lang === 'kh' ? 'រូបភាពតំណាង' : 'Thumbnail'}</span>
            <Info className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          </div>

          <div>
            <input
              ref={squareInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => handleSelectThumbnail('square', e)}
              className="sr-only"
            />
            <input
              ref={verticalInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => handleSelectThumbnail('vertical', e)}
              className="sr-only"
            />

            <div className="flex flex-wrap items-start gap-5">
              {/* Square 1080 x 1080 */}
              <div className="flex flex-col items-center">
                <span className="mb-1.5 text-xs font-medium text-zinc-700">
                  {lang === 'kh' ? 'ការ៉េ' : 'Square'}
                </span>
                <div className="relative flex h-44 w-44 flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-center">
                  {squarePreview ? (
                    <>
                      <img
                        src={squarePreview}
                        alt="Square thumbnail preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSquarePreview('');
                          setSquareFileName('');
                        }}
                        aria-label="Remove square thumbnail"
                        className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-zinc-950/75 p-1 text-white hover:bg-zinc-950"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-medium text-zinc-500 font-mono-num">
                        1080 x 1080
                      </span>
                      <button
                        type="button"
                        onClick={() => squareInputRef.current?.click()}
                        className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50"
                      >
                        <Upload className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'kh' ? 'ជ្រើសរើសឯកសារ' : 'Select File'}</span>
                      </button>
                      <span className="mt-1 max-w-36 truncate text-[10px] text-zinc-400">
                        {squareFileName || (lang === 'kh' ? 'មិនទាន់ជ្រើសរើស' : 'No file chosen')}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Vertical 1080 x 1920 */}
              <div className="flex flex-col items-center">
                <span className="mb-1.5 text-xs font-medium text-zinc-700">
                  {lang === 'kh' ? 'បញ្ឈរ' : 'Vertical'}
                </span>
                <div className="relative flex h-44 w-28 flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-center">
                  {verticalPreview ? (
                    <>
                      <img
                        src={verticalPreview}
                        alt="Vertical thumbnail preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setVerticalPreview('');
                          setVerticalFileName('');
                        }}
                        aria-label="Remove vertical thumbnail"
                        className="absolute right-1.5 top-1.5 cursor-pointer rounded-full bg-zinc-950/75 p-1 text-white hover:bg-zinc-950"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-medium text-zinc-500 font-mono-num">
                        1080 x 1920
                      </span>
                      <button
                        type="button"
                        onClick={() => verticalInputRef.current?.click()}
                        className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50"
                      >
                        <Upload className="h-3 w-3" aria-hidden="true" />
                        <span>{lang === 'kh' ? 'ជ្រើសរើស' : 'Select File'}</span>
                      </button>
                      <span className="mt-1 max-w-24 truncate text-[10px] text-zinc-400">
                        {verticalFileName || (lang === 'kh' ? 'គ្មានឯកសារ' : 'No file chosen')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[11px] text-zinc-500">
              <li>
                {lang === 'kh'
                  ? 'រូបភាពការ៉េ៖ ទំហំតិចជាង 500KB ។ រូបភាពបញ្ឈរ៖ ទំហំតិចជាង 700KB ។'
                  : 'Square Thumbnail: Image size less than 500KB max. Vertical Thumbnail: Image size less than 700KB max.'}
              </li>
              <li>
                {lang === 'kh'
                  ? 'អនុញ្ញាតតែទម្រង់ JPG, JPEG និង PNG ប៉ុណ្ណោះ។'
                  : 'Only JPG, JPEG, and PNG formats are allowed.'}
              </li>
            </ul>

            {thumbError && (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                {thumbError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Section 3: Content Rating Self Assessment */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
        <h2 className="text-sm font-extrabold text-zinc-950">
          {lang === 'kh' ? 'ការវាយតម្លៃកម្រិតអាយុខ្លឹមសារ' : 'Content Rating Self Assessment'}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
          {lang === 'kh'
            ? 'រាល់ស៊េរីរឿងនៅលើ WEBTOON ត្រូវបង្ហាញកម្រិតអាយុអ្នកអាន។ ដើម្បីធានាថាការវាយតម្លៃត្រឹមត្រូវ សូមឆ្លើយសំណួរខាងក្រោមដោយស្មោះត្រង់។ ស្នាដៃរបស់អ្នកត្រូវគោរពតាមគោលការណ៍សហគមន៍របស់ WEBTOON។'
            : "All series on WEBTOON must display a Content Rating. With Content Ratings, readers can enjoy content appropriate for their age group or content preferences. To ensure the appropriate Content Rating is assigned to your series, please respond to the following questionnaire regarding the content of your series. Your content must follow WEBTOON's Community Policy and Uploading Guidelines. Please note that ratings are subject to change at WEBTOON's sole discretion with or without prior notice."}
        </p>

        <div className="mt-5 space-y-4">
          {RATING_QUESTIONS.map((q) => (
            <div
              key={q.key}
              className="grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center"
            >
              <label htmlFor={`rating-${q.key}`} className="text-xs font-bold text-zinc-900">
                {q.label[lang]}
              </label>
              <select
                id={`rating-${q.key}`}
                value={ratings[q.key]}
                onChange={(e) =>
                  setRatings((prev) => ({ ...prev, [q.key]: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-[#00DC64] focus:outline-none"
              >
                {q.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt[lang]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Regional and Cultural Sensitivities */}
        <div className="mt-6 grid gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-[180px_1fr] sm:items-start">
          <div className="text-xs font-bold text-zinc-900">
            {lang === 'kh' ? 'ភាពរសើបតាមតំបន់ និងវប្បធម៌' : 'Regional and Cultural Sensitivities'}
          </div>

          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-zinc-600">
              {lang === 'kh'
                ? 'បទប្បញ្ញត្តិ និងភាពរសើបខាងវប្បធម៌ខុសគ្នាតាមតំបន់។ សូមជ្រើសរើសប្រធានបទណាមួយដែលមាននៅក្នុងស៊េរីរឿងរបស់អ្នក។'
                : "Regulations and cultural sensitivities vary by country, states, and regions. This section will help ensure your series Content Rating is appropriate according to local and regional laws. Please check all content included in your series. If it contains topics that may be culturally sensitive or prohibited based on regional laws, the work's availability may be limited."}
            </p>

            {SENSITIVITY_GROUPS.map((group) => (
              <div key={group.id} className="space-y-2.5">
                <div className="rounded bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                  {group.prompt[lang]}
                </div>
                <div className="grid grid-cols-2 gap-2.5 px-1 sm:grid-cols-4">
                  {group.items.map((item) => {
                    const checked = sensitivities.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 text-xs text-zinc-800"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSensitivity(item.id)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                        />
                        <span>{item[lang]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Agreement */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-start">
          <div className="text-xs font-bold text-zinc-900">
            {lang === 'kh' ? 'កិច្ចព្រមព្រៀង' : 'Agreement'}
          </div>

          <div className="space-y-3 text-xs text-zinc-700">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={ackRating}
                onChange={(e) => setAckRating(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
              />
              <span>
                {lang === 'kh' ? (
                  <>
                    ខ្ញុំទទួលស្គាល់ថាកម្រិតអាយុដែលបានកំណត់សម្រាប់រឿងរបស់ខ្ញុំគឺ{' '}
                    <strong className="text-zinc-950">{assignedAgeRating.kh}</strong>។
                  </>
                ) : (
                  <>
                    I acknowledge that the assigned Content Age Rating of my series is{' '}
                    <strong className="text-zinc-950">{assignedAgeRating.en}</strong>. The Content
                    Age Rating for my series may vary depending on region.
                  </>
                )}
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={ackAgeTerms}
                onChange={(e) => setAckAgeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
              />
              <span>
                {lang === 'kh'
                  ? 'ខ្ញុំបញ្ជាក់ថាខ្ញុំមានអាយុយ៉ាងតិច ១៣ ឆ្នាំ ហើយយល់ព្រមតាមលក្ខខណ្ឌប្រើប្រាស់ និងគោលការណ៍ឯកជនភាព។'
                  : 'I confirm that I am at least 13 years old and agree to our Terms of Use, CANVAS Terms Of Use and Privacy Policy.'}
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={ackCanvasTerms}
                onChange={(e) => setAckCanvasTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-900"
              />
              <span>
                {lang === 'kh'
                  ? 'ខ្ញុំយល់ព្រមតាមលក្ខខណ្ឌប្រើប្រាស់របស់ CANVAS។'
                  : 'I agree to the CANVAS Terms of Use.'}
              </span>
            </label>
          </div>
        </div>
      </section>

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700"
        >
          {formError}
        </p>
      )}

      {/* Submit Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-md border border-zinc-300 bg-white px-5 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          {lang === 'kh' ? 'បោះបង់' : 'Cancel'}
        </button>
        <button
          type="submit"
          className="cursor-pointer rounded-md bg-zinc-800 px-8 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-950"
        >
          {lang === 'kh' ? 'បង្កើតស៊េរីរឿង' : 'Create Series'}
        </button>
      </div>
    </form>
  );
}
