import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronLeft,
  Cloud,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import {
  ActivityAction,
  ActivityCategory,
  ActivityLogEntry,
  AdDailyMetricsMap,
  CommentItem,
  Episode,
  GenreKey,
  Language,
  SiteAdminConfig,
  SiteAdsConfig,
  StaffMember,
  StaffRole,
  UserProfile,
  WebtoonSeries,
  WeekdayKey,
} from '../types';
import { ActivityLog } from './ActivityLog';
import { AdPerformanceChart } from './AdPerformanceChart';
import { AddEpisodeForm } from './AddEpisodeForm';
import { AdminAdsManager } from './AdminAdsManager';

type AdminTab = 'overview' | 'catalog' | 'episodes' | 'comments' | 'ads' | 'team' | 'activity' | 'settings';

interface AdminPanelProps {
  lang: Language;
  onToggleLang: (next: Language) => void;
  userProfile: UserProfile | null;
  staffRole?: StaffRole;
  superAdminEmail?: string;
  staffMembers?: StaffMember[];
  activityLogs?: ActivityLogEntry[];
  activityLogsLoading?: boolean;
  activityLogsError?: string | null;
  onDismissActivityLogsError?: () => void;
  onRecordActivity?: (entry: {
    category: ActivityCategory;
    action: ActivityAction;
    targetId?: string;
    targetLabel: string;
    details?: string;
  }) => void | Promise<void>;
  isVerifiedAdmin: boolean;
  allSeries: WebtoonSeries[];
  customSeriesIds: string[];
  commentsByEpisode: Record<string, CommentItem[]>;
  siteConfig: SiteAdminConfig;
  adsConfig: SiteAdsConfig;
  adClickCounts: Record<string, number>;
  adMetricsByDate: AdDailyMetricsMap;
  syncingCloud: boolean;
  cloudError: string | null;
  lastCloudSyncAt: number | null;
  onUpdateSiteConfig: (next: SiteAdminConfig, syncCloud?: boolean) => Promise<void>;
  onUpdateAdsConfig: (next: SiteAdsConfig, syncCloud?: boolean) => Promise<void>;
  onResetSiteConfig: () => void;
  onAddStaffMember?: (input: {
    email: string;
    displayName: string;
    role: 'admin' | 'moderator';
    note?: string;
  }) => Promise<void>;
  onUpdateStaffRole?: (memberId: string, nextRole: 'admin' | 'moderator') => Promise<void>;
  onRemoveStaffMember?: (memberId: string) => Promise<void>;
  onCreateSeries: (series: WebtoonSeries) => void;
  onUpdateSeries: (seriesId: string, patch: Partial<WebtoonSeries>) => void;
  onDeleteCustomSeries: (seriesId: string) => void;
  onAddEpisode: (seriesId: string, episode: Episode) => void;
  onUpdateEpisode: (seriesId: string, episode: Episode) => void;
  onDeleteEpisode: (seriesId: string, episodeId: string) => void;
  onDeleteComment: (episodeId: string, commentId: string) => void;
  onOpenSeries: (seriesId: string) => void;
  onReadEpisode: (seriesId: string, episodeId: string) => void;
  onBackToSite: () => void;
}

const GENRES: Array<Exclude<GenreKey, 'all'>> = [
  'fantasy',
  'romance',
  'action',
  'mystery',
  'slice_of_life',
  'horror',
];

const WEEKDAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'completed'];

const COVER_PRESETS = [
  '/src/assets/images/hero_angkor_fantasy_1794804089621.jpg',
  '/src/assets/images/cover_monsoon_romance_1794804090527.jpg',
  '/src/assets/images/cover_phnom_penh_blade_1794804090579.jpg',
  '/src/assets/images/cover_lotus_mystery_1794804090854.jpg',
  '/src/assets/images/cover_street_food_slice_1794804091862.jpg',
];

const SIDEBAR_TABS: Array<{ id: AdminTab; icon: typeof LayoutDashboard }> = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'catalog', icon: BookOpen },
  { id: 'episodes', icon: Layers },
  { id: 'comments', icon: MessageSquare },
  { id: 'ads', icon: Megaphone },
  { id: 'team', icon: Users },
  { id: 'activity', icon: History },
  { id: 'settings', icon: Settings },
];

