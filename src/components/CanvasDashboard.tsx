import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  ExternalLink,
  FlaskConical,
  Heart,
  HeartHandshake,
  Layers,
  MessageCircle,
  Monitor,
  Pencil,
  Plus,
  Trash2,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import { CommentItem, Episode, Language, UserProfile, WebtoonSeries } from '../types';
import { AddEpisodeForm } from './AddEpisodeForm';
import { CreateSeriesForm } from './CreateSeriesForm';
import { SeriesCard } from './SeriesCard';

type DashboardTab =
  | 'series'
  | 'analytics'
  | 'comments'
  | 'super_like'
  | 'ad_sharing'
  | 'lab'
  | 'notice';

interface CanvasDashboardProps {
  lang: Language;
  onToggleLang: (next: Language) => void;
  userProfile: UserProfile | null;
  customSeries: WebtoonSeries[];
  communityCanvasSeries: WebtoonSeries[];
  commentsByEpisode: Record<string, CommentItem[]>;
  onCreateSeries: (series: WebtoonSeries) => void;
  onAddEpisode: (seriesId: string, episode: Episode) => void;
  onUpdateEpisode: (seriesId: string, episode: Episode) => void;
  onDeleteEpisode: (seriesId: string, episodeId: string) => void;
  onDeleteCustomSeries: (seriesId: string) => void;
  onOpenSeries: (seriesId: string) => void;
  onOpenProfile: () => void;
  onBackToSite: () => void;
}

const SIDEBAR_ITEMS: Array<{
  id: DashboardTab;
  icon: typeof Layers;
}> = [
  { id: 'series', icon: Layers },
  { id: 'analytics', icon: BarChart3 },
  { id: 'comments', icon: MessageCircle },
  { id: 'super_like', icon: HeartHandshake },
  { id: 'ad_sharing', icon: Monitor },
  { id: 'lab', icon: FlaskConical },
  { id: 'notice', icon: Bell },
];

const CREATOR_NOTICES = [
  {
    id: 'n1',
    date: { kh: '១៥ វិច្ឆិកា ២០២៦', en: 'Nov 15, 2026' },
    title: {
      kh: 'គាំទ្រការបង្ហោះរឿងតុក្កតា ២ ភាសា (KH & ENG) លើ Canvas',
      en: 'Bilingual KH & ENG Comic Support Now Live on Canvas',
    },
    body: {
      kh: 'អ្នកនិពន្ធអាចបញ្ចូលចំណងជើង និងសេចក្តីសង្ខេបទាំងភាសាខ្មែរ និងភាសាអង់គ្លេស ដើម្បីឱ្យអ្នកអានអាចប្តូរភាសាអានបានភ្លាមៗ។',
      en: 'Creators can now publish Khmer and English titles and synopses so readers can switch languages seamlessly inside the reader.',
    },
  },
  {
    id: 'n2',
    date: { kh: '១០ វិច្ឆិកា ២០២៦', en: 'Nov 10, 2026' },
    title: {
      kh: 'គោលការណ៍ណែនាំសម្រាប់ទំហំបន្ទះរូបភាពបញ្ឈរ',
      en: 'Vertical Strip Formatting Guidelines',
    },
    body: {
      kh: 'សម្រាប់ការអានរលូនលើទូរស័ព្ទ និងកុំព្យូទ័រ សូមប្រើផ្ទាំងរូបភាពបញ្ឈរច្បាស់ល្អ និងប្រយោគខ្លីៗងាយអាន។',
      en: 'For crisp mobile and desktop scrolling, prepare vertical 800px-wide strips with concise, legible speech bubbles.',
    },
  },
];

function CanvasWelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 260 155"
      className="mx-auto h-36 w-auto"
      fill="none"
      aria-hidden="true"
    >
      {/* Large diagonal pencil */}
      <g transform="rotate(-12 130 78)">
        <rect x="64" y="54" width="132" height="14" rx="2" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
        <polygon points="196,54 216,61 196,68" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
        <polygon points="208,58.3 216,61 208,63.7" fill="#18181B" />
        <rect x="52" y="54" width="12" height="14" rx="2" fill="#00DC64" stroke="#18181B" strokeWidth="2.5" />
      </g>

      {/* Left Creator (green beanie, black hoodie, white wide pants) */}
      <path d="M58 64 C58 54, 74 54, 74 64 L74 68 L58 68 Z" fill="#00DC64" stroke="#18181B" strokeWidth="2.5" />
      <circle cx="66" cy="72" r="8" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
      <path d="M52 82 L82 82 L84 106 L54 106 Z" fill="#18181B" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M54 84 L38 86 L38 92 L54 92" fill="#18181B" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="55" y="106" width="12" height="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
      <rect x="69" y="106" width="12" height="28" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
      <path d="M53 134 L69 134 L69 140 L51 140 Z" fill="#18181B" />
      <path d="M68 134 L84 134 L84 140 L68 140 Z" fill="#18181B" />

      {/* Center Creator (white shirt, green sketchbook, grey pants) */}
      <circle cx="122" cy="52" r="9" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
      <path d="M114 48 C116 40, 130 40, 131 50 C127 46, 118 46, 114 48 Z" fill="#18181B" />
      <path d="M106 64 L138 64 L142 98 L104 98 Z" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="118" y="80" width="18" height="22" rx="2" fill="#00DC64" stroke="#18181B" strokeWidth="2.5" />
      <path d="M108 98 L100 134 L114 134 L122 108 L131 134 L144 134 L137 98 Z" fill="#E4E4E7" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M97 134 L115 134 L115 140 L95 140 Z" fill="#18181B" />
      <path d="M129 134 L147 134 L147 140 L129 140 Z" fill="#18181B" />

      {/* Right Creator (curly hair, yellow top, black skirt, green shoes, holding stylus) */}
      <circle cx="174" cy="58" r="12" fill="#18181B" />
      <circle cx="170" cy="61" r="7" fill="#FFFFFF" stroke="#18181B" strokeWidth="2" />
      <path d="M158 72 L188 72 L192 98 L156 98 Z" fill="#FACC15" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M156 98 L188 98 L195 132 L158 132 Z" fill="#18181B" stroke="#18181B" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Stylus held horizontally */}
      <g transform="rotate(10 175 88)">
        <polygon points="134,85 198,85 198,91 134,91 124,88" fill="#18181B" />
      </g>
      <path d="M161 132 L171 132 L171 140 L156 140 Z" fill="#00DC64" stroke="#18181B" strokeWidth="2" />
      <path d="M178 132 L188 132 L191 140 L176 140 Z" fill="#00DC64" stroke="#18181B" strokeWidth="2" />
    </svg>
  );
}