const BANNER_TEMPLATES: Array<{
  id: string;
  label: { kh: string; en: string };
  tone: 'emerald' | 'amber' | 'slate';
  kh: string;
  en: string;
}> = [
  {
    id: 'new_drop',
    label: { kh: 'ភាគថ្មីប្រចាំសប្តាហ៍', en: 'Weekly Episode Drop' },
    tone: 'emerald',
    kh: 'ភាគថ្មីប្រចាំសប្តាហ៍បានចេញផ្សាយហើយ! ចូលអានរឿងដើម WEBTOON កម្ពុជាដោយឥតគិតថ្លៃ។',
    en: 'New weekly episodes are live! Read original WEBTOON KH series free today.',
  },
  {
    id: 'canvas_call',
    label: { kh: 'អញ្ជើញអ្នកនិពន្ធ Canvas', en: 'Canvas Creator Call' },
    tone: 'slate',
    kh: 'Canvas កំពុងបើកទទួលស្នាដៃថ្មីពីអ្នកនិពន្ធឯករាជ្យកម្ពុជា។ បង្ហោះរឿងរបស់អ្នកថ្ងៃនេះ!',
    en: 'Canvas is open for independent Khmer comic creators. Publish your first episode today!',
  },
  {
    id: 'notice',
    label: { kh: 'សេចក្តីជូនដំណឹងប្រព័ន្ធ', en: 'Maintenance Notice' },
    tone: 'amber',
    kh: 'ការថែទាំប្រព័ន្ធនឹងប្រព្រឹត្តទៅនៅម៉ោង ០២:០០ ទៀបភ្លឺ ដើម្បីបង្កើនល្បឿនការអាន។',
    en: 'Scheduled maintenance tonight at 02:00 ICT to improve strip loading performance.',
  },
];

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsvFile(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob([`\uFEFF${csvLines.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export function AdminPanel({
  lang,
  onToggleLang,
  userProfile,
  staffRole = 'super_admin',
  superAdminEmail = 'chongmakio863@gmail.com',
  staffMembers = [],
  activityLogs = [],
  activityLogsLoading = false,
  activityLogsError = null,
  onDismissActivityLogsError,
  onRecordActivity,
  isVerifiedAdmin,
  allSeries,
  customSeriesIds,
  commentsByEpisode,
  siteConfig,
  adsConfig,
  adClickCounts,
  adMetricsByDate,
  syncingCloud,
  cloudError,
  lastCloudSyncAt,
  onUpdateSiteConfig,
  onUpdateAdsConfig,
  onResetSiteConfig,
  onAddStaffMember,
  onUpdateStaffRole,
  onRemoveStaffMember,
  onCreateSeries,
  onUpdateSeries,
  onDeleteCustomSeries,
  onAddEpisode,
  onUpdateEpisode,
  onDeleteEpisode,
  onDeleteComment,
  onOpenSeries,
  onReadEpisode,
  onBackToSite,
}: AdminPanelProps) {
  const isAdminRole = staffRole === 'super_admin' || staffRole === 'admin';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  useEffect(() => {
    if (!isAdminRole && (activeTab === 'ads' || activeTab === 'team' || activeTab === 'settings')) {
      setActiveTab('overview');
    }
  }, [isAdminRole, activeTab]);

  // Catalog filters & bulk state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | 'originals' | 'canvas'>('all');
  const [catalogGenreFilter, setCatalogGenreFilter] = useState<GenreKey>('all');
  const [catalogVisibilityFilter, setCatalogVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [selectedSeriesIds, setSelectedSeriesIds] = useState<string[]>([]);
  const [confirmDeleteSeriesId, setConfirmDeleteSeriesId] = useState<string | null>(null);

  // Episodes filters & studio state
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeSeriesFilter, setEpisodeSeriesFilter] = useState<string>('all');
  const [confirmDeleteEpisodeId, setConfirmDeleteEpisodeId] = useState<string | null>(null);
  const [episodeStudio, setEpisodeStudio] = useState<{
    mode: 'add' | 'edit';
    seriesId: string;
    episode?: Episode | null;
  } | null>(null);

  // Comments filters & bulk state
  const [commentSearch, setCommentSearch] = useState('');
  const [commentSeriesFilter, setCommentSeriesFilter] = useState<string>('all');
  const [selectedCommentKeys, setSelectedCommentKeys] = useState<string[]>([]);

  // Edit Series Modal state
  const [editingSeries, setEditingSeries] = useState<WebtoonSeries | null>(null);
  const [editTitleKh, setEditTitleKh] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editAuthorKh, setEditAuthorKh] = useState('');
  const [editAuthorEn, setEditAuthorEn] = useState('');
  const [editSynopsisKh, setEditSynopsisKh] = useState('');
  const [editSynopsisEn, setEditSynopsisEn] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editGenre, setEditGenre] = useState<Exclude<GenreKey, 'all'>>('fantasy');
  const [editScheduleDay, setEditScheduleDay] = useState<WeekdayKey>('mon');
  const [editViews, setEditViews] = useState(0);
  const [editSubscribers, setEditSubscribers] = useState(0);
  const [editRating, setEditRating] = useState(9.5);
  const [editIsCanvas, setEditIsCanvas] = useState(false);
  const [editIsNew, setEditIsNew] = useState(false);
  const [editCoverError, setEditCoverError] = useState<string | null>(null);
  const editCoverFileRef = useRef<HTMLInputElement | null>(null);

  // Create Series Modal state
  const [creatingNewSeries, setCreatingNewSeries] = useState(false);
  const [newTitleKh, setNewTitleKh] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newAuthor, setNewAuthor] = useState(userProfile?.displayName || 'WEBTOON KH Studio');
  const [newGenre, setNewGenre] = useState<Exclude<GenreKey, 'all'>>('fantasy');
  const [newDay, setNewDay] = useState<WeekdayKey>('mon');
  const [newIsCanvas, setNewIsCanvas] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState(COVER_PRESETS[0]);
  const [newSynopsisKh, setNewSynopsisKh] = useState('');
  const [newSynopsisEn, setNewSynopsisEn] = useState('');
  const newCoverFileRef = useRef<HTMLInputElement | null>(null);

  // Edit Episode Quick Metadata Modal state
  const [editingEpisodeModal, setEditingEpisodeModal] = useState<{
    series: WebtoonSeries;
    episode: Episode;
  } | null>(null);
  const [epNumInput, setEpNumInput] = useState(1);
  const [epTitleKhInput, setEpTitleKhInput] = useState('');
  const [epTitleEnInput, setEpTitleEnInput] = useState('');
  const [epDateInput, setEpDateInput] = useState('');
  const [epLikesInput, setEpLikesInput] = useState(0);

  // Site config draft
  const [draftConfig, setDraftConfig] = useState<SiteAdminConfig>(siteConfig);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  // Team & Roles state
  const [memberEmail, setMemberEmail] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState<'admin' | 'moderator'>('moderator');
  const [memberNote, setMemberNote] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState<'all' | 'admin' | 'moderator'>('all');
  const [teamFeedback, setTeamFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [teamBusy, setTeamBusy] = useState(false);
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);

  useEffect(() => {
    setDraftConfig(siteConfig);
  }, [siteConfig]);

  const filteredStaffMembers = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    return staffMembers.filter((m) => {
      if (teamRoleFilter !== 'all' && m.role !== teamRoleFilter) return false;
      if (q) {
        const hay = `${m.displayName} ${m.email} ${m.note ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [staffMembers, teamSearch, teamRoleFilter]);

  const showTeamFeedback = (type: 'success' | 'error', text: string) => {
    setTeamFeedback({ type, text });
    window.setTimeout(() => {
      setTeamFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddStaffMember) return;
    const cleanEmail = memberEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showTeamFeedback('error', t(UI_TEXT.adminPanel.emailValidationError, lang));
      return;
    }
    if (cleanEmail === superAdminEmail.toLowerCase()) {
      showTeamFeedback('error', t(UI_TEXT.adminPanel.superAdminProtected, lang));
      return;
    }
    if (staffMembers.some((m) => m.email.toLowerCase() === cleanEmail)) {
      showTeamFeedback('error', t(UI_TEXT.adminPanel.duplicateEmailError, lang));
      return;
    }

    setTeamBusy(true);
    try {
      await onAddStaffMember({
        email: cleanEmail,
        displayName: memberName.trim() || cleanEmail.split('@')[0],
        role: memberRole,
        note: memberNote.trim(),
      });
      setMemberEmail('');
      setMemberName('');
      setMemberNote('');
      showTeamFeedback('success', t(UI_TEXT.adminPanel.memberAddedSuccess, lang));
    } finally {
      setTeamBusy(false);
    }
  };

  const customIdSet = useMemo(() => new Set(customSeriesIds), [customSeriesIds]);

  const seriesById = useMemo(
    () => new Map(allSeries.map((s) => [s.id, s])),
    [allSeries],
  );

  const featuredSeriesQueue = useMemo(() => {
    return siteConfig.featuredSeriesIds
      .map((id) => seriesById.get(id))
      .filter((s): s is WebtoonSeries => Boolean(s));
  }, [siteConfig.featuredSeriesIds, seriesById]);

  const hiddenSeriesList = useMemo(() => {
    return siteConfig.hiddenSeriesIds
      .map((id) => seriesById.get(id))
      .filter((s): s is WebtoonSeries => Boolean(s));
  }, [siteConfig.hiddenSeriesIds, seriesById]);

  const metrics = useMemo(() => {
    const totalSeries = allSeries.length;
    const originalsCount = allSeries.filter((s) => !s.isCanvas).length;
    const canvasCount = allSeries.filter((s) => s.isCanvas).length;
    const totalEpisodes = allSeries.reduce((acc, s) => acc + s.episodes.length, 0);
    const totalPanels = allSeries.reduce(
      (acc, s) => acc + s.episodes.reduce((epAcc, ep) => epAcc + ep.panels.length, 0),
      0,
    );
    const totalViews = allSeries.reduce((acc, s) => acc + s.viewsCount, 0);
    const totalSubscribers = allSeries.reduce((acc, s) => acc + s.subscribersCount, 0);
    const avgRating =
      totalSeries > 0
        ? (allSeries.reduce((acc, s) => acc + s.rating, 0) / totalSeries).toFixed(1)
        : '0.0';
    const totalComments = Object.values(commentsByEpisode).reduce(
      (acc, list) => acc + list.length,
      0,
    );

    const genreCounts = GENRES.map((g) => ({
      genre: g,
      count: allSeries.filter((s) => s.genre === g).length,
    }));

    const scheduleCounts = WEEKDAYS.map((day) => ({
      day,
      count: allSeries.filter((s) => s.scheduleDay === day).length,
    }));

    const topSeries = [...allSeries].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 5);

    return {
      totalSeries,
      originalsCount,
      canvasCount,
      totalEpisodes,
      totalPanels,
      totalViews,
      totalSubscribers,
      avgRating,
      totalComments,
      hiddenCount: siteConfig.hiddenSeriesIds.length,
      featuredCount: siteConfig.featuredSeriesIds.length,
      genreCounts,
      scheduleCounts,
      topSeries,
    };
  }, [allSeries, commentsByEpisode, siteConfig]);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return allSeries.filter((s) => {
      if (catalogTypeFilter === 'originals' && s.isCanvas) return false;
      if (catalogTypeFilter === 'canvas' && !s.isCanvas) return false;
      if (catalogGenreFilter !== 'all' && s.genre !== catalogGenreFilter) return false;
      const isHidden = siteConfig.hiddenSeriesIds.includes(s.id);
      if (catalogVisibilityFilter === 'visible' && isHidden) return false;
      if (catalogVisibilityFilter === 'hidden' && !isHidden) return false;
      if (q) {
        const hay = `${s.title.kh} ${s.title.en} ${s.author.kh} ${s.author.en} ${s.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allSeries,
    catalogSearch,
    catalogTypeFilter,
    catalogGenreFilter,
    catalogVisibilityFilter,
    siteConfig.hiddenSeriesIds,
  ]);

  const flattenedEpisodes = useMemo(() => {
    const q = episodeSearch.trim().toLowerCase();
    const list: Array<{ series: WebtoonSeries; episode: Episode }> = [];
    for (const s of allSeries) {
      if (episodeSeriesFilter !== 'all' && s.id !== episodeSeriesFilter) continue;
      for (const ep of s.episodes) {
        if (q) {
          const hay = `${s.title.kh} ${s.title.en} ${ep.title.kh} ${ep.title.en} ${ep.number}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        list.push({ series: s, episode: ep });
      }
    }
    return list;
  }, [allSeries, episodeSearch, episodeSeriesFilter]);

  const flattenedComments = useMemo(() => {
    const q = commentSearch.trim().toLowerCase();
    const list: Array<{
      key: string;
      seriesTitle: { kh: string; en: string };
      seriesId: string;
      episodeId: string;
      episodeNumber: number;
      comment: CommentItem;
    }> = [];

    for (const [epId, items] of Object.entries(commentsByEpisode)) {
      const series = allSeries.find((s) => s.episodes.some((e) => e.id === epId));
      if (commentSeriesFilter !== 'all' && series?.id !== commentSeriesFilter) continue;
      const episode = series?.episodes.find((e) => e.id === epId);
      for (const c of items) {
        if (q) {
          const hay = `${c.author} ${c.text} ${series?.title.kh ?? ''} ${series?.title.en ?? ''}`.toLowerCase();
          if (!hay.includes(q)) continue;
        }
        list.push({
          key: `${epId}::${c.id}`,
          seriesId: series?.id ?? '',
          seriesTitle: series?.title ?? { kh: epId, en: epId },
          episodeId: epId,
          episodeNumber: episode?.number ?? 1,
          comment: c,
        });
      }
    }
    return list;
  }, [allSeries, commentsByEpisode, commentSearch, commentSeriesFilter]);

  const openEditSeriesModal = (series: WebtoonSeries) => {
    setEditingSeries(series);
    setEditTitleKh(series.title.kh);
    setEditTitleEn(series.title.en);
    setEditAuthorKh(series.author.kh);
    setEditAuthorEn(series.author.en);
    setEditSynopsisKh(series.synopsis.kh);
    setEditSynopsisEn(series.synopsis.en);
    setEditCoverUrl(series.coverUrl);
    setEditBannerUrl(series.bannerUrl);
    setEditGenre(series.genre);
    setEditScheduleDay(series.scheduleDay);
    setEditViews(series.viewsCount);
    setEditSubscribers(series.subscribersCount);
    setEditRating(series.rating);
    setEditIsCanvas(Boolean(series.isCanvas));
    setEditIsNew(Boolean(series.isNew));
    setEditCoverError(null);
  };

  const handleUploadSeriesCover = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'edit' | 'create',
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setEditCoverError(
        lang === 'kh'
          ? 'អនុញ្ញាតតែទម្រង់ JPG, PNG ឬ WebP ប៉ុណ្ណោះ។'
          : 'Only JPG, PNG, and WebP formats are supported.',
      );
      return;
    }
    if (file.size > 500 * 1024) {
      setEditCoverError(
        lang === 'kh'
          ? 'ទំហំរូបភាពគម្របត្រូវតិចជាង 500KB។'
          : 'Cover image must be under 500KB.',
      );
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setEditCoverError(null);
      if (target === 'edit') {
        setEditCoverUrl(dataUrl);
      } else {
        setNewCoverUrl(dataUrl);
      }
    } catch {
      setEditCoverError('Could not read selected image');
    }
  };

  const handleSaveSeriesEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeries) return;
    const cleanCover = editCoverUrl.trim() || editingSeries.coverUrl;
    const cleanBanner = editBannerUrl.trim() || cleanCover;
    onUpdateSeries(editingSeries.id, {
      title: {
        kh: editTitleKh.trim() || editingSeries.title.kh,
        en: editTitleEn.trim() || editingSeries.title.en,
      },
      author: {
        kh: editAuthorKh.trim() || editingSeries.author.kh,
        en: editAuthorEn.trim() || editingSeries.author.en,
      },
      synopsis: {
        kh: editSynopsisKh.trim() || editingSeries.synopsis.kh,
        en: editSynopsisEn.trim() || editingSeries.synopsis.en,
      },
      coverUrl: cleanCover,
      bannerUrl: cleanBanner,
      genre: editGenre,
      scheduleDay: editScheduleDay,
      viewsCount: Math.max(0, Math.round(editViews || 0)),
      subscribersCount: Math.max(0, Math.round(editSubscribers || 0)),
      rating: Math.max(1, Math.min(10, Number(editRating) || 9.5)),
      isCanvas: editIsCanvas,
      isNew: editIsNew,
    });
    void onRecordActivity?.({
      category: 'series',
      action: 'series_updated',
      targetId: editingSeries.id,
      targetLabel: editTitleEn.trim() || editTitleKh.trim() || editingSeries.title.en,
      details: `${editGenre} · ${editScheduleDay}`,
    });
    setEditingSeries(null);
  };

  const handleCreateOfficialSeries = (e: React.FormEvent) => {
    e.preventDefault();
    const khTitle = newTitleKh.trim() || newTitleEn.trim();
    const enTitle = newTitleEn.trim() || newTitleKh.trim();
    if (!khTitle && !enTitle) return;

    const id = `admin-series-${Date.now()}`;
    const coverUrl = newCoverUrl.trim() || COVER_PRESETS[allSeries.length % COVER_PRESETS.length];
    const authorName = newAuthor.trim() || 'WEBTOON KH Studio';

    const created: WebtoonSeries = {
      id,
      title: { kh: khTitle, en: enTitle },
      author: { kh: authorName, en: authorName },
      genre: newGenre,
      scheduleDay: newDay,
      isCanvas: newIsCanvas,
      isNew: true,
      coverUrl,
      bannerUrl: coverUrl,
      accentColor: '#00DC64',
      synopsis: {
        kh: newSynopsisKh.trim() || newSynopsisEn.trim() || khTitle,
        en: newSynopsisEn.trim() || newSynopsisKh.trim() || enTitle,
      },
      viewsCount: 0,
      subscribersCount: 0,
      rating: 9.8,
      episodes: [
        {
          id: `${id}-ep-1`,
          number: 1,
          title: { kh: 'ភាគទី ១ — ការចាប់ផ្តើម', en: 'Episode 1 — Prologue' },
          publishedDate: { kh: 'ថ្ងៃនេះ', en: 'Today' },
          likes: 0,
          thumbnailUrl: coverUrl,
          panels: [
            {
              id: `${id}-ep-1-p1`,
              imageUrl: coverUrl,
              sceneTheme: 'sanctuary',
              caption: {
                kh: newSynopsisKh.trim() || khTitle,
                en: newSynopsisEn.trim() || enTitle,
              },
              bubbles: [],
            },
          ],
        },
      ],
    };

    onCreateSeries(created);
    void onRecordActivity?.({
      category: 'series',
      action: 'series_created',
      targetId: created.id,
      targetLabel: created.title.en || created.title.kh,
      details: created.isCanvas ? 'Canvas' : 'Original',
    });
    setCreatingNewSeries(false);
    setNewTitleKh('');
    setNewTitleEn('');
    setNewSynopsisKh('');
    setNewSynopsisEn('');
    setNewCoverUrl(COVER_PRESETS[(allSeries.length + 1) % COVER_PRESETS.length]);
  };

  const openEditEpisodeModal = (series: WebtoonSeries, episode: Episode) => {
    setEditingEpisodeModal({ series, episode });
    setEpNumInput(episode.number);
    setEpTitleKhInput(episode.title.kh);
    setEpTitleEnInput(episode.title.en);
    setEpDateInput(episode.publishedDate.en);
    setEpLikesInput(episode.likes);
  };

  const handleSaveEpisodeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisodeModal) return;
    const { series, episode } = editingEpisodeModal;
    onUpdateEpisode(series.id, {
      ...episode,
      number: Math.max(1, Math.round(epNumInput || episode.number)),
      title: {
        kh: epTitleKhInput.trim() || episode.title.kh,
        en: epTitleEnInput.trim() || episode.title.en,
      },
      publishedDate: {
        kh: epDateInput.trim() || episode.publishedDate.kh,
        en: epDateInput.trim() || episode.publishedDate.en,
      },
      likes: Math.max(0, Math.round(epLikesInput || 0)),
    });
    void onRecordActivity?.({
      category: 'episode',
      action: 'episode_updated',
      targetId: episode.id,
      targetLabel: `${series.title.en || series.title.kh} #${Math.max(1, Math.round(epNumInput || episode.number))}`,
      details: epTitleEnInput.trim() || epTitleKhInput.trim() || episode.title.en,
    });
    setEditingEpisodeModal(null);
  };

  const toggleSeriesVisibility = (seriesId: string) => {
    const targetSeries = seriesById.get(seriesId);
    const isHidden = siteConfig.hiddenSeriesIds.includes(seriesId);
    const nextHidden = isHidden
      ? siteConfig.hiddenSeriesIds.filter((id) => id !== seriesId)
      : [...siteConfig.hiddenSeriesIds, seriesId].slice(0, 100);
    const next = { ...siteConfig, hiddenSeriesIds: nextHidden };
    setDraftConfig(next);
    void onUpdateSiteConfig(next, isVerifiedAdmin);
    void onRecordActivity?.({
      category: 'series',
      action: isHidden ? 'series_restored' : 'series_hidden',
      targetId: seriesId,
      targetLabel: targetSeries ? targetSeries.title.en || targetSeries.title.kh : seriesId,
    });
  };

  const toggleSeriesFeatured = (seriesId: string) => {
    const targetSeries = seriesById.get(seriesId);
    const isFeatured = siteConfig.featuredSeriesIds.includes(seriesId);
    const nextFeatured = isFeatured
      ? siteConfig.featuredSeriesIds.filter((id) => id !== seriesId)
      : [...siteConfig.featuredSeriesIds, seriesId].slice(0, 20);
    const next = { ...siteConfig, featuredSeriesIds: nextFeatured };
    setDraftConfig(next);
    void onUpdateSiteConfig(next, isVerifiedAdmin);
    void onRecordActivity?.({
      category: 'series',
      action: isFeatured ? 'series_unfeatured' : 'series_featured',
      targetId: seriesId,
      targetLabel: targetSeries ? targetSeries.title.en || targetSeries.title.kh : seriesId,
    });
  };

  const moveFeaturedSeries = (index: number, direction: -1 | 1) => {
    const ids = featuredSeriesQueue.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const copy = [...ids];
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    const movedSeries = seriesById.get(ids[index]);
    const next = { ...siteConfig, featuredSeriesIds: copy };
    setDraftConfig(next);
    void onUpdateSiteConfig(next, isVerifiedAdmin);
    void onRecordActivity?.({
      category: 'series',
      action: 'series_reordered',
      targetId: ids[index],
      targetLabel: movedSeries ? movedSeries.title.en || movedSeries.title.kh : ids[index],
      details: `Position #${index + 1} -> #${target + 1}`,
    });
  };

  const handleBulkCatalogAction = (action: 'pin' | 'hide' | 'restore') => {
    if (selectedSeriesIds.length === 0) return;
    const count = selectedSeriesIds.length;
    let nextHidden = [...siteConfig.hiddenSeriesIds];
    let nextFeatured = [...siteConfig.featuredSeriesIds];

    if (action === 'hide') {
      nextHidden = Array.from(new Set([...nextHidden, ...selectedSeriesIds])).slice(0, 100);
    } else if (action === 'restore') {
      const selSet = new Set(selectedSeriesIds);
      nextHidden = nextHidden.filter((id) => !selSet.has(id));
    } else if (action === 'pin') {
      nextFeatured = Array.from(new Set([...nextFeatured, ...selectedSeriesIds])).slice(0, 20);
    }

    const next: SiteAdminConfig = {
      ...siteConfig,
      hiddenSeriesIds: nextHidden,
      featuredSeriesIds: nextFeatured,
    };
    setDraftConfig(next);
    void onUpdateSiteConfig(next, isVerifiedAdmin);
    void onRecordActivity?.({
      category: 'series',
      action:
        action === 'hide'
          ? 'series_hidden'
          : action === 'restore'
            ? 'series_restored'
            : 'series_featured',
      targetLabel: `${count} series`,
      details: 'Bulk catalog action',
    });
    setSelectedSeriesIds([]);
  };

  const handleRestoreAllHidden = () => {
    const count = siteConfig.hiddenSeriesIds.length;
    const next: SiteAdminConfig = { ...siteConfig, hiddenSeriesIds: [] };
    setDraftConfig(next);
    void onUpdateSiteConfig(next, isVerifiedAdmin);
    if (count > 0) {
      void onRecordActivity?.({
        category: 'series',
        action: 'series_restored',
        targetLabel: `${count} hidden series`,
        details: 'Restore all hidden series',
      });
    }
  };

  const handleExportCatalogCsv = () => {
    downloadCsvFile(
      'webtoon-kh-catalog.csv',
      ['ID', 'Title (EN)', 'Title (KH)', 'Author', 'Type', 'Genre', 'Schedule', 'Episodes', 'Views', 'Subscribers', 'Rating', 'Visibility', 'Featured'],
      filteredCatalog.map((s) => [
        s.id,
        s.title.en,
        s.title.kh,
        s.author.en,
        s.isCanvas ? 'Canvas' : 'Original',
        s.genre,
        s.scheduleDay,
        s.episodes.length,
        s.viewsCount,
        s.subscribersCount,
        s.rating,
        siteConfig.hiddenSeriesIds.includes(s.id) ? 'Hidden' : 'Visible',
        siteConfig.featuredSeriesIds.includes(s.id) ? 'Featured' : 'Standard',
      ]),
    );
  };

  const handleExportEpisodesCsv = () => {
    downloadCsvFile(
      'webtoon-kh-episodes.csv',
      ['Episode ID', 'Series', 'Episode #', 'Title (EN)', 'Title (KH)', 'Panels', 'Likes', 'Published'],
      flattenedEpisodes.map(({ series, episode }) => [
        episode.id,
        series.title.en,
        episode.number,
        episode.title.en,
        episode.title.kh,
        episode.panels.length,
        episode.likes,
        episode.publishedDate.en,
      ]),
    );
  };

  const handleBulkDeleteComments = () => {
    const count = selectedCommentKeys.length;
    for (const key of selectedCommentKeys) {
      const [epId, commentId] = key.split('::');
      if (epId && commentId) {
        onDeleteComment(epId, commentId);
      }
    }
    if (count > 0) {
      void onRecordActivity?.({
        category: 'comment',
        action: 'comment_deleted',
        targetLabel: `${count} comments`,
        details: 'Bulk comment moderation',
      });
    }
    setSelectedCommentKeys([]);
  };

  const handleSaveSettings = async (syncCloud: boolean) => {
    const cleaned: SiteAdminConfig = {
      ...draftConfig,
      announcementKh: draftConfig.announcementKh.slice(0, 200),
      announcementEn: draftConfig.announcementEn.slice(0, 200),
    };
    await onUpdateSiteConfig(cleaned, syncCloud);
    void onRecordActivity?.({
      category: 'settings',
      action: 'settings_updated',
      targetLabel: syncCloud && isVerifiedAdmin ? 'Storefront Config (Cloud)' : 'Storefront Config (Local)',
      details: `Banner: ${cleaned.announcementEnabled ? cleaned.announcementTone : 'off'} · Canvas: ${cleaned.canvasSubmissionsEnabled ? 'open' : 'closed'}`,
    });
    setSettingsSavedMsg(
      syncCloud && isVerifiedAdmin
        ? t(UI_TEXT.adminPanel.firestoreSynced, lang)
        : t(UI_TEXT.adminPanel.settingsSaved, lang),
    );
    window.setTimeout(() => setSettingsSavedMsg(null), 3500);
  };

  const previewBannerMessage =
    lang === 'kh'
      ? draftConfig.announcementKh.trim() || draftConfig.announcementEn.trim()
      : draftConfig.announcementEn.trim() || draftConfig.announcementKh.trim();

  const allCatalogVisibleSelected =
    filteredCatalog.length > 0 &&
    filteredCatalog.every((s) => selectedSeriesIds.includes(s.id));

  const allCommentsVisibleSelected =
    flattenedComments.length > 0 &&
    flattenedComments.every((c) => selectedCommentKeys.includes(c.key));

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToSite}
            className="flex cursor-pointer items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00DC64]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-[#00DC64]">
              <Shield className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-tight text-zinc-950 whitespace-nowrap">
                WEBTOON KH · {t(UI_TEXT.adminPanel.consoleTitle, lang)}
              </div>
              <div className="truncate text-[11px] text-zinc-500">
                {t(UI_TEXT.adminPanel.tabs[activeTab], lang)}
                {lastCloudSyncAt && (
                  <>
                    {' · '}
                    <span className="font-mono-num">
                      {new Date(lastCloudSyncAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isVerifiedAdmin && isAdminRole && (
            <button
              type="button"
              disabled={syncingCloud}
              onClick={() => void handleSaveSettings(true)}
              className="hidden sm:inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Cloud className="h-3.5 w-3.5 text-[#00DC64]" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.syncNowBtn, lang)}</span>
            </button>
          )}

          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => onToggleLang('kh')}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                lang === 'kh' ? 'bg-[#00DC64] text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ខ្មែរ
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`cursor-pointer rounded-md px-2 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                lang === 'en' ? 'bg-[#00DC64] text-zinc-950' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ENG
            </button>
          </div>

          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t(UI_TEXT.adminPanel.backToStorefront, lang)}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full shrink-0 border-b border-zinc-200 bg-white px-4 py-5 md:w-64 md:border-b-0 md:border-r">
          <div
            className={`mb-4 rounded-lg border px-3.5 py-2.5 ${
              staffRole === 'moderator'
                ? 'border-zinc-200 bg-zinc-50'
                : 'border-emerald-200 bg-emerald-50/70'
            }`}
          >
            <div
              className={`text-[11px] font-semibold ${
                staffRole === 'moderator' ? 'text-zinc-700' : 'text-emerald-800'
              }`}
            >
              {staffRole === 'super_admin'
                ? t(UI_TEXT.adminPanel.superAdminBadge, lang)
                : staffRole === 'admin'
                  ? t(UI_TEXT.adminPanel.adminConsoleBadge, lang)
                  : t(UI_TEXT.adminPanel.moderatorConsoleBadge, lang)}
            </div>
            <div className="mt-0.5 truncate text-xs font-bold text-zinc-950">
              {userProfile?.email || superAdminEmail}
            </div>
          </div>

          <nav
            aria-label="Admin sections"
            className="flex flex-row gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0 no-scrollbar"
          >
            {SIDEBAR_TABS.filter(
              ({ id }) => isAdminRole || (id !== 'ads' && id !== 'team' && id !== 'settings'),
            ).map(({ id, icon: Icon }) => {
              const active = activeTab === id;
              const activeAdsCount = adsConfig.campaigns.filter((c) => c.isActive).length;
              const badgeCount =
                id === 'catalog'
                  ? metrics.totalSeries
                  : id === 'episodes'
                    ? metrics.totalEpisodes
                    : id === 'comments'
                      ? metrics.totalComments
                      : id === 'ads'
                        ? activeAdsCount
                        : id === 'team'
                          ? staffMembers.length + 1
                          : id === 'activity'
                            ? activityLogs.length
                            : null;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (id !== 'episodes') {
                      setEpisodeStudio(null);
                    }
                  }}
                  className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-zinc-950 font-bold text-white'
                      : 'font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${active ? 'text-[#00DC64]' : 'text-zinc-500'}`}
                      aria-hidden="true"
                    />
                    <span>{t(UI_TEXT.adminPanel.tabs[id], lang)}</span>
                  </span>
                  {badgeCount !== null && (
                    <span
                      className={`text-[11px] font-mono-num ${
                        active ? 'text-zinc-300' : 'text-zinc-400'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Storefront Health Summary */}
          <div className="mt-6 hidden border-t border-zinc-100 pt-4 text-xs text-zinc-500 md:block space-y-2">
            <div className="flex items-center justify-between">
              <span>{t(UI_TEXT.adminPanel.featuredLabel, lang)}</span>
              <span className="font-bold text-zinc-900 font-mono-num">
                {metrics.featuredCount > 0 ? metrics.featuredCount : 'Auto (4)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t(UI_TEXT.adminPanel.statusHidden, lang)}</span>
              <span className="font-bold text-zinc-900 font-mono-num">{metrics.hiddenCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{t(UI_TEXT.adminPanel.kpiPanels, lang)}</span>
              <span className="font-bold text-zinc-900 font-mono-num">{metrics.totalPanels}</span>
            </div>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 px-4 py-6 sm:px-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                  {t(UI_TEXT.adminPanel.tabs.overview, lang)}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCatalogCsv}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.exportCsvBtn, lang)}</span>
                  </button>
                  {isAdminRole && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('episodes');
                          setEpisodeStudio({
                            mode: 'add',
                            seriesId: allSeries[0]?.id ?? '',
                            episode: null,
                          });
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t(UI_TEXT.adminPanel.addEpisodeBtn, lang)}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('catalog');
                          setCreatingNewSeries(true);
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t(UI_TEXT.adminPanel.addSeriesBtn, lang)}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.kpiSeries, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {metrics.totalSeries}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 font-mono-num">
                    {metrics.originalsCount} Orig · {metrics.canvasCount} Canvas
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.kpiEpisodes, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {metrics.totalEpisodes}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 font-mono-num">
                    {metrics.totalPanels} {t(UI_TEXT.adminPanel.kpiPanels, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.kpiViews, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {formatCompactNumber(metrics.totalViews, lang)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 font-mono-num">
                    {t(UI_TEXT.adminPanel.kpiAvgRating, lang)}: {metrics.avgRating}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.kpiSubscribers, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {formatCompactNumber(metrics.totalSubscribers, lang)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500 font-mono-num">
                    {metrics.hiddenCount} {t(UI_TEXT.adminPanel.statusHidden, lang)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.kpiComments, lang)}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                    {metrics.totalComments}
                  </div>
                </div>
              </div>

              {/* Row 2: Genre Breakdown & Weekly Release Schedule */}
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.genreBreakdown, lang)}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {metrics.genreCounts.map(({ genre, count }) => {
                      const pct =
                        metrics.totalSeries > 0
                          ? Math.round((count / metrics.totalSeries) * 100)
                          : 0;
                      return (
                        <div key={genre}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-800">
                              {t(UI_TEXT.genres[genre], lang)}
                            </span>
                            <span className="text-zinc-500 font-mono-num">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-[#00DC64]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.scheduleBreakdown, lang)}
                  </h2>
                  <div className="mt-6 grid grid-cols-4 gap-3 sm:grid-cols-8 items-end">
                    {metrics.scheduleCounts.map(({ day, count }) => {
                      const maxCount = Math.max(
                        1,
                        ...metrics.scheduleCounts.map((item) => item.count),
                      );
                      const heightPct = count > 0 ? Math.max(16, Math.round((count / maxCount) * 100)) : 6;
                      return (
                        <div key={day} className="flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-zinc-700 font-mono-num">
                            {count}
                          </span>
                          <div className="flex h-28 w-full items-end rounded-lg bg-zinc-100 p-1">
                            <div
                              className={`w-full rounded-md transition-all ${
                                count > 0 ? 'bg-zinc-950' : 'bg-zinc-200'
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-zinc-500 text-center truncate max-w-full">
                            {day === 'completed'
                              ? lang === 'kh'
                                ? 'ចប់'
                                : 'Done'
                              : t(UI_TEXT.shortWeekdays[day], lang)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Row 3: Sponsor Ad Performance & CTR Trends */}
              {isAdminRole && (
                <AdPerformanceChart
                  lang={lang}
                  adsEnabled={adsConfig.adsEnabled}
                  campaigns={adsConfig.campaigns}
                  adClickCounts={adClickCounts}
                  adMetricsByDate={adMetricsByDate}
                  onNavigateToAds={() => setActiveTab('ads')}
                />
              )}

              {/* Row 4: Hero Showcase Queue & Top 5 Series */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Hero Showcase Queue */}
                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-950">
                        {t(UI_TEXT.adminPanel.heroQueueHeading, lang)}
                      </h2>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {t(UI_TEXT.adminPanel.heroQueueSub, lang)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalog')}
                      className="cursor-pointer text-xs font-semibold text-[#00A84C] hover:underline whitespace-nowrap shrink-0"
                    >
                      {t(UI_TEXT.adminPanel.tabs.catalog, lang)} →
                    </button>
                  </div>

                  {featuredSeriesQueue.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 p-4 text-xs text-zinc-500">
                      {t(UI_TEXT.adminPanel.heroQueueEmpty, lang)}
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-zinc-100">
                      {featuredSeriesQueue.map((series, idx) => (
                        <div
                          key={series.id}
                          className="flex items-center justify-between gap-3 py-2.5 text-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 font-extrabold text-zinc-400 font-mono-num">
                              {idx + 1}
                            </span>
                            <img
                              src={series.coverUrl}
                              alt={t(series.title, lang)}
                              referrerPolicy="no-referrer"
                              className="h-10 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                            />
                            <div className="min-w-0">
                              <div className="truncate font-bold text-zinc-950">
                                {t(series.title, lang)}
                              </div>
                              <div className="truncate text-[11px] text-zinc-500">
                                {t(UI_TEXT.genres[series.genre], lang)} · {series.episodes.length}{' '}
                                {t(UI_TEXT.series.episodesUnit, lang)}
                              </div>
                            </div>
                          </div>

                          {isAdminRole && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveFeaturedSeries(idx, -1)}
                                aria-label={t(UI_TEXT.adminPanel.moveUp, lang)}
                                className="cursor-pointer rounded border border-zinc-200 p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
                              >
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === featuredSeriesQueue.length - 1}
                                onClick={() => moveFeaturedSeries(idx, 1)}
                                aria-label={t(UI_TEXT.adminPanel.moveDown, lang)}
                                className="cursor-pointer rounded border border-zinc-200 p-1 text-zinc-600 hover:bg-zinc-50 disabled:opacity-35"
                              >
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSeriesFeatured(series.id)}
                                aria-label={t(UI_TEXT.adminPanel.actionUnfeature, lang)}
                                className="cursor-pointer rounded border border-zinc-200 p-1 text-rose-600 hover:bg-rose-50"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Top 5 Series by Views */}
                <section className="rounded-xl border border-zinc-200 bg-white p-6">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.topSeriesByViews, lang)}
                  </h2>
                  <div className="mt-4 divide-y divide-zinc-100">
                    {metrics.topSeries.map((s, idx) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-5 font-extrabold text-zinc-400 font-mono-num">
                            {idx + 1}
                          </span>
                          <img
                            src={s.coverUrl}
                            alt={t(s.title, lang)}
                            referrerPolicy="no-referrer"
                            className="h-10 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold text-zinc-950">
                              {t(s.title, lang)}
                            </div>
                            <div className="truncate text-[11px] text-zinc-500">
                              {t(UI_TEXT.genres[s.genre], lang)} · {s.episodes.length}{' '}
                              {t(UI_TEXT.series.episodesUnit, lang)}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 font-bold text-zinc-700 font-mono-num">
                          {formatCompactNumber(s.viewsCount, lang)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Row 4: Recent Comments Moderation Feed */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.recentCommentsHeading, lang)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('comments')}
                    className="cursor-pointer text-xs font-semibold text-[#00A84C] hover:underline whitespace-nowrap shrink-0"
                  >
                    {t(UI_TEXT.adminPanel.viewAllComments, lang)} ({metrics.totalComments}) →
                  </button>
                </div>
                {flattenedComments.length === 0 ? (
                  <p className="mt-4 text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.commentsEmpty, lang)}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-zinc-100">
                    {flattenedComments.slice(0, 4).map(({ key, seriesTitle, episodeId, episodeNumber, comment }) => (
                      <div key={key} className="flex items-start justify-between gap-4 py-3 text-xs">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-zinc-950">{comment.author}</span>
                            <span className="text-zinc-400">·</span>
                            <span className="text-zinc-500 font-mono-num">
                              {t(seriesTitle, lang)} — #{episodeNumber}
                            </span>
                            <span className="text-zinc-400">·</span>
                            <span className="text-zinc-400">{t(comment.timestamp, lang)}</span>
                          </div>
                          <p className="mt-1 text-zinc-700 line-clamp-2">{comment.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteComment(episodeId, comment.id);
                            void onRecordActivity?.({
                              category: 'comment',
                              action: 'comment_deleted',
                              targetId: comment.id,
                              targetLabel: `${comment.author} (${t(seriesTitle, 'en')} #${episodeNumber})`,
                              details: comment.text.slice(0, 120),
                            });
                          }}
                          aria-label={t(UI_TEXT.adminPanel.actionDelete, lang)}
                          className="cursor-pointer rounded border border-zinc-200 p-1.5 text-rose-600 hover:bg-rose-50 shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: CATALOG & SERIES */}
          {activeTab === 'catalog' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                  {t(UI_TEXT.adminPanel.tabs.catalog, lang)}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCatalogCsv}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.exportCsvBtn, lang)}</span>
                  </button>
                  {isAdminRole && (
                    <button
                      type="button"
                      onClick={() => setCreatingNewSeries(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t(UI_TEXT.adminPanel.addSeriesBtn, lang)}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 lg:max-w-xs">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder={t(UI_TEXT.adminPanel.searchCatalogPlaceholder, lang)}
                    className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={catalogTypeFilter}
                    onChange={(e) =>
                      setCatalogTypeFilter(e.target.value as 'all' | 'originals' | 'canvas')
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                  >
                    <option value="all">{t(UI_TEXT.adminPanel.allTypes, lang)}</option>
                    <option value="originals">{t(UI_TEXT.adminPanel.originalsOnly, lang)}</option>
                    <option value="canvas">{t(UI_TEXT.adminPanel.canvasOnly, lang)}</option>
                  </select>

                  <select
                    value={catalogGenreFilter}
                    onChange={(e) => setCatalogGenreFilter(e.target.value as GenreKey)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                  >
                    <option value="all">{t(UI_TEXT.genres.all, lang)}</option>
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {t(UI_TEXT.genres[g], lang)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={catalogVisibilityFilter}
                    onChange={(e) =>
                      setCatalogVisibilityFilter(e.target.value as 'all' | 'visible' | 'hidden')
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                  >
                    <option value="all">{t(UI_TEXT.adminPanel.visibilityAll, lang)}</option>
                    <option value="visible">{t(UI_TEXT.adminPanel.visibilityVisible, lang)}</option>
                    <option value="hidden">{t(UI_TEXT.adminPanel.visibilityHidden, lang)}</option>
                  </select>
                </div>
              </div>

              {/* Bulk Selection Action Bar */}
              {selectedSeriesIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-2.5 text-xs text-white">
                  <span className="font-semibold font-mono-num">
                    {selectedSeriesIds.length} {t(UI_TEXT.adminPanel.bulkSelected, lang)}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdminRole && (
                      <button
                        type="button"
                        onClick={() => handleBulkCatalogAction('pin')}
                        className="cursor-pointer rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-zinc-950 hover:bg-amber-300 whitespace-nowrap"
                      >
                        {t(UI_TEXT.adminPanel.actionFeature, lang)}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleBulkCatalogAction('hide')}
                      className="cursor-pointer rounded-md bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-zinc-700 whitespace-nowrap"
                    >
                      {t(UI_TEXT.adminPanel.actionHide, lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkCatalogAction('restore')}
                      className="cursor-pointer rounded-md bg-[#00DC64] px-2.5 py-1 text-[11px] font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap"
                    >
                      {t(UI_TEXT.adminPanel.actionShow, lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSeriesIds([])}
                      className="cursor-pointer rounded-md border border-zinc-700 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 whitespace-nowrap"
                    >
                      {t(UI_TEXT.adminPanel.clearSelection, lang)}
                    </button>
                  </div>
                </div>
              )}

              {/* Series Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allCatalogVisibleSelected}
                          aria-label="Select all visible series"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSeriesIds(filteredCatalog.map((s) => s.id));
                            } else {
                              setSelectedSeriesIds([]);
                            }
                          }}
                          className="h-3.5 w-3.5 accent-[#00DC64]"
                        />
                      </th>
                      <th className="px-4 py-3">Series</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3 text-right">Episodes</th>
                      <th className="px-4 py-3 text-right">Views</th>
                      <th className="px-4 py-3 text-right">Rating</th>
                      <th className="px-4 py-3">Visibility</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCatalog.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-zinc-500">
                          {t(UI_TEXT.adminPanel.catalogEmpty, lang)}
                        </td>
                      </tr>
                    ) : (
                      filteredCatalog.map((series) => {
                        const isHidden = siteConfig.hiddenSeriesIds.includes(series.id);
                        const isFeatured = siteConfig.featuredSeriesIds.includes(series.id);
                        const isCustom = customIdSet.has(series.id);
                        const checked = selectedSeriesIds.includes(series.id);
                        const confirmingDelete = confirmDeleteSeriesId === series.id;

                        return (
                          <tr key={series.id} className="hover:bg-zinc-50/80">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                aria-label={`Select ${t(series.title, lang)}`}
                                onChange={(e) => {
                                  setSelectedSeriesIds((prev) =>
                                    e.target.checked
                                      ? [...prev, series.id]
                                      : prev.filter((id) => id !== series.id),
                                  );
                                }}
                                className="h-3.5 w-3.5 accent-[#00DC64]"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <img
                                  src={series.coverUrl}
                                  alt={t(series.title, lang)}
                                  referrerPolicy="no-referrer"
                                  className="h-11 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="truncate font-bold text-zinc-950">
                                    {t(series.title, lang)}
                                  </div>
                                  <div className="truncate text-[11px] text-zinc-500">
                                    {t(series.author, lang)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                              <span>{series.isCanvas ? 'Canvas' : 'Original'}</span>
                              <span aria-hidden="true" className="mx-1.5 text-zinc-300">·</span>
                              <span>{t(UI_TEXT.genres[series.genre], lang)}</span>
                              <span aria-hidden="true" className="mx-1.5 text-zinc-300">·</span>
                              <span>{t(UI_TEXT.weekdays[series.scheduleDay], lang)}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num text-zinc-700">
                              {series.episodes.length}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num text-zinc-700">
                              {formatCompactNumber(series.viewsCount, lang)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono-num font-semibold text-zinc-800">
                              {series.rating.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                                    isHidden
                                      ? 'bg-rose-50 text-rose-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  {isHidden
                                    ? t(UI_TEXT.adminPanel.statusHidden, lang)
                                    : t(UI_TEXT.adminPanel.statusVisible, lang)}
                                </span>
                                {isFeatured && (
                                  <span className="inline-block rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                                    {t(UI_TEXT.adminPanel.featuredLabel, lang)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {confirmingDelete && isAdminRole ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-rose-700">
                                    {t(UI_TEXT.adminPanel.confirmDeleteLabel, lang)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteCustomSeries(series.id);
                                      void onRecordActivity?.({
                                        category: 'series',
                                        action: 'series_deleted',
                                        targetId: series.id,
                                        targetLabel: series.title.en || series.title.kh,
                                      });
                                      setConfirmDeleteSeriesId(null);
                                    }}
                                    className="cursor-pointer rounded bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                                  >
                                    {t(UI_TEXT.adminPanel.confirmYes, lang)}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteSeriesId(null)}
                                    className="cursor-pointer rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                                  >
                                    {t(UI_TEXT.adminPanel.confirmNo, lang)}
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  {isAdminRole && (
                                    <button
                                      type="button"
                                      onClick={() => toggleSeriesFeatured(series.id)}
                                      className={`cursor-pointer rounded border px-2 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                                        isFeatured
                                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                                      }`}
                                    >
                                      <Star className="inline h-3 w-3 mr-1" aria-hidden="true" />
                                      {isFeatured
                                        ? t(UI_TEXT.adminPanel.actionUnfeature, lang)
                                        : t(UI_TEXT.adminPanel.actionFeature, lang)}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleSeriesVisibility(series.id)}
                                    className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                                  >
                                    {isHidden ? (
                                      <Eye className="h-3 w-3" aria-hidden="true" />
                                    ) : (
                                      <EyeOff className="h-3 w-3" aria-hidden="true" />
                                    )}
                                    {isHidden
                                      ? t(UI_TEXT.adminPanel.actionShow, lang)
                                      : t(UI_TEXT.adminPanel.actionHide, lang)}
                                  </button>
                                  {isAdminRole && (
                                    <button
                                      type="button"
                                      onClick={() => openEditSeriesModal(series)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                                    >
                                      <Pencil className="h-3 w-3" aria-hidden="true" />
                                      {t(UI_TEXT.adminPanel.actionEdit, lang)}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onOpenSeries(series.id)}
                                    aria-label="Open series"
                                    className="cursor-pointer rounded border border-zinc-200 bg-white p-1 text-zinc-600 hover:bg-zinc-50"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  {isAdminRole && isCustom && (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteSeriesId(series.id)}
                                      aria-label={t(UI_TEXT.adminPanel.actionDelete, lang)}
                                      className="cursor-pointer rounded border border-zinc-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: EPISODES */}
          {activeTab === 'episodes' && (
            <div className="space-y-5">
              {episodeStudio && isAdminRole ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setEpisodeStudio(null)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t(UI_TEXT.adminPanel.backToAdminList, lang)}</span>
                    </button>
                  </div>

                  <AddEpisodeForm
                    key={episodeStudio.episode?.id ?? `admin-new-${episodeStudio.seriesId}`}
                    lang={lang}
                    seriesList={allSeries}
                    initialSeriesId={episodeStudio.seriesId}
                    initialEpisode={episodeStudio.episode ?? null}
                    onCancel={() => setEpisodeStudio(null)}
                    onPublishEpisode={(seriesId, episode) => {
                      onAddEpisode(seriesId, episode);
                      const targetSeries = seriesById.get(seriesId);
                      void onRecordActivity?.({
                        category: 'episode',
                        action: 'episode_added',
                        targetId: episode.id,
                        targetLabel: `${targetSeries ? targetSeries.title.en || targetSeries.title.kh : seriesId} #${episode.number}`,
                        details: episode.title.en || episode.title.kh,
                      });
                      setEpisodeStudio(null);
                    }}
                    onUpdateEpisode={(seriesId, episode) => {
                      onUpdateEpisode(seriesId, episode);
                      const targetSeries = seriesById.get(seriesId);
                      void onRecordActivity?.({
                        category: 'episode',
                        action: 'episode_updated',
                        targetId: episode.id,
                        targetLabel: `${targetSeries ? targetSeries.title.en || targetSeries.title.kh : seriesId} #${episode.number}`,
                        details: `${episode.title.en || episode.title.kh} (${episode.panels.length} panels)`,
                      });
                      setEpisodeStudio(null);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                      {t(UI_TEXT.adminPanel.tabs.episodes, lang)}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportEpisodesCsv}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t(UI_TEXT.adminPanel.exportCsvBtn, lang)}</span>
                      </button>
                      {isAdminRole && (
                        <button
                          type="button"
                          onClick={() =>
                            setEpisodeStudio({
                              mode: 'add',
                              seriesId:
                                episodeSeriesFilter !== 'all'
                                  ? episodeSeriesFilter
                                  : (allSeries[0]?.id ?? ''),
                              episode: null,
                            })
                          }
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t(UI_TEXT.adminPanel.addEpisodeBtn, lang)}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 sm:max-w-xs">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={episodeSearch}
                        onChange={(e) => setEpisodeSearch(e.target.value)}
                        placeholder={t(UI_TEXT.adminPanel.searchEpisodesPlaceholder, lang)}
                        className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>

                    <select
                      value={episodeSeriesFilter}
                      onChange={(e) => setEpisodeSeriesFilter(e.target.value)}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                    >
                      <option value="all">{t(UI_TEXT.adminPanel.allSeriesFilter, lang)}</option>
                      {allSeries.map((s) => (
                        <option key={s.id} value={s.id}>
                          {t(s.title, lang)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500">
                          <th className="px-4 py-3">Episode</th>
                          <th className="px-4 py-3">Series</th>
                          <th className="px-4 py-3 text-right">Panels</th>
                          <th className="px-4 py-3 text-right">Likes</th>
                          <th className="px-4 py-3">Published</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {flattenedEpisodes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-500">
                              {t(UI_TEXT.adminPanel.episodesEmpty, lang)}
                            </td>
                          </tr>
                        ) : (
                          flattenedEpisodes.map(({ series, episode }) => {
                            const confirmingDel = confirmDeleteEpisodeId === episode.id;
                            return (
                              <tr key={episode.id} className="hover:bg-zinc-50/80">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3 min-w-[200px]">
                                    <img
                                      src={episode.thumbnailUrl}
                                      alt={t(episode.title, lang)}
                                      referrerPolicy="no-referrer"
                                      className="h-10 w-14 shrink-0 rounded border border-zinc-200 object-cover"
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate font-bold text-zinc-950">
                                        <span className="text-zinc-400 font-mono-num">
                                          #{episode.number}
                                        </span>{' '}
                                        {t(episode.title, lang)}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-700">
                                  {t(series.title, lang)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-num text-zinc-700">
                                  {episode.panels.length}
                                </td>
                                <td className="px-4 py-3 text-right font-mono-num text-zinc-700">
                                  {episode.likes.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-zinc-500 font-mono-num">
                                  {t(episode.publishedDate, lang)}
                                </td>
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  {confirmingDel && isAdminRole ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="text-[11px] font-semibold text-rose-700">
                                        {t(UI_TEXT.adminPanel.confirmDeleteLabel, lang)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteEpisode(series.id, episode.id);
                                          void onRecordActivity?.({
                                            category: 'episode',
                                            action: 'episode_deleted',
                                            targetId: episode.id,
                                            targetLabel: `${series.title.en || series.title.kh} #${episode.number}`,
                                            details: episode.title.en || episode.title.kh,
                                          });
                                          setConfirmDeleteEpisodeId(null);
                                        }}
                                        className="cursor-pointer rounded bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                                      >
                                        {t(UI_TEXT.adminPanel.confirmYes, lang)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteEpisodeId(null)}
                                        className="cursor-pointer rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                                      >
                                        {t(UI_TEXT.adminPanel.confirmNo, lang)}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      {isAdminRole && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEpisodeStudio({
                                                mode: 'edit',
                                                seriesId: series.id,
                                                episode,
                                              })
                                            }
                                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                                          >
                                            <Layers className="h-3 w-3" aria-hidden="true" />
                                            {t(UI_TEXT.adminPanel.editStripsBtn, lang)}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openEditEpisodeModal(series, episode)}
                                            className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                                          >
                                            <Pencil className="h-3 w-3" aria-hidden="true" />
                                            {t(UI_TEXT.adminPanel.editMetaBtn, lang)}
                                          </button>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => onReadEpisode(series.id, episode.id)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                                      >
                                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                        Read
                                      </button>
                                      {isAdminRole && (
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteEpisodeId(episode.id)}
                                          aria-label={t(UI_TEXT.adminPanel.actionDelete, lang)}
                                          className="cursor-pointer rounded border border-zinc-200 bg-white p-1 text-rose-600 hover:bg-rose-50"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: COMMENTS MODERATION */}
          {activeTab === 'comments' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                  {t(UI_TEXT.adminPanel.tabs.comments, lang)}
                </h1>

                {selectedCommentKeys.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkDeleteComments}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {t(UI_TEXT.adminPanel.deleteSelectedBtn, lang)} ({selectedCommentKeys.length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCommentKeys([])}
                      className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                    >
                      {t(UI_TEXT.adminPanel.clearSelection, lang)}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {flattenedComments.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allCommentsVisibleSelected}
                      aria-label="Select all comments"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCommentKeys(flattenedComments.map((c) => c.key));
                        } else {
                          setSelectedCommentKeys([]);
                        }
                      }}
                      className="h-4 w-4 shrink-0 accent-[#00DC64]"
                    />
                  )}
                  <div className="relative flex-1 sm:max-w-sm">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                      aria-hidden="true"
                    />
                    <input
                      type="search"
                      value={commentSearch}
                      onChange={(e) => setCommentSearch(e.target.value)}
                      placeholder={t(UI_TEXT.adminPanel.searchCommentsPlaceholder, lang)}
                      className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                </div>

                <select
                  value={commentSeriesFilter}
                  onChange={(e) => setCommentSeriesFilter(e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                >
                  <option value="all">{t(UI_TEXT.adminPanel.allSeriesFilter, lang)}</option>
                  {allSeries.map((s) => (
                    <option key={s.id} value={s.id}>
                      {t(s.title, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
                {flattenedComments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.commentsEmpty, lang)}
                  </div>
                ) : (
                  flattenedComments.map(
                    ({ key, seriesId, seriesTitle, episodeId, episodeNumber, comment }) => {
                      const isChecked = selectedCommentKeys.includes(key);
                      return (
                        <div
                          key={key}
                          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              aria-label={`Select comment by ${comment.author}`}
                              onChange={(e) => {
                                setSelectedCommentKeys((prev) =>
                                  e.target.checked
                                    ? [...prev, key]
                                    : prev.filter((item) => item !== key),
                                );
                              }}
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#00DC64]"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-zinc-950">{comment.author}</span>
                                <span className="text-zinc-400">·</span>
                                <span className="text-zinc-500 font-mono-num">
                                  {t(seriesTitle, lang)} — #{episodeNumber}
                                </span>
                                <span className="text-zinc-400">·</span>
                                <span className="text-[11px] text-zinc-400">
                                  {t(comment.timestamp, lang)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-sm text-zinc-700">{comment.text}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {seriesId && (
                              <button
                                type="button"
                                onClick={() => onReadEpisode(seriesId, episodeId)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Read</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteComment(episodeId, comment.id);
                                void onRecordActivity?.({
                                  category: 'comment',
                                  action: 'comment_deleted',
                                  targetId: comment.id,
                                  targetLabel: `${comment.author} (${t(seriesTitle, 'en')} #${episodeNumber})`,
                                  details: comment.text.slice(0, 120),
                                });
                              }}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{t(UI_TEXT.adminPanel.actionDelete, lang)}</span>
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ADS & SPONSORS */}
          {activeTab === 'ads' && isAdminRole && (
            <AdminAdsManager
              lang={lang}
              adsConfig={adsConfig}
              adClickCounts={adClickCounts}
              adMetricsByDate={adMetricsByDate}
              isVerifiedAdmin={isVerifiedAdmin}
              syncingCloud={syncingCloud}
              cloudError={cloudError}
              onSaveAdsConfig={onUpdateAdsConfig}
              onRecordActivity={onRecordActivity}
            />
          )}

          {/* TAB 6: TEAM & ROLES */}
          {activeTab === 'team' && isAdminRole && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                  {t(UI_TEXT.adminPanel.tabs.team, lang)}
                </h1>
                <p className="mt-1 text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.addMemberSub, lang)}
                </p>
              </div>

              {/* Add Admin / Moderator Form */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                <h2 className="text-sm font-bold text-zinc-950">
                  {t(UI_TEXT.adminPanel.addMemberTitle, lang)}
                </h2>

                <form onSubmit={(e) => void handleAddTeamMember(e)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.memberEmailLabel, lang)}
                      </label>
                      <input
                        type="email"
                        required
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="staff.member@gmail.com"
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.memberNameLabel, lang)}
                      </label>
                      <input
                        type="text"
                        maxLength={100}
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        placeholder={lang === 'kh' ? 'ឈ្មោះសមាជិក' : 'e.g. Sokha Phan'}
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.memberRoleLabel, lang)}
                      </label>
                      <select
                        value={memberRole}
                        onChange={(e) => setMemberRole(e.target.value as 'admin' | 'moderator')}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                      >
                        <option value="moderator">
                          {t(UI_TEXT.adminPanel.roleModerator, lang)}
                        </option>
                        <option value="admin">{t(UI_TEXT.adminPanel.roleAdmin, lang)}</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.memberNoteLabel, lang)}
                      </label>
                      <input
                        type="text"
                        maxLength={200}
                        value={memberNote}
                        onChange={(e) => setMemberNote(e.target.value)}
                        placeholder={
                          lang === 'kh'
                            ? 'ឧ. សម្របសម្រួលមតិយោបល់ប្រចាំថ្ងៃ'
                            : 'e.g. Weekend comment moderation'
                        }
                        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-600">
                    {memberRole === 'admin'
                      ? t(UI_TEXT.adminPanel.adminCapabilityDesc, lang)
                      : t(UI_TEXT.adminPanel.moderatorCapabilityDesc, lang)}
                  </div>

                  {teamFeedback && (
                    <div
                      role={teamFeedback.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                        teamFeedback.type === 'error'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {teamFeedback.type === 'success' && (
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{teamFeedback.text}</span>
                    </div>
                  )}

                  {cloudError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
                    >
                      {cloudError}
                    </p>
                  )}

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={teamBusy || syncingCloud}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:opacity-50 whitespace-nowrap"
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t(UI_TEXT.adminPanel.addMemberBtn, lang)}</span>
                    </button>
                  </div>
                </form>
              </section>

              {/* Staff Directory */}
              <section className="rounded-xl border border-zinc-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-zinc-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-950">
                      {t(UI_TEXT.adminPanel.teamDirectoryTitle, lang)}
                    </h2>
                    <span className="text-xs font-bold text-zinc-400 font-mono-num">
                      {staffMembers.length + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        placeholder={t(UI_TEXT.adminPanel.searchTeamPlaceholder, lang)}
                        className="w-48 rounded-lg border border-zinc-300 py-1.5 pl-8 pr-2.5 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                      />
                    </div>
                    <select
                      value={teamRoleFilter}
                      onChange={(e) =>
                        setTeamRoleFilter(e.target.value as 'all' | 'admin' | 'moderator')
                      }
                      className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                    >
                      <option value="all">{t(UI_TEXT.adminPanel.allRolesFilter, lang)}</option>
                      <option value="admin">{t(UI_TEXT.adminPanel.roleAdmin, lang)}</option>
                      <option value="moderator">{t(UI_TEXT.adminPanel.roleModerator, lang)}</option>
                    </select>
                  </div>
                </div>

                <div className="divide-y divide-zinc-100">
                  {/* Primary Super Admin (Protected Permanent Row) */}
                  <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-emerald-50/30">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-zinc-950">
                          {t(UI_TEXT.adminPanel.roleSuperAdmin, lang)}
                        </span>
                        <span className="text-zinc-300">·</span>
                        <span className="font-mono-num font-semibold text-emerald-700">
                          {superAdminEmail}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {t(UI_TEXT.adminPanel.superAdminProtected, lang)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-emerald-700 whitespace-nowrap">
                      {t(UI_TEXT.adminPanel.permanentLabel, lang)}
                    </span>
                  </div>

                  {filteredStaffMembers.length === 0 ? (
                    <div className="px-5 py-8 text-center text-xs text-zinc-500">
                      {t(UI_TEXT.adminPanel.teamEmpty, lang)}
                    </div>
                  ) : (
                    filteredStaffMembers.map((member) => {
                      const confirmingRemove = confirmRemoveMemberId === member.id;
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-zinc-950">{member.displayName}</span>
                              <span className="text-zinc-300">·</span>
                              <span className="text-zinc-600">{member.email}</span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                              <span>
                                {member.role === 'admin'
                                  ? t(UI_TEXT.adminPanel.roleAdmin, lang)
                                  : t(UI_TEXT.adminPanel.roleModerator, lang)}
                              </span>
                              {member.note && (
                                <>
                                  <span className="text-zinc-300">·</span>
                                  <span>{member.note}</span>
                                </>
                              )}
                              {member.addedAt && (
                                <>
                                  <span className="text-zinc-300">·</span>
                                  <span className="font-mono-num">{member.addedAt}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {confirmingRemove ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-rose-700">
                                  {t(UI_TEXT.adminPanel.confirmDeleteLabel, lang)}
                                </span>
                                <button
                                  type="button"
                                  disabled={syncingCloud}
                                  onClick={() => {
                                    if (!onRemoveStaffMember) return;
                                    void onRemoveStaffMember(member.id).then(() => {
                                      setConfirmRemoveMemberId(null);
                                      showTeamFeedback(
                                        'success',
                                        t(UI_TEXT.adminPanel.memberRemoved, lang),
                                      );
                                    });
                                  }}
                                  className="cursor-pointer rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                                >
                                  {t(UI_TEXT.adminPanel.confirmYes, lang)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveMemberId(null)}
                                  className="cursor-pointer rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                                >
                                  {t(UI_TEXT.adminPanel.confirmNo, lang)}
                                </button>
                              </div>
                            ) : (
                              <>
                                <select
                                  aria-label={`Role for ${member.email}`}
                                  value={member.role}
                                  disabled={syncingCloud}
                                  onChange={(e) => {
                                    if (!onUpdateStaffRole) return;
                                    const nextRole = e.target.value as 'admin' | 'moderator';
                                    void onUpdateStaffRole(member.id, nextRole).then(() => {
                                      showTeamFeedback(
                                        'success',
                                        t(UI_TEXT.adminPanel.memberRoleUpdated, lang),
                                      );
                                    });
                                  }}
                                  className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
                                >
                                  <option value="moderator">
                                    {t(UI_TEXT.adminPanel.roleModerator, lang)}
                                  </option>
                                  <option value="admin">
                                    {t(UI_TEXT.adminPanel.roleAdmin, lang)}
                                  </option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRemoveMemberId(member.id)}
                                  aria-label={t(UI_TEXT.adminPanel.actionDelete, lang)}
                                  className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 6: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <ActivityLog
              lang={lang}
              logs={activityLogs}
              loading={activityLogsLoading}
              error={activityLogsError}
              onDismissError={onDismissActivityLogsError}
            />
          )}

          {/* TAB 7: SITE SETTINGS */}
          {activeTab === 'settings' && isAdminRole && (
            <div className="max-w-3xl space-y-6">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
                {t(UI_TEXT.adminPanel.tabs.settings, lang)}
              </h1>

              {/* Announcement Banner Card */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.announcementHeading, lang)}
                  </h2>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 mr-1">
                      {t(UI_TEXT.adminPanel.bannerTemplatesLabel, lang)}:
                    </span>
                    {BANNER_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() =>
                          setDraftConfig((prev) => ({
                            ...prev,
                            announcementEnabled: true,
                            announcementTone: tpl.tone,
                            announcementKh: tpl.kh,
                            announcementEn: tpl.en,
                          }))
                        }
                        className="cursor-pointer rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 whitespace-nowrap"
                      >
                        {t(tpl.label, lang)}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={draftConfig.announcementEnabled}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        announcementEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-[#00DC64]"
                  />
                  <span>{t(UI_TEXT.adminPanel.announcementToggle, lang)}</span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label className="font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.announcementKhLabel, lang)}
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono-num">
                        {draftConfig.announcementKh.length}/200
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={200}
                      value={draftConfig.announcementKh}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({ ...prev, announcementKh: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <label className="font-semibold text-zinc-700">
                        {t(UI_TEXT.adminPanel.announcementEnLabel, lang)}
                      </label>
                      <span className="text-[11px] text-zinc-400 font-mono-num">
                        {draftConfig.announcementEn.length}/200
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={200}
                      value={draftConfig.announcementEn}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({ ...prev, announcementEn: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.announcementToneLabel, lang)}
                  </label>
                  <select
                    value={draftConfig.announcementTone}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        announcementTone: e.target.value as 'emerald' | 'amber' | 'slate',
                      }))
                    }
                    className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    <option value="emerald">Emerald (#00DC64)</option>
                    <option value="amber">Amber Notice</option>
                    <option value="slate">Dark Slate</option>
                  </select>
                </div>

                {/* Live Banner Preview */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-zinc-500">
                    {t(UI_TEXT.adminPanel.bannerPreviewLabel, lang)}
                  </div>
                  <div
                    className={`rounded-lg border px-4 py-2 text-center text-xs font-semibold ${
                      draftConfig.announcementTone === 'amber'
                        ? 'border-amber-200 bg-amber-50 text-amber-950'
                        : draftConfig.announcementTone === 'slate'
                          ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    } ${!draftConfig.announcementEnabled ? 'opacity-50' : ''}`}
                  >
                    {previewBannerMessage ||
                      (lang === 'kh'
                        ? 'សរសេរសារប្រកាសខាងលើដើម្បីមើលគំរូនៅទីនេះ...'
                        : 'Type an announcement message above to preview it here...')}
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-800">
                    <input
                      type="checkbox"
                      checked={draftConfig.canvasSubmissionsEnabled}
                      onChange={(e) =>
                        setDraftConfig((prev) => ({
                          ...prev,
                          canvasSubmissionsEnabled: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[#00DC64]"
                    />
                    <span>{t(UI_TEXT.adminPanel.canvasOpenLabel, lang)}</span>
                  </label>
                </div>

                {!isVerifiedAdmin && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                    {t(UI_TEXT.adminPanel.adminAuthHint, lang)}
                  </p>
                )}

                {cloudError && (
                  <p
                    role="alert"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700"
                  >
                    {cloudError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveSettings(false)}
                    className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                  >
                    {t(UI_TEXT.adminPanel.saveSettingsBtn, lang)}
                  </button>

                  {isVerifiedAdmin && (
                    <button
                      type="button"
                      disabled={syncingCloud}
                      onClick={() => void handleSaveSettings(true)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:opacity-50 whitespace-nowrap"
                    >
                      <Cloud className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t(UI_TEXT.adminPanel.syncFirestoreBtn, lang)}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onResetSiteConfig();
                      void onRecordActivity?.({
                        category: 'settings',
                        action: 'settings_reset',
                        targetLabel: 'Storefront Config',
                        details: 'Restored default announcement and series visibility',
                      });
                      setDraftConfig({
                        announcementEnabled: false,
                        announcementKh: '',
                        announcementEn: '',
                        announcementTone: 'emerald',
                        canvasSubmissionsEnabled: true,
                        hiddenSeriesIds: [],
                        featuredSeriesIds: [],
                      });
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.resetDefaultsBtn, lang)}</span>
                  </button>

                  {settingsSavedMsg && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {settingsSavedMsg}
                    </span>
                  )}
                </div>
              </section>

              {/* Hidden Series Quick Restore Manager */}
              <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.hiddenSeriesHeading, lang)} ({hiddenSeriesList.length})
                  </h2>
                  {hiddenSeriesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAllHidden}
                      className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                    >
                      {t(UI_TEXT.adminPanel.restoreAllBtn, lang)}
                    </button>
                  )}
                </div>

                {hiddenSeriesList.length === 0 ? (
                  <p className="mt-3 text-xs text-zinc-500">
                    {t(UI_TEXT.adminPanel.hiddenSeriesNone, lang)}
                  </p>
                ) : (
                  <div className="mt-4 divide-y divide-zinc-100">
                    {hiddenSeriesList.map((series) => (
                      <div
                        key={series.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={series.coverUrl}
                            alt={t(series.title, lang)}
                            referrerPolicy="no-referrer"
                            className="h-9 w-7 shrink-0 rounded border border-zinc-200 object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold text-zinc-950">
                              {t(series.title, lang)}
                            </div>
                            <div className="truncate text-[11px] text-zinc-500">
                              {t(series.author, lang)}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSeriesVisibility(series.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                          <span>{t(UI_TEXT.adminPanel.actionShow, lang)}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Edit Series */}
      {editingSeries && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-950">
                {t(UI_TEXT.adminPanel.actionEdit, lang)} — {t(editingSeries.title, lang)}
              </h2>
              <button
                type="button"
                onClick={() => setEditingSeries(null)}
                className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveSeriesEdit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Title (KH)
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitleKh}
                    onChange={(e) => setEditTitleKh(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Title (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitleEn}
                    onChange={(e) => setEditTitleEn(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Author (KH)
                  </label>
                  <input
                    type="text"
                    required
                    value={editAuthorKh}
                    onChange={(e) => setEditAuthorKh(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Author (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={editAuthorEn}
                    onChange={(e) => setEditAuthorEn(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.synopsisKhLabel, lang)}
                  </label>
                  <textarea
                    rows={2}
                    value={editSynopsisKh}
                    onChange={(e) => setEditSynopsisKh(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.synopsisEnLabel, lang)}
                  </label>
                  <textarea
                    rows={2}
                    value={editSynopsisEn}
                    onChange={(e) => setEditSynopsisEn(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
              </div>

              {/* Cover & Banner Artwork */}
              <div className="grid gap-3 sm:grid-cols-2 items-start">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.coverUrlLabel, lang)}
                  </label>
                  <div className="flex items-center gap-2">
                    <img
                      src={editCoverUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-10 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                    />
                    <input
                      type="text"
                      value={editCoverUrl}
                      onChange={(e) => setEditCoverUrl(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs text-zinc-950"
                    />
                    <input
                      ref={editCoverFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => void handleUploadSeriesCover(e, 'edit')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editCoverFileRef.current?.click()}
                      aria-label={t(UI_TEXT.adminPanel.uploadCoverBtn, lang)}
                      className="cursor-pointer rounded-lg border border-zinc-300 bg-white p-2 text-zinc-700 hover:bg-zinc-50 shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.bannerUrlLabel, lang)}
                  </label>
                  <input
                    type="text"
                    value={editBannerUrl}
                    onChange={(e) => setEditBannerUrl(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950"
                  />
                </div>
              </div>

              {editCoverError && (
                <p role="alert" className="text-xs font-medium text-rose-600">
                  {editCoverError}
                </p>
              )}

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Genre</label>
                  <select
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value as Exclude<GenreKey, 'all'>)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {t(UI_TEXT.genres[g], lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Day</label>
                  <select
                    value={editScheduleDay}
                    onChange={(e) => setEditScheduleDay(e.target.value as WeekdayKey)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {t(UI_TEXT.weekdays[d], lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Views</label>
                  <input
                    type="number"
                    min={0}
                    value={editViews}
                    onChange={(e) => setEditViews(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.subscribersLabel, lang)}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editSubscribers}
                    onChange={(e) => setEditSubscribers(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={10}
                    value={editRating}
                    onChange={(e) => setEditRating(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-xs font-mono-num"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={editIsCanvas}
                    onChange={(e) => setEditIsCanvas(e.target.checked)}
                    className="h-4 w-4 accent-[#00DC64]"
                  />
                  <span>Canvas Series</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={editIsNew}
                    onChange={(e) => setEditIsNew(e.target.checked)}
                    className="h-4 w-4 accent-[#00DC64]"
                  />
                  <span>{t(UI_TEXT.adminPanel.markAsNewLabel, lang)}</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSeries(null)}
                  className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  {t(UI_TEXT.canvasModal.cancel, lang)}
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
                >
                  {t(UI_TEXT.adminPanel.saveSettingsBtn, lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Official / Canvas Series */}
      {creatingNewSeries && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <div className="my-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-950">
                {t(UI_TEXT.adminPanel.addSeriesBtn, lang)}
              </h2>
              <button
                type="button"
                onClick={() => setCreatingNewSeries(false)}
                className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateOfficialSeries} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Title (KH)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitleKh}
                    onChange={(e) => setNewTitleKh(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Title (EN)
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitleEn}
                    onChange={(e) => setNewTitleEn(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Author</label>
                  <input
                    type="text"
                    required
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Genre</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value as Exclude<GenreKey, 'all'>)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {t(UI_TEXT.genres[g], lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Day</label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value as WeekdayKey)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {t(UI_TEXT.weekdays[d], lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                  {t(UI_TEXT.adminPanel.coverUrlLabel, lang)}
                </label>
                <div className="flex items-center gap-2">
                  <img
                    src={newCoverUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-10 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                  />
                  <input
                    type="text"
                    value={newCoverUrl}
                    onChange={(e) => setNewCoverUrl(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2.5 py-2 text-xs"
                  />
                  <input
                    ref={newCoverFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void handleUploadSeriesCover(e, 'create')}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => newCoverFileRef.current?.click()}
                    aria-label={t(UI_TEXT.adminPanel.uploadCoverBtn, lang)}
                    className="cursor-pointer rounded-lg border border-zinc-300 bg-white p-2 text-zinc-700 hover:bg-zinc-50 shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.synopsisKhLabel, lang)}
                  </label>
                  <textarea
                    rows={2}
                    value={newSynopsisKh}
                    onChange={(e) => setNewSynopsisKh(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.synopsisEnLabel, lang)}
                  </label>
                  <textarea
                    rows={2}
                    value={newSynopsisEn}
                    onChange={(e) => setNewSynopsisEn(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={newIsCanvas}
                  onChange={(e) => setNewIsCanvas(e.target.checked)}
                  className="h-4 w-4 accent-[#00DC64]"
                />
                <span>Publish under Canvas (leave unchecked for Originals)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatingNewSeries(false)}
                  className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  {t(UI_TEXT.canvasModal.cancel, lang)}
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
                >
                  {t(UI_TEXT.canvasModal.submit, lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Edit Episode Metadata */}
      {editingEpisodeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-base font-bold text-zinc-950">
                {t(UI_TEXT.canvasDashboard.editEpisode, lang)}
              </h2>
              <button
                type="button"
                onClick={() => setEditingEpisodeModal(null)}
                className="cursor-pointer rounded p-1 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveEpisodeEdit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">
                    Episode #
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={epNumInput}
                    onChange={(e) => setEpNumInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-700">Likes</label>
                  <input
                    type="number"
                    min={0}
                    value={epLikesInput}
                    onChange={(e) => setEpLikesInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                  Title (KH)
                </label>
                <input
                  type="text"
                  required
                  value={epTitleKhInput}
                  onChange={(e) => setEpTitleKhInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                  Title (EN)
                </label>
                <input
                  type="text"
                  required
                  value={epTitleEnInput}
                  onChange={(e) => setEpTitleEnInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-700">
                  Published Label
                </label>
                <input
                  type="text"
                  value={epDateInput}
                  onChange={(e) => setEpDateInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEpisodeModal(null)}
                  className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  {t(UI_TEXT.canvasModal.cancel, lang)}
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
                >
                  {t(UI_TEXT.canvasDashboard.saveEpisodeChanges, lang)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