export function CanvasDashboard({
  lang,
  onToggleLang,
  userProfile,
  customSeries,
  communityCanvasSeries,
  commentsByEpisode,
  onCreateSeries,
  onAddEpisode,
  onUpdateEpisode,
  onDeleteEpisode,
  onDeleteCustomSeries,
  onOpenSeries,
  onOpenProfile,
  onBackToSite,
}: CanvasDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('series');
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [addingEpisodeSeriesId, setAddingEpisodeSeriesId] = useState<string | null>(null);
  const [editingEpisodeTarget, setEditingEpisodeTarget] = useState<{
    seriesId: string;
    episodeId: string;
  } | null>(null);
  const [expandedEpisodeSeriesIds, setExpandedEpisodeSeriesIds] = useState<string[]>(() =>
    customSeries.map((s) => s.id),
  );
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [readNotices, setReadNotices] = useState<string[]>([]);
  const [labSpeaker, setLabSpeaker] = useState('ទេវី / Devi');
  const [labKh, setLabKh] = useState('សួស្តីអ្នកអាន WEBTOON កម្ពុជា!');
  const [labEn, setLabEn] = useState('Welcome to my new Canvas webtoon!');

  const openCreateFlow = () => {
    setActiveTab('series');
    setAddingEpisodeSeriesId(null);
    setEditingEpisodeTarget(null);
    setIsCreatingSeries(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAddEpisodeFlow = (seriesId: string) => {
    setActiveTab('series');
    setIsCreatingSeries(false);
    setEditingEpisodeTarget(null);
    setAddingEpisodeSeriesId(seriesId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditEpisodeFlow = (seriesId: string, episodeId: string) => {
    setActiveTab('series');
    setIsCreatingSeries(false);
    setAddingEpisodeSeriesId(null);
    setEditingEpisodeTarget({ seriesId, episodeId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleManageEpisodes = (seriesId: string) => {
    setExpandedEpisodeSeriesIds((prev) =>
      prev.includes(seriesId) ? prev.filter((id) => id !== seriesId) : [...prev, seriesId],
    );
  };

  const editingEpisodeData = useMemo(() => {
    if (!editingEpisodeTarget) return null;
    const series = customSeries.find((s) => s.id === editingEpisodeTarget.seriesId);
    const episode = series?.episodes.find((e) => e.id === editingEpisodeTarget.episodeId);
    if (!series || !episode) return null;
    return { series, episode };
  }, [customSeries, editingEpisodeTarget]);

  const creatorName =
    userProfile?.displayName || t(UI_TEXT.canvasDashboard.defaultCreator, lang);

  const stats = useMemo(() => {
    const totalViews = customSeries.reduce((acc, s) => acc + s.viewsCount, 0);
    const totalSubs = customSeries.reduce((acc, s) => acc + s.subscribersCount, 0);
    const totalLikes = customSeries.reduce(
      (acc, s) => acc + s.episodes.reduce((epAcc, ep) => epAcc + ep.likes, 0),
      0,
    );
    return {
      totalViews,
      totalSubs,
      totalLikes,
      seriesCount: customSeries.length,
    };
  }, [customSeries]);

  const creatorComments = useMemo(() => {
    const list: Array<{
      series: WebtoonSeries;
      episodeNumber: number;
      comment: CommentItem;
    }> = [];
    for (const s of customSeries) {
      for (const ep of s.episodes) {
        const epComments = commentsByEpisode[ep.id] ?? [];
        for (const c of epComments) {
          list.push({ series: s, episodeNumber: ep.number, comment: c });
        }
      }
    }
    return list;
  }, [customSeries, commentsByEpisode]);

  const unreadNoticeCount = CREATOR_NOTICES.filter((n) => !readNotices.includes(n.id)).length;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      {/* Top Canvas Dashboard Bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToSite}
            className="flex cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00DC64]"
          >
            <div className="flex flex-col leading-none">
              <span className="inline-block -rotate-2 rounded-xs bg-[#00DC64] px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white">
                WEBTOON
              </span>
              <span className="mt-0.5 inline-block border border-[#00DC64] bg-white px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-[#00A84C]">
                CANVAS
              </span>
            </div>
            <span className="text-base font-black tracking-tight text-zinc-950 whitespace-nowrap sm:text-lg">
              {t(UI_TEXT.canvasDashboard.dashboardTitle, lang)}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => onToggleLang('kh')}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                lang === 'kh'
                  ? 'bg-[#00DC64] text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ខ្មែរ
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                lang === 'en'
                  ? 'bg-[#00DC64] text-zinc-950'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ENG
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenProfile}
            className="inline-flex max-w-44 cursor-pointer items-center gap-2 rounded-full bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-200 whitespace-nowrap shrink-0"
          >
            {userProfile?.photoURL && !avatarFailed ? (
              <img
                src={userProfile.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-4 w-4 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate">{creatorName}</span>
          </button>
        </div>
      </header>

      {/* Workspace Body: Left Sidebar + Main Viewport */}
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-200 bg-white px-5 py-6 md:w-64 md:border-b-0 md:border-r">
          <div className="flex flex-col items-center text-center">
            {userProfile?.photoURL && !avatarFailed ? (
              <img
                src={userProfile.photoURL}
                alt={creatorName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-16 w-16 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200/90 text-zinc-400">
                <User className="h-8 w-8" aria-hidden="true" />
              </div>
            )}

            <p className="mt-2.5 max-w-full truncate text-xs font-semibold text-zinc-700">
              {creatorName}
            </p>

            <button
              type="button"
              onClick={openCreateFlow}
              className="mt-3.5 w-full cursor-pointer rounded-md bg-[#00DC64] px-4 py-2.5 text-xs font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap"
            >
              {t(UI_TEXT.canvasDashboard.createSeries, lang)}
            </button>
          </div>

          <nav aria-label="Dashboard sections" className="mt-6 flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0 no-scrollbar">
            {SIDEBAR_ITEMS.map(({ id, icon: Icon }) => {
              const active =
                activeTab === id &&
                !isCreatingSeries &&
                !addingEpisodeSeriesId &&
                !editingEpisodeData;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    setIsCreatingSeries(false);
                    setAddingEpisodeSeriesId(null);
                    setEditingEpisodeTarget(null);
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-zinc-100 font-bold text-zinc-950'
                      : 'font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden="true" />
                    <span>{t(UI_TEXT.canvasDashboard.tabs[id], lang)}</span>
                  </span>
                  {id === 'notice' && unreadNoticeCount > 0 && (
                    <span className="text-[11px] font-bold text-rose-600 font-mono-num">
                      {unreadNoticeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-12">
          {/* Breadcrumb Bar */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                if (isCreatingSeries) {
                  setIsCreatingSeries(false);
                } else if (addingEpisodeSeriesId) {
                  setAddingEpisodeSeriesId(null);
                } else if (editingEpisodeData) {
                  setEditingEpisodeTarget(null);
                } else if (activeTab !== 'series') {
                  setActiveTab('series');
                } else {
                  onBackToSite();
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isCreatingSeries
                  ? `${t(UI_TEXT.canvasDashboard.tabs.series, lang)} / ${t(UI_TEXT.canvasDashboard.createSeries, lang)}`
                  : addingEpisodeSeriesId
                    ? `${t(UI_TEXT.canvasDashboard.tabs.series, lang)} / ${t(UI_TEXT.canvasDashboard.manageEpisodes, lang)} / ${t(UI_TEXT.canvasDashboard.addEpisode, lang)}`
                    : editingEpisodeData
                      ? `${t(UI_TEXT.canvasDashboard.tabs.series, lang)} / ${t(UI_TEXT.canvasDashboard.manageEpisodes, lang)} / ${t(UI_TEXT.canvasDashboard.editEpisode, lang)}`
                      : t(UI_TEXT.canvasDashboard.tabs[activeTab], lang)}
              </span>
            </button>

            <button
              type="button"
              onClick={onBackToSite}
              className="cursor-pointer text-xs font-semibold text-zinc-500 hover:text-zinc-950 whitespace-nowrap"
            >
              {t(UI_TEXT.canvasDashboard.backToSite, lang)}
            </button>
          </div>

          {isCreatingSeries ? (
            <CreateSeriesForm
              lang={lang}
              defaultAuthor={creatorName}
              onCancel={() => setIsCreatingSeries(false)}
              onPublish={(series) => {
                onCreateSeries(series);
                setIsCreatingSeries(false);
                setExpandedEpisodeSeriesIds((prev) =>
                  prev.includes(series.id) ? prev : [...prev, series.id],
                );
                setAddingEpisodeSeriesId(series.id);
                setActiveTab('series');
              }}
            />
          ) : editingEpisodeData ? (
            <AddEpisodeForm
              key={editingEpisodeData.episode.id}
              lang={lang}
              seriesList={customSeries}
              initialSeriesId={editingEpisodeData.series.id}
              initialEpisode={editingEpisodeData.episode}
              onCancel={() => setEditingEpisodeTarget(null)}
              onPublishEpisode={(seriesId, episode) => {
                onAddEpisode(seriesId, episode);
                setEditingEpisodeTarget(null);
                setActiveTab('series');
              }}
              onUpdateEpisode={(seriesId, updatedEpisode) => {
                onUpdateEpisode(seriesId, updatedEpisode);
                setEditingEpisodeTarget(null);
                setActiveTab('series');
              }}
            />
          ) : addingEpisodeSeriesId && customSeries.some((s) => s.id === addingEpisodeSeriesId) ? (
            <AddEpisodeForm
              key={`add-${addingEpisodeSeriesId}`}
              lang={lang}
              seriesList={customSeries}
              initialSeriesId={addingEpisodeSeriesId}
              onCancel={() => setAddingEpisodeSeriesId(null)}
              onPublishEpisode={(seriesId, episode) => {
                onAddEpisode(seriesId, episode);
                setExpandedEpisodeSeriesIds((prev) =>
                  prev.includes(seriesId) ? prev : [...prev, seriesId],
                );
                setAddingEpisodeSeriesId(null);
                setActiveTab('series');
              }}
            />
          ) : (
            <>
          {activeTab === 'series' && (
            <>
              <section className="rounded-lg border border-zinc-200 bg-white p-8 sm:p-12">
                {customSeries.length === 0 ? (
                  <div className="mx-auto max-w-xl py-8 text-center">
                    <CanvasWelcomeIllustration />
                    <h1 className="mt-5 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
                      {t(UI_TEXT.canvasDashboard.welcomeTitle, lang)}
                    </h1>
                    <p className="mt-3 text-sm text-zinc-600">
                      {t(UI_TEXT.canvasDashboard.welcomeLine1, lang)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {t(UI_TEXT.canvasDashboard.welcomeLine2, lang)}
                    </p>
                    <button
                      type="button"
                      onClick={openCreateFlow}
                      className="mt-6 cursor-pointer rounded-md bg-zinc-800 px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-zinc-950 whitespace-nowrap"
                    >
                      {t(UI_TEXT.canvasDashboard.createSeries, lang)}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                      <h1 className="text-lg font-extrabold text-zinc-950">
                        {t(UI_TEXT.canvasDashboard.mySeriesTitle, lang)}
                      </h1>
                      <button
                        type="button"
                        onClick={openCreateFlow}
                        className="cursor-pointer rounded-md bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap"
                      >
                        {t(UI_TEXT.canvasDashboard.createSeries, lang)}
                      </button>
                    </div>

                    <div className="mt-4 divide-y divide-zinc-100">
                      {customSeries.map((series) => {
                        const epLikes = series.episodes.reduce((acc, e) => acc + e.likes, 0);
                        const isExpanded = expandedEpisodeSeriesIds.includes(series.id);
                        return (
                          <div key={series.id} className="py-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <img
                                  src={series.coverUrl}
                                  alt={t(series.title, lang)}
                                  referrerPolicy="no-referrer"
                                  className="h-16 w-12 shrink-0 rounded-md border border-zinc-200 object-cover"
                                />
                                <div className="min-w-0">
                                  <h2 className="truncate text-sm font-bold text-zinc-950">
                                    {t(series.title, lang)}
                                  </h2>
                                  <p className="mt-0.5 text-xs text-zinc-500 font-mono-num">
                                    {t(UI_TEXT.genres[series.genre], lang)}
                                    <span aria-hidden="true" className="mx-1.5">·</span>
                                    {series.episodes.length} {t(UI_TEXT.series.episodesUnit, lang)}
                                    <span aria-hidden="true" className="mx-1.5">·</span>
                                    {formatCompactNumber(series.viewsCount, lang)}{' '}
                                    {t(UI_TEXT.home.viewsLabel, lang)}
                                    <span aria-hidden="true" className="mx-1.5">·</span>
                                    {formatCompactNumber(epLikes, lang)} likes
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openAddEpisodeFlow(series.id)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-[#00DC64] px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap"
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{t(UI_TEXT.canvasDashboard.addEpisode, lang)}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleManageEpisodes(series.id)}
                                  aria-expanded={isExpanded}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                                >
                                  <span>{t(UI_TEXT.canvasDashboard.manageEpisodes, lang)}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOpenSeries(series.id)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{t(UI_TEXT.canvasDashboard.openSeries, lang)}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteCustomSeries(series.id)}
                                  aria-label={t(UI_TEXT.canvasDashboard.deleteSeries, lang)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{t(UI_TEXT.canvasDashboard.deleteSeries, lang)}</span>
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/70">
                                {series.episodes.length === 0 ? (
                                  <p className="px-4 py-3 text-xs text-zinc-500">
                                    {t(UI_TEXT.canvasDashboard.noEpisodesYet, lang)}
                                  </p>
                                ) : (
                                  <div className="divide-y divide-zinc-200/80">
                                    {series.episodes.map((ep) => (
                                      <div
                                        key={ep.id}
                                        className="flex flex-col gap-2.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <img
                                            src={ep.thumbnailUrl}
                                            alt={t(ep.title, lang)}
                                            referrerPolicy="no-referrer"
                                            className="h-10 w-14 shrink-0 rounded border border-zinc-200 object-cover bg-white"
                                          />
                                          <div className="min-w-0">
                                            <div className="truncate text-xs font-bold text-zinc-900">
                                              <span className="text-zinc-500 font-mono-num">
                                                #{ep.number}
                                              </span>{' '}
                                              {t(ep.title, lang)}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-zinc-500 font-mono-num">
                                              {t(ep.publishedDate, lang)} · {ep.panels.length}{' '}
                                              {lang === 'kh' ? 'ផ្ទាំង' : 'panels'} · {ep.likes}{' '}
                                              likes
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => openEditEpisodeFlow(series.id, ep.id)}
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 whitespace-nowrap"
                                          >
                                            <Pencil className="h-3 w-3" aria-hidden="true" />
                                            <span>{t(UI_TEXT.canvasDashboard.editBtn, lang)}</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => onDeleteEpisode(series.id, ep.id)}
                                            aria-label={t(UI_TEXT.canvasDashboard.deleteEpisode, lang)}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                                          >
                                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                                            <span>{t(UI_TEXT.canvasDashboard.deleteSeries, lang)}</span>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Community Canvas Catalog below */}
              {communityCanvasSeries.length > 0 && (
                <section className="mt-10">
                  <h2 className="border-b border-zinc-200 pb-3 text-base font-extrabold text-zinc-950">
                    {t(UI_TEXT.canvasDashboard.communityCanvasTitle, lang)}
                  </h2>
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 sm:gap-6">
                    {communityCanvasSeries.map((series) => (
                      <SeriesCard
                        key={series.id}
                        series={series}
                        lang={lang}
                        onSelect={onOpenSeries}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {activeTab === 'analytics' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <h1 className="text-lg font-extrabold text-zinc-950">
                {t(UI_TEXT.canvasDashboard.tabs.analytics, lang)}
              </h1>

              <div className="mt-6 grid grid-cols-2 gap-6 border-b border-zinc-100 pb-6 sm:grid-cols-4">
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.canvasDashboard.analyticsSeriesCount, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {stats.seriesCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.canvasDashboard.analyticsTotalViews, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {formatCompactNumber(stats.totalViews, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.canvasDashboard.analyticsSubscribers, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {formatCompactNumber(stats.totalSubs, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.canvasDashboard.analyticsLikes, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {formatCompactNumber(stats.totalLikes, lang)}
                  </div>
                </div>
              </div>

              {customSeries.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-zinc-600">
                    {t(UI_TEXT.canvasDashboard.analyticsEmpty, lang)}
                  </p>
                  <button
                    type="button"
                    onClick={openCreateFlow}
                    className="mt-4 cursor-pointer rounded-md bg-zinc-800 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-950"
                  >
                    {t(UI_TEXT.canvasDashboard.createSeries, lang)}
                  </button>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100">
                  {customSeries.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-4 py-3 text-xs"
                    >
                      <span className="truncate font-semibold text-zinc-900">
                        {t(s.title, lang)}
                      </span>
                      <span className="text-zinc-500 font-mono-num shrink-0">
                        {formatCompactNumber(s.viewsCount, lang)}{' '}
                        {t(UI_TEXT.home.viewsLabel, lang)}
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        {formatCompactNumber(s.subscribersCount, lang)}{' '}
                        {t(UI_TEXT.series.subscribers, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'comments' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <h1 className="text-lg font-extrabold text-zinc-950">
                {t(UI_TEXT.canvasDashboard.tabs.comments, lang)}
              </h1>

              {creatorComments.length === 0 ? (
                <p className="mt-6 text-sm text-zinc-600">
                  {t(UI_TEXT.canvasDashboard.commentsEmpty, lang)}
                </p>
              ) : (
                <div className="mt-4 divide-y divide-zinc-100">
                  {creatorComments.map(({ series, episodeNumber, comment }) => (
                    <div key={comment.id} className="py-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-900">
                          {comment.author}
                        </span>
                        <span>
                          {t(series.title, lang)} · {t(UI_TEXT.series.episodePrefix, lang)}{' '}
                          {episodeNumber}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-700">{comment.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'super_like' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <div className="flex items-center gap-2.5">
                <Heart className="h-5 w-5 text-[#00A84C]" aria-hidden="true" />
                <h1 className="text-lg font-extrabold text-zinc-950">Super Like</h1>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                {t(UI_TEXT.canvasDashboard.superLikeDesc, lang)}
              </p>
              <div className="mt-6 border-t border-zinc-100 pt-5">
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.canvasDashboard.analyticsLikes, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                  {formatCompactNumber(stats.totalLikes, lang)}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'ad_sharing' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <h1 className="text-lg font-extrabold text-zinc-950">
                {t(UI_TEXT.canvasDashboard.tabs.ad_sharing, lang)}
              </h1>
              <p className="mt-2 text-sm text-zinc-600">
                {t(UI_TEXT.canvasDashboard.adSharingDesc, lang)}
              </p>
              <div className="mt-6 space-y-5 border-t border-zinc-100 pt-5">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700">
                      {t(UI_TEXT.canvasDashboard.analyticsSubscribers, lang)}
                    </span>
                    <span className="font-mono-num text-zinc-600">
                      {stats.totalSubs} / 1,000
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-[#00DC64]"
                      style={{ width: `${Math.min(100, Math.round((stats.totalSubs / 1000) * 100))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700">
                      {t(UI_TEXT.canvasDashboard.analyticsTotalViews, lang)}
                    </span>
                    <span className="font-mono-num text-zinc-600">
                      {stats.totalViews.toLocaleString()} / 40,000
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-[#00DC64]"
                      style={{ width: `${Math.min(100, Math.round((stats.totalViews / 40000) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'lab' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <h1 className="text-lg font-extrabold text-zinc-950">
                {t(UI_TEXT.canvasDashboard.labTitle, lang)}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {t(UI_TEXT.canvasDashboard.labDesc, lang)}
              </p>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">
                      Speaker
                    </label>
                    <input
                      type="text"
                      value={labSpeaker}
                      onChange={(e) => setLabSpeaker(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">
                      Khmer Dialogue (ខ្មែរ)
                    </label>
                    <textarea
                      rows={2}
                      value={labKh}
                      onChange={(e) => setLabKh(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-zinc-700">
                      English Dialogue (ENG)
                    </label>
                    <textarea
                      rows={2}
                      value={labEn}
                      onChange={(e) => setLabEn(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-center rounded-lg border border-zinc-200 bg-zinc-900 p-6">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-zinc-950 shadow-sm">
                    <div className="text-[11px] font-bold text-[#00A84C]">
                      {labSpeaker || 'Character'}
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-relaxed">
                      {lang === 'kh' ? labKh : labEn}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'notice' && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <h1 className="text-lg font-extrabold text-zinc-950">
                  {t(UI_TEXT.canvasDashboard.tabs.notice, lang)}
                </h1>
                {unreadNoticeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReadNotices(CREATOR_NOTICES.map((n) => n.id))}
                    className="cursor-pointer text-xs font-semibold text-[#00A84C] hover:underline"
                  >
                    {t(UI_TEXT.canvasDashboard.noticeMarkAllRead, lang)}
                  </button>
                )}
              </div>

              <div className="mt-2 divide-y divide-zinc-100">
                {CREATOR_NOTICES.map((notice) => {
                  const isRead = readNotices.includes(notice.id);
                  return (
                    <div key={notice.id} className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <h2
                          className={`text-sm font-bold ${
                            isRead ? 'text-zinc-600' : 'text-zinc-950'
                          }`}
                        >
                          {t(notice.title, lang)}
                        </h2>
                        <span className="text-xs text-zinc-400 font-mono-num shrink-0">
                          {t(notice.date, lang)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-600">{t(notice.body, lang)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
