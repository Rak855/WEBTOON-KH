/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CheckCircle2, Plus, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import {
  AdsenseAdSlot,
  AdsenseHeadScript,
  normalizeAdsensePublisherId,
} from './components/AdsenseAdSlot';
import { AdskeeperAdSlot, AdskeeperGlobalScripts } from './components/AdskeeperAdSlot';
import { AdsterraAdSlot, AdsterraGlobalScripts } from './components/AdsterraAdSlot';
import { CanvasDashboard } from './components/CanvasDashboard';
import { CanvasSubmitModal } from './components/CanvasSubmitModal';
import { Header } from './components/Header';
import { HeroShowcase } from './components/HeroShowcase';
import { ProfileView } from './components/ProfileView';
import { SeriesCard } from './components/SeriesCard';
import { SeriesDetailView } from './components/SeriesDetailView';
import { SponsorAdBanner } from './components/SponsorAdBanner';
import { SponsorModalAd } from './components/SponsorModalAd';
import { WebtoonReader } from './components/WebtoonReader';
import { INITIAL_COMMENTS, INITIAL_WEBTOONS } from './data/webtoons';
import {
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
} from './firebase';
import { UI_TEXT, formatCompactNumber, t } from './i18n';
import {
  ActivityAction,
  ActivityCategory,
  ActivityLogEntry,
  AdDailyMetricsMap,
  AdPlacement,
  AdStyle,
  AdTone,
  AdsenseConfig,
  AdsenseDisplayMode,
  AdsenseFormat,
  AdsensePlacement,
  AdsenseSizeMode,
  AdsenseUnit,
  AdskeeperConfig,
  AdskeeperDisplayMode,
  AdskeeperFormat,
  AdskeeperPlacement,
  AdskeeperUnit,
  AdsterraConfig,
  AdsterraDisplayMode,
  AdsterraFormat,
  AdsterraPlacement,
  AdsterraUnit,
  CommentItem,
  DailyActivityPoint,
  Episode,
  GenreKey,
  Language,
  ModalAdFrequency,
  NavSection,
  SiteAdminConfig,
  SiteAdsConfig,
  SponsorAdCampaign,
  StaffMember,
  StaffRole,
  TopGenreItem,
  UserProfile,
  WebtoonSeries,
  WeekdayKey,
} from './types';

const GENRE_KEYS: GenreKey[] = [
  'all',
  'fantasy',
  'romance',
  'action',
  'mystery',
  'slice_of_life',
  'horror',
];

const STORAGE_KEYS = {
  lang: 'webtoon_kh_lang',
  subscribed: 'webtoon_kh_subscribed',
  liked: 'webtoon_kh_liked',
  read: 'webtoon_kh_read',
  dailyProgress: 'webtoon_kh_daily_progress',
  weeklyHistory: 'webtoon_kh_weekly_history',
  customSeries: 'webtoon_kh_custom_series',
  seriesOverrides: 'webtoon_kh_series_overrides',
  siteConfig: 'webtoon_kh_site_config',
  adsConfig: 'webtoon_kh_ads_config',
  adClicks: 'webtoon_kh_ad_clicks',
  adMetrics: 'webtoon_kh_ad_metrics',
  dismissedModalAds: 'webtoon_kh_dismissed_modal_ads',
  staffMembers: 'webtoon_kh_staff_members',
  activityLogs: 'webtoon_kh_activity_logs',
  comments: 'webtoon_kh_comments',
};

const ADMIN_EMAIL = 'chongmakio863@gmail.com';

function toStaffDocId(email: string): string {
  const norm = email.trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < norm.length; i += 1) {
    const c = norm.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= c + ((i + 1) << 5);
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const slug = norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'user';
  return `staff_${slug}_${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

const DEFAULT_SITE_CONFIG: SiteAdminConfig = {
  announcementEnabled: false,
  announcementKh: '',
  announcementEn: '',
  announcementTone: 'emerald',
  canvasSubmissionsEnabled: true,
  hiddenSeriesIds: [],
  featuredSeriesIds: [],
};

const DEFAULT_ADSTERRA_CONFIG: AdsterraConfig = {
  enabled: false,
  displayMode: 'backfill',
  units: [],
};

const DEFAULT_ADSKEEPER_CONFIG: AdskeeperConfig = {
  enabled: false,
  displayMode: 'backfill',
  units: [],
};

const DEFAULT_ADSENSE_CONFIG: AdsenseConfig = {
  enabled: false,
  publisherId: '',
  autoAdsEnabled: false,
  displayMode: 'backfill',
  units: [],
};

const DEFAULT_ADS_CONFIG: SiteAdsConfig = {
  adsEnabled: true,
  campaigns: [],
  adsterra: DEFAULT_ADSTERRA_CONFIG,
  adskeeper: DEFAULT_ADSKEEPER_CONFIG,
  adsense: DEFAULT_ADSENSE_CONFIG,
};

function sanitizeAdsterraConfig(raw: unknown): AdsterraConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ADSTERRA_CONFIG;
  }
  const rec = raw as Record<string, unknown>;
  const validModes = new Set<AdsterraDisplayMode>(['backfill', 'coexist', 'primary']);
  const validFormats = new Set<AdsterraFormat>([
    'banner',
    'native_banner',
    'social_bar',
    'popunder',
    'direct_link',
  ]);
  const validPlacements = new Set<AdsterraPlacement>([
    'home_banner',
    'discovery_inline',
    'reader_footer',
    'global_script',
  ]);
  const rawMode = String(rec.displayMode ?? 'backfill') as AdsterraDisplayMode;
  const rawUnits = Array.isArray(rec.units) ? rec.units : [];

  const units: AdsterraUnit[] = rawUnits
    .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object')
    .slice(0, 10)
    .map((u, idx) => {
      const fmtRaw = String(u.format ?? 'banner') as AdsterraFormat;
      const fmt = validFormats.has(fmtRaw) ? fmtRaw : 'banner';
      const plRaw = String(u.placement ?? 'home_banner') as AdsterraPlacement;
      const placement: AdsterraPlacement =
        fmt === 'social_bar' || fmt === 'popunder'
          ? 'global_script'
          : validPlacements.has(plRaw) && plRaw !== 'global_script'
            ? plRaw
            : 'home_banner';
      return {
        id: String(u.id ?? `adsterra_${idx}`).slice(0, 64),
        name: String(u.name ?? 'Adsterra Unit').slice(0, 80) || 'Adsterra Unit',
        format: fmt,
        placement,
        scriptSrc: String(u.scriptSrc ?? '').slice(0, 500),
        zoneKey: String(u.zoneKey ?? '').slice(0, 128),
        containerId: String(u.containerId ?? '').slice(0, 128),
        width:
          typeof u.width === 'number' && Number.isFinite(u.width)
            ? Math.max(120, Math.min(2000, Math.round(u.width)))
            : 728,
        height:
          typeof u.height === 'number' && Number.isFinite(u.height)
            ? Math.max(50, Math.min(2000, Math.round(u.height)))
            : 90,
        directUrl: String(u.directUrl ?? '').slice(0, 500),
        isActive: Boolean(u.isActive),
        updatedAtMs:
          typeof u.updatedAtMs === 'number' && Number.isFinite(u.updatedAtMs)
            ? Math.round(u.updatedAtMs)
            : Date.now(),
      };
    });

  return {
    enabled: Boolean(rec.enabled),
    displayMode: validModes.has(rawMode) ? rawMode : 'backfill',
    units,
  };
}

function sanitizeAdskeeperConfig(raw: unknown): AdskeeperConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ADSKEEPER_CONFIG;
  }
  const rec = raw as Record<string, unknown>;
  const validModes = new Set<AdskeeperDisplayMode>(['backfill', 'coexist', 'primary']);
  const validFormats = new Set<AdskeeperFormat>([
    'native_widget',
    'under_article',
    'in_feed_banner',
    'smart_widget',
    'direct_link',
  ]);
  const validPlacements = new Set<AdskeeperPlacement>([
    'home_banner',
    'discovery_inline',
    'reader_footer',
    'global_script',
  ]);
  const rawMode = String(rec.displayMode ?? 'backfill') as AdskeeperDisplayMode;
  const rawUnits = Array.isArray(rec.units) ? rec.units : [];

  const units: AdskeeperUnit[] = rawUnits
    .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object')
    .slice(0, 10)
    .map((u, idx) => {
      const fmtRaw = String(u.format ?? 'native_widget') as AdskeeperFormat;
      const fmt = validFormats.has(fmtRaw) ? fmtRaw : 'native_widget';
      const plRaw = String(u.placement ?? 'discovery_inline') as AdskeeperPlacement;
      const placement: AdskeeperPlacement =
        fmt === 'smart_widget'
          ? 'global_script'
          : validPlacements.has(plRaw) && plRaw !== 'global_script'
            ? plRaw
            : 'discovery_inline';
      return {
        id: String(u.id ?? `adskeeper_${idx}`).slice(0, 64),
        name: String(u.name ?? 'AdsKeeper Widget').slice(0, 80) || 'AdsKeeper Widget',
        format: fmt,
        placement,
        scriptSrc: String(u.scriptSrc ?? '').slice(0, 500),
        widgetId: String(u.widgetId ?? '').slice(0, 64),
        rootId: String(u.rootId ?? '').slice(0, 128),
        directUrl: String(u.directUrl ?? '').slice(0, 500),
        isActive: Boolean(u.isActive),
        updatedAtMs:
          typeof u.updatedAtMs === 'number' && Number.isFinite(u.updatedAtMs)
            ? Math.round(u.updatedAtMs)
            : Date.now(),
      };
    });

  return {
    enabled: Boolean(rec.enabled),
    displayMode: validModes.has(rawMode) ? rawMode : 'backfill',
    units,
  };
}

function sanitizeAdsenseConfig(raw: unknown): AdsenseConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ADSENSE_CONFIG;
  }
  const rec = raw as Record<string, unknown>;
  const validModes = new Set<AdsenseDisplayMode>(['backfill', 'coexist', 'primary']);
  const validFormats = new Set<AdsenseFormat>(['display', 'in_feed', 'in_article', 'multiplex']);
  const validPlacements = new Set<AdsensePlacement>([
    'home_banner',
    'discovery_inline',
    'reader_footer',
  ]);
  const validSizeModes = new Set<AdsenseSizeMode>(['responsive', 'fixed']);
  const rawMode = String(rec.displayMode ?? 'backfill') as AdsenseDisplayMode;
  const rawUnits = Array.isArray(rec.units) ? rec.units : [];

  const units: AdsenseUnit[] = rawUnits
    .filter((u): u is Record<string, unknown> => Boolean(u) && typeof u === 'object')
    .slice(0, 10)
    .map((u, idx) => {
      const fmtRaw = String(u.format ?? 'display') as AdsenseFormat;
      const fmt = validFormats.has(fmtRaw) ? fmtRaw : 'display';
      const plRaw = String(u.placement ?? 'home_banner') as AdsensePlacement;
      const placement: AdsensePlacement = validPlacements.has(plRaw) ? plRaw : 'home_banner';
      const sizeModeRaw = String(u.sizeMode ?? 'responsive') as AdsenseSizeMode;
      const sizeMode: AdsenseSizeMode = validSizeModes.has(sizeModeRaw)
        ? sizeModeRaw
        : 'responsive';
      return {
        id: String(u.id ?? `adsense_${idx}`).slice(0, 64),
        name: String(u.name ?? 'AdSense Slot').slice(0, 80) || 'AdSense Slot',
        slotId: String(u.slotId ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40),
        format: fmt,
        placement,
        sizeMode,
        width:
          typeof u.width === 'number' && Number.isFinite(u.width)
            ? Math.max(120, Math.min(2000, Math.round(u.width)))
            : 728,
        height:
          typeof u.height === 'number' && Number.isFinite(u.height)
            ? Math.max(50, Math.min(2000, Math.round(u.height)))
            : 90,
        fullWidthResponsive:
          typeof u.fullWidthResponsive === 'boolean' ? u.fullWidthResponsive : true,
        isActive: Boolean(u.isActive),
        updatedAtMs:
          typeof u.updatedAtMs === 'number' && Number.isFinite(u.updatedAtMs)
            ? Math.round(u.updatedAtMs)
            : Date.now(),
      };
    });

  return {
    enabled: Boolean(rec.enabled),
    publisherId: normalizeAdsensePublisherId(String(rec.publisherId ?? '')).slice(0, 40),
    autoAdsEnabled: Boolean(rec.autoAdsEnabled),
    displayMode: validModes.has(rawMode) ? rawMode : 'backfill',
    units,
  };
}

function sanitizeCampaignList(raw: unknown): SponsorAdCampaign[] {
  if (!Array.isArray(raw)) return [];
  const validPlacements = new Set<AdPlacement>([
    'home_banner',
    'discovery_inline',
    'reader_footer',
    'popup_modal',
    'all',
  ]);
  const validTones = new Set<AdTone>(['emerald', 'amber', 'slate']);
  const validStyles = new Set<AdStyle>(['card', 'spotlight', 'hero_image', 'minimal']);

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .slice(0, 15)
    .map((item, idx) => {
      const placementRaw = String(item.placement ?? 'home_banner') as AdPlacement;
      const styleRaw = String(item.adStyle ?? 'card') as AdStyle;
      const toneRaw = String(item.tone ?? 'emerald') as AdTone;
      const freqRaw: ModalAdFrequency =
        item.modalFrequency === 'once_per_day' ? 'once_per_day' : 'once_per_session';
      return {
        id: String(item.id ?? `ad_${idx}`).slice(0, 64),
        sponsorName: String(item.sponsorName ?? 'Sponsor').slice(0, 80),
        titleKh: String(item.titleKh ?? '').slice(0, 140),
        titleEn: String(item.titleEn ?? '').slice(0, 140),
        descriptionKh: String(item.descriptionKh ?? '').slice(0, 240),
        descriptionEn: String(item.descriptionEn ?? '').slice(0, 240),
        ctaLabelKh: String(item.ctaLabelKh ?? 'ស្វែងយល់បន្ថែម').slice(0, 40),
        ctaLabelEn: String(item.ctaLabelEn ?? 'Learn More').slice(0, 40),
        targetUrl: String(item.targetUrl ?? 'https://example.com').slice(0, 500),
        imageUrl: String(item.imageUrl ?? '').slice(0, 60000),
        placement: validPlacements.has(placementRaw) ? placementRaw : 'home_banner',
        adStyle: validStyles.has(styleRaw) ? styleRaw : 'card',
        tone: validTones.has(toneRaw) ? toneRaw : 'emerald',
        ...(placementRaw === 'popup_modal' ? { modalFrequency: freqRaw } : {}),
        priority: typeof item.priority === 'number' ? item.priority : idx,
        isActive: Boolean(item.isActive),
        ...(typeof item.startDate === 'string' && item.startDate
          ? { startDate: item.startDate.slice(0, 10) }
          : {}),
        ...(typeof item.endDate === 'string' && item.endDate
          ? { endDate: item.endDate.slice(0, 10) }
          : {}),
        updatedAtMs: typeof item.updatedAtMs === 'number' ? item.updatedAtMs : Date.now(),
      };
    });
}

function sanitizeAdMetricsMap(raw: unknown): AdDailyMetricsMap {
  if (!raw || typeof raw !== 'object') return {};
  const result: AdDailyMetricsMap = {};
  for (const [campaignId, daysObj] of Object.entries(raw as Record<string, unknown>)) {
    if (!daysObj || typeof daysObj !== 'object') continue;
    const cleanedDays: Record<string, { impressions: number; clicks: number }> = {};
    const sortedKeys = Object.keys(daysObj as Record<string, unknown>)
      .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
      .sort()
      .slice(-90);
    for (const dayKey of sortedKeys) {
      const val = (daysObj as Record<string, unknown>)[dayKey];
      if (!val || typeof val !== 'object') continue;
      const rec = val as Record<string, unknown>;
      cleanedDays[dayKey] = {
        impressions:
          typeof rec.impressions === 'number' && Number.isFinite(rec.impressions)
            ? Math.max(0, Math.round(rec.impressions))
            : 0,
        clicks:
          typeof rec.clicks === 'number' && Number.isFinite(rec.clicks)
            ? Math.max(0, Math.round(rec.clicks))
            : 0,
      };
    }
    if (Object.keys(cleanedDays).length > 0) {
      result[campaignId] = cleanedDays;
    }
  }
  return result;
}

const WEEKDAY_ORDER: Array<Exclude<WeekdayKey, 'completed'>> = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pruneWeeklyHistory(history: Record<string, string[]>): Record<string, string[]> {
  const validKeys = new Set<string>();
  const base = new Date();
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    validKeys.add(getLocalDateKey(d));
  }
  const next: Record<string, string[]> = {};
  for (const [k, ids] of Object.entries(history)) {
    if (validKeys.has(k) && Array.isArray(ids)) {
      next[k] = Array.from(new Set(ids.filter((x): x is string => typeof x === 'string'))).slice(0, 100);
    }
  }
  return next;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [lang, setLang] = useState<Language>(() =>
    readStorage<Language>(STORAGE_KEYS.lang, 'kh'),
  );
  const [activeNav, setActiveNav] = useState<NavSection>('originals');
  const [selectedGenre, setSelectedGenre] = useState<GenreKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [customSeries, setCustomSeries] = useState<WebtoonSeries[]>(() =>
    readStorage<WebtoonSeries[]>(STORAGE_KEYS.customSeries, []),
  );
  const [seriesOverrides, setSeriesOverrides] = useState<
    Record<string, Partial<WebtoonSeries>>
  >(() =>
    readStorage<Record<string, Partial<WebtoonSeries>>>(STORAGE_KEYS.seriesOverrides, {}),
  );
  const [siteConfig, setSiteConfig] = useState<SiteAdminConfig>(() =>
    readStorage<SiteAdminConfig>(STORAGE_KEYS.siteConfig, DEFAULT_SITE_CONFIG),
  );
  const [adsConfig, setAdsConfig] = useState<SiteAdsConfig>(() => {
    const stored = readStorage<SiteAdsConfig>(STORAGE_KEYS.adsConfig, DEFAULT_ADS_CONFIG);
    return {
      adsEnabled: typeof stored.adsEnabled === 'boolean' ? stored.adsEnabled : true,
      campaigns: sanitizeCampaignList(stored.campaigns),
      adsterra: sanitizeAdsterraConfig(stored.adsterra),
      adskeeper: sanitizeAdskeeperConfig(stored.adskeeper),
      adsense: sanitizeAdsenseConfig(stored.adsense),
    };
  });
  const [adClickCounts, setAdClickCounts] = useState<Record<string, number>>(() =>
    readStorage<Record<string, number>>(STORAGE_KEYS.adClicks, {}),
  );
  const [adMetricsByDate, setAdMetricsByDate] = useState<AdDailyMetricsMap>(() =>
    sanitizeAdMetricsMap(readStorage<AdDailyMetricsMap>(STORAGE_KEYS.adMetrics, {})),
  );
  const [sessionDismissedModalIds, setSessionDismissedModalIds] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.dismissedModalAds);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [dailyDismissedModalMap, setDailyDismissedModalMap] = useState<Record<string, string>>(() =>
    readStorage<Record<string, string>>(STORAGE_KEYS.dismissedModalAds, {}),
  );
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() =>
    readStorage<StaffMember[]>(STORAGE_KEYS.staffMembers, []),
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() =>
    readStorage<ActivityLogEntry[]>(STORAGE_KEYS.activityLogs, []),
  );
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsError, setActivityLogsError] = useState<string | null>(null);
  const [resolvedStaffRole, setResolvedStaffRole] = useState<StaffRole | null>(null);
  const [syncingCloudConfig, setSyncingCloudConfig] = useState(false);
  const [cloudConfigError, setCloudConfigError] = useState<string | null>(null);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null);
  const [subscribedIds, setSubscribedIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.subscribed, ['guardians-of-angkor']),
  );
  const [likedEpisodeIds, setLikedEpisodeIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.liked, []),
  );
  const [readEpisodeIds, setReadEpisodeIds] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.read, []),
  );
  const [dailyProgress, setDailyProgress] = useState<{
    date: string;
    episodeIds: string[];
  }>(() => {
    const today = getLocalDateKey();
    const stored = readStorage<{ date: string; episodeIds: string[] } | null>(
      STORAGE_KEYS.dailyProgress,
      null,
    );
    if (stored && stored.date === today && Array.isArray(stored.episodeIds)) {
      return { date: today, episodeIds: stored.episodeIds.slice(0, 100) };
    }
    return { date: today, episodeIds: [] };
  });
  const [weeklyHistory, setWeeklyHistory] = useState<Record<string, string[]>>(() => {
    const today = getLocalDateKey();
    const stored = readStorage<Record<string, string[]>>(STORAGE_KEYS.weeklyHistory, {});
    const pruned = pruneWeeklyHistory(stored && typeof stored === 'object' ? stored : {});
    const storedDaily = readStorage<{ date: string; episodeIds: string[] } | null>(
      STORAGE_KEYS.dailyProgress,
      null,
    );
    if (storedDaily && storedDaily.date === today && Array.isArray(storedDaily.episodeIds)) {
      pruned[today] = Array.from(
        new Set([...(pruned[today] ?? []), ...storedDaily.episodeIds]),
      ).slice(0, 100);
    }
    return pruned;
  });
  const [commentsByEpisode, setCommentsByEpisode] = useState<
    Record<string, CommentItem[]>
  >(() => readStorage<Record<string, CommentItem[]>>(STORAGE_KEYS.comments, INITIAL_COMMENTS));

  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [historyToast, setHistoryToast] = useState<{
    seriesTitle: { kh: string; en: string };
    episodeNumber: number;
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [googlePhotoUrl, setGooglePhotoUrl] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const readingStateHydratedUidRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang === 'kh' ? 'km' : 'en';
    try {
      localStorage.setItem(STORAGE_KEYS.lang, JSON.stringify(lang));
    } catch {
      // Ignore storage quota errors
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.subscribed, JSON.stringify(subscribedIds));
      localStorage.setItem(STORAGE_KEYS.liked, JSON.stringify(likedEpisodeIds));
      localStorage.setItem(STORAGE_KEYS.read, JSON.stringify(readEpisodeIds));
      localStorage.setItem(STORAGE_KEYS.dailyProgress, JSON.stringify(dailyProgress));
      localStorage.setItem(STORAGE_KEYS.weeklyHistory, JSON.stringify(weeklyHistory));
      localStorage.setItem(STORAGE_KEYS.customSeries, JSON.stringify(customSeries));
      localStorage.setItem(STORAGE_KEYS.seriesOverrides, JSON.stringify(seriesOverrides));
      localStorage.setItem(STORAGE_KEYS.siteConfig, JSON.stringify(siteConfig));
      localStorage.setItem(STORAGE_KEYS.adsConfig, JSON.stringify(adsConfig));
      localStorage.setItem(STORAGE_KEYS.adClicks, JSON.stringify(adClickCounts));
      localStorage.setItem(STORAGE_KEYS.adMetrics, JSON.stringify(adMetricsByDate));
      localStorage.setItem(STORAGE_KEYS.dismissedModalAds, JSON.stringify(dailyDismissedModalMap));
      localStorage.setItem(STORAGE_KEYS.staffMembers, JSON.stringify(staffMembers));
      localStorage.setItem(STORAGE_KEYS.activityLogs, JSON.stringify(activityLogs));
      localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(commentsByEpisode));
    } catch {
      // Ignore storage quota errors
    }
  }, [subscribedIds, likedEpisodeIds, readEpisodeIds, dailyProgress, weeklyHistory, customSeries, seriesOverrides, siteConfig, adsConfig, adClickCounts, adMetricsByDate, dailyDismissedModalMap, staffMembers, activityLogs, commentsByEpisode]);

  useEffect(() => {
    let active = true;
    const loadSiteConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'site', 'config'));
        if (!active || !snap.exists()) return;
        const d = snap.data();
        setSiteConfig((prev) => ({
          announcementEnabled:
            typeof d.announcementEnabled === 'boolean'
              ? d.announcementEnabled
              : prev.announcementEnabled,
          announcementKh:
            typeof d.announcementKh === 'string' ? d.announcementKh : prev.announcementKh,
          announcementEn:
            typeof d.announcementEn === 'string' ? d.announcementEn : prev.announcementEn,
          announcementTone:
            d.announcementTone === 'amber' || d.announcementTone === 'slate'
              ? d.announcementTone
              : 'emerald',
          canvasSubmissionsEnabled:
            typeof d.canvasSubmissionsEnabled === 'boolean'
              ? d.canvasSubmissionsEnabled
              : prev.canvasSubmissionsEnabled,
          hiddenSeriesIds: Array.isArray(d.hiddenSeriesIds)
            ? d.hiddenSeriesIds.filter((x): x is string => typeof x === 'string')
            : prev.hiddenSeriesIds,
          featuredSeriesIds: Array.isArray(d.featuredSeriesIds)
            ? d.featuredSeriesIds.filter((x): x is string => typeof x === 'string')
            : prev.featuredSeriesIds,
        }));
        setLastCloudSyncAt(Date.now());
      } catch {
        // Fallback to local siteConfig if offline or uninitialized
      }
    };
    void loadSiteConfig();

    const unsubscribeAds = onSnapshot(
      doc(db, 'site', 'ads'),
      (snap) => {
        if (!active || !snap.exists()) return;
        const d = snap.data();
        setAdsConfig({
          adsEnabled: typeof d.adsEnabled === 'boolean' ? d.adsEnabled : true,
          campaigns: sanitizeCampaignList(d.campaigns),
          adsterra: sanitizeAdsterraConfig(d.adsterra),
          adskeeper: sanitizeAdskeeperConfig(d.adskeeper),
          adsense: sanitizeAdsenseConfig(d.adsense),
        });
        setLastCloudSyncAt(Date.now());
      },
      () => {
        // Fallback silently to local adsConfig if offline or uninitialized
      },
    );

    return () => {
      active = false;
      unsubscribeAds();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        readingStateHydratedUidRef.current = null;
        setUserProfile(null);
        setResolvedStaffRole(null);
        setGooglePhotoUrl('');
        setAuthReady(true);
        return;
      }

      setGooglePhotoUrl((firebaseUser.photoURL || '').slice(0, 65536));

      const uid = firebaseUser.uid;
      const infoPath = `users/${uid}/private/info`;
      const statePath = `users/${uid}/private/readingState`;

      try {
        const infoRef = doc(db, 'users', uid, 'private', 'info');
        const infoSnap = await getDoc(infoRef).catch((err) =>
          handleFirestoreError(err, OperationType.GET, infoPath),
        );

        let resolvedProfile: UserProfile;
        if (infoSnap.exists()) {
          const data = infoSnap.data();
          const parsedGoal =
            typeof data.dailyGoal === 'number' && data.dailyGoal >= 1 && data.dailyGoal <= 50
              ? Math.round(data.dailyGoal)
              : 3;
          resolvedProfile = {
            uid,
            email: String(data.email ?? firebaseUser.email ?? ''),
            displayName: String(data.displayName ?? firebaseUser.displayName ?? 'Reader'),
            photoURL: String(data.photoURL ?? firebaseUser.photoURL ?? ''),
            preferredLang: data.preferredLang === 'en' ? 'en' : 'kh',
            bio: typeof data.bio === 'string' ? data.bio : '',
            dailyGoal: parsedGoal,
          };
        } else {
          const fallbackName = (firebaseUser.displayName || 'WEBTOON Reader').slice(0, 100);
          const fallbackEmail = (firebaseUser.email || '').slice(0, 254);
          const fallbackPhoto = (firebaseUser.photoURL || '').slice(0, 500);
          const initialLang: Language = lang;
          const initialGoal = 3;
          await setDoc(infoRef, {
            uid,
            email: fallbackEmail,
            displayName: fallbackName,
            photoURL: fallbackPhoto,
            preferredLang: initialLang,
            bio: '',
            dailyGoal: initialGoal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch((err) => handleFirestoreError(err, OperationType.CREATE, infoPath));

          resolvedProfile = {
            uid,
            email: fallbackEmail,
            displayName: fallbackName,
            photoURL: fallbackPhoto,
            preferredLang: initialLang,
            bio: '',
            dailyGoal: initialGoal,
          };
        }

        const today = getLocalDateKey();
        const stateRef = doc(db, 'users', uid, 'private', 'readingState');
        const stateSnap = await getDoc(stateRef).catch((err) =>
          handleFirestoreError(err, OperationType.GET, statePath),
        );

        if (stateSnap.exists()) {
          const sData = stateSnap.data();
          const remoteSub = Array.isArray(sData.subscribedIds)
            ? sData.subscribedIds.filter((x): x is string => typeof x === 'string')
            : [];
          const remoteLiked = Array.isArray(sData.likedEpisodeIds)
            ? sData.likedEpisodeIds.filter((x): x is string => typeof x === 'string')
            : [];
          const remoteRead = Array.isArray(sData.readEpisodeIds)
            ? sData.readEpisodeIds.filter((x): x is string => typeof x === 'string')
            : [];
          const remoteDaily =
            sData.dailyProgressDate === today && Array.isArray(sData.dailyReadEpisodeIds)
              ? sData.dailyReadEpisodeIds.filter((x): x is string => typeof x === 'string')
              : [];

          setSubscribedIds((prev) => Array.from(new Set([...remoteSub, ...prev])).slice(0, 100));
          setLikedEpisodeIds((prev) => Array.from(new Set([...remoteLiked, ...prev])).slice(0, 200));
          setReadEpisodeIds((prev) => Array.from(new Set([...remoteRead, ...prev])).slice(0, 200));
          setDailyProgress((prev) => {
            const localToday = prev.date === today ? prev.episodeIds : [];
            return {
              date: today,
              episodeIds: Array.from(new Set([...remoteDaily, ...localToday])).slice(0, 100),
            };
          });
          if (remoteDaily.length > 0) {
            setWeeklyHistory((prev) =>
              pruneWeeklyHistory({
                ...prev,
                [today]: Array.from(new Set([...(prev[today] ?? []), ...remoteDaily])).slice(
                  0,
                  100,
                ),
              }),
            );
          }
        } else {
          const localToday = dailyProgress.date === today ? dailyProgress.episodeIds : [];
          await setDoc(stateRef, {
            uid,
            subscribedIds: subscribedIds.slice(0, 100),
            likedEpisodeIds: likedEpisodeIds.slice(0, 200),
            readEpisodeIds: readEpisodeIds.slice(0, 200),
            dailyProgressDate: today,
            dailyReadEpisodeIds: localToday.slice(0, 100),
            updatedAt: serverTimestamp(),
          }).catch((err) => handleFirestoreError(err, OperationType.CREATE, statePath));
        }

        readingStateHydratedUidRef.current = uid;
        setUserProfile(resolvedProfile);
        setLang(resolvedProfile.preferredLang);

        // Resolve Admin / Moderator RBAC role from Firestore
        const userEmailLower = (firebaseUser.email || '').trim().toLowerCase();
        if (!firebaseUser.emailVerified || !userEmailLower) {
          setResolvedStaffRole(null);
        } else if (userEmailLower === ADMIN_EMAIL) {
          setResolvedStaffRole('super_admin');
          try {
            const rolesSnap = await getDocs(collection(db, 'staffRoles'));
            const loaded: StaffMember[] = rolesSnap.docs.map((d) => {
              const r = d.data();
              return {
                id: String(r.id ?? d.id),
                email: String(r.email ?? '').toLowerCase(),
                displayName: String(r.displayName ?? r.email ?? 'Staff'),
                role: r.role === 'admin' ? 'admin' : 'moderator',
                note: typeof r.note === 'string' ? r.note : '',
                addedBy: String(r.addedBy ?? ADMIN_EMAIL),
                addedAt:
                  r.createdAt && typeof r.createdAt.toDate === 'function'
                    ? r.createdAt.toDate().toISOString().slice(0, 10)
                    : getLocalDateKey(),
              };
            });
            if (loaded.length > 0 || rolesSnap.empty) {
              setStaffMembers(loaded);
            }
          } catch {
            // Retain cached staffMembers if offline
          }
        } else {
          try {
            const myRoleSnap = await getDocs(
              query(collection(db, 'staffRoles'), where('email', '==', userEmailLower)),
            );
            const matchedDoc = myRoleSnap.docs[0]?.data();
            const matchedRole: StaffRole | null =
              matchedDoc?.role === 'admin'
                ? 'admin'
                : matchedDoc?.role === 'moderator'
                  ? 'moderator'
                  : null;
            setResolvedStaffRole(matchedRole);

            if (matchedRole === 'admin') {
              const teamSnap = await getDoc(doc(db, 'site', 'team'));
              if (teamSnap.exists()) {
                const tData = teamSnap.data();
                const displayNames =
                  tData.displayNames && typeof tData.displayNames === 'object'
                    ? (tData.displayNames as Record<string, string>)
                    : {};
                const adminList: string[] = Array.isArray(tData.adminEmails)
                  ? tData.adminEmails.filter((x): x is string => typeof x === 'string')
                  : [];
                const modList: string[] = Array.isArray(tData.moderatorEmails)
                  ? tData.moderatorEmails.filter((x): x is string => typeof x === 'string')
                  : [];
                const merged: StaffMember[] = [
                  ...adminList
                    .filter((e) => e.toLowerCase() !== ADMIN_EMAIL)
                    .map((email) => ({
                      id: toStaffDocId(email),
                      email: email.toLowerCase(),
                      displayName: displayNames[email.toLowerCase()] || email,
                      role: 'admin' as const,
                      addedBy: String(tData.updatedBy ?? ADMIN_EMAIL),
                      addedAt: getLocalDateKey(),
                    })),
                  ...modList
                    .filter((e) => e.toLowerCase() !== ADMIN_EMAIL)
                    .map((email) => ({
                      id: toStaffDocId(email),
                      email: email.toLowerCase(),
                      displayName: displayNames[email.toLowerCase()] || email,
                      role: 'moderator' as const,
                      addedBy: String(tData.updatedBy ?? ADMIN_EMAIL),
                      addedAt: getLocalDateKey(),
                    })),
                ];
                setStaffMembers(merged);
              }
            }
          } catch {
            setResolvedStaffRole(null);
          }
        }
      } catch (err) {
        console.error('Failed to initialize Firebase user profile:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uid = userProfile?.uid;
    if (!uid || readingStateHydratedUidRef.current !== uid) return;

    const today = getLocalDateKey();
    const todayIds = dailyProgress.date === today ? dailyProgress.episodeIds : [];
    const statePath = `users/${uid}/private/readingState`;
    const stateRef = doc(db, 'users', uid, 'private', 'readingState');
    void updateDoc(stateRef, {
      subscribedIds: subscribedIds.slice(0, 100),
      likedEpisodeIds: likedEpisodeIds.slice(0, 200),
      readEpisodeIds: readEpisodeIds.slice(0, 200),
      dailyProgressDate: today,
      dailyReadEpisodeIds: todayIds.slice(0, 100),
      updatedAt: serverTimestamp(),
    }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, statePath));
  }, [userProfile?.uid, subscribedIds, likedEpisodeIds, readEpisodeIds, dailyProgress]);

  const rawAllSeries = useMemo(
    () =>
      [...customSeries, ...INITIAL_WEBTOONS].map((s) => {
        const override = seriesOverrides[s.id];
        return override ? { ...s, ...override } : s;
      }),
    [customSeries, seriesOverrides],
  );

  const allSeries = useMemo(
    () => rawAllSeries.filter((s) => !siteConfig.hiddenSeriesIds.includes(s.id)),
    [rawAllSeries, siteConfig.hiddenSeriesIds],
  );

  const featuredSeries = useMemo(() => {
    if (siteConfig.featuredSeriesIds.length > 0) {
      const byId = new Map(allSeries.map((s) => [s.id, s]));
      const picked = siteConfig.featuredSeriesIds
        .map((id) => byId.get(id))
        .filter((s): s is WebtoonSeries => Boolean(s));
      if (picked.length > 0) return picked;
    }
    return allSeries.slice(0, 4);
  }, [allSeries, siteConfig.featuredSeriesIds]);

  const popularSorted = useMemo(
    () => [...allSeries].sort((a, b) => b.viewsCount - a.viewsCount),
    [allSeries],
  );

  const recommendedData = useMemo(() => {
    const historyIds = Array.from(new Set([...readEpisodeIds, ...likedEpisodeIds]));
    const historyEpisodes: Array<{
      series: WebtoonSeries;
      episodeLikes: number;
      userLiked: boolean;
    }> = [];

    for (const epId of historyIds) {
      const foundSeries = allSeries.find((s) => s.episodes.some((e) => e.id === epId));
      const foundEp = foundSeries?.episodes.find((e) => e.id === epId);
      if (foundSeries && foundEp) {
        historyEpisodes.push({
          series: foundSeries,
          episodeLikes: foundEp.likes,
          userLiked: likedEpisodeIds.includes(epId),
        });
      }
    }

    if (historyEpisodes.length === 0) {
      const starter = [...allSeries]
        .sort((a, b) => {
          const aMax = Math.max(0, ...a.episodes.map((e) => e.likes));
          const bMax = Math.max(0, ...b.episodes.map((e) => e.likes));
          return bMax - aMax;
        })
        .slice(0, 5);
      return {
        isPersonalized: false,
        topGenres: [] as Array<Exclude<GenreKey, 'all'>>,
        series: starter,
      };
    }

    const top3 = [...historyEpisodes]
      .sort((a, b) => {
        if (a.userLiked !== b.userLiked) return a.userLiked ? -1 : 1;
        return b.episodeLikes - a.episodeLikes;
      })
      .slice(0, 3);

    const genreScore = new Map<Exclude<GenreKey, 'all'>, number>();
    top3.forEach((item, index) => {
      const weight = 3 - index;
      genreScore.set(item.series.genre, (genreScore.get(item.series.genre) ?? 0) + weight);
    });

    const topGenres = Array.from(genreScore.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);

    const readSeriesIds = new Set(historyEpisodes.map((h) => h.series.id));

    const matched = allSeries
      .filter((s) => genreScore.has(s.genre))
      .sort((a, b) => {
        const aRead = readSeriesIds.has(a.id) ? 1 : 0;
        const bRead = readSeriesIds.has(b.id) ? 1 : 0;
        if (aRead !== bRead) return aRead - bRead;
        const aWeight = genreScore.get(a.genre) ?? 0;
        const bWeight = genreScore.get(b.genre) ?? 0;
        if (aWeight !== bWeight) return bWeight - aWeight;
        return b.viewsCount - a.viewsCount;
      })
      .slice(0, 5);

    return {
      isPersonalized: true,
      topGenres,
      series: matched,
    };
  }, [allSeries, readEpisodeIds, likedEpisodeIds]);

  const filteredSeries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSeries.filter((item) => {
      if (activeNav === 'canvas' && !item.isCanvas) return false;
      if (selectedGenre !== 'all' && item.genre !== selectedGenre) {
        return false;
      }
      if (q) {
        const hay = `${item.title.kh} ${item.title.en} ${item.author.kh} ${item.author.en}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSeries, activeNav, selectedGenre, searchQuery]);

  const activeSeries = useMemo(
    () => allSeries.find((s) => s.id === activeSeriesId) ?? null,
    [allSeries, activeSeriesId],
  );

  const activeEpisode = useMemo(() => {
    if (!activeSeries || !activeEpisodeId) return null;
    return activeSeries.episodes.find((ep) => ep.id === activeEpisodeId) ?? null;
  }, [activeSeries, activeEpisodeId]);

  const handleOpenSeries = (seriesId: string) => {
    setActiveSeriesId(seriesId);
    setActiveEpisodeId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recordTodayRead = useCallback((episodeId: string) => {
    const today = getLocalDateKey();
    setDailyProgress((prev) => {
      const base = prev.date === today ? prev.episodeIds : [];
      if (base.includes(episodeId)) {
        return prev.date === today ? prev : { date: today, episodeIds: base };
      }
      return {
        date: today,
        episodeIds: [...base, episodeId].slice(0, 100),
      };
    });
    setWeeklyHistory((prev) => {
      const existing = prev[today] ?? [];
      if (existing.includes(episodeId)) return prev;
      return pruneWeeklyHistory({
        ...prev,
        [today]: [...existing, episodeId].slice(0, 100),
      });
    });
  }, []);

  const handleReadEpisode = (seriesId: string, episodeId: string) => {
    setActiveSeriesId(seriesId);
    setActiveEpisodeId(episodeId);
    setReadEpisodeIds((prev) => (prev.includes(episodeId) ? prev : [...prev, episodeId]));
    recordTodayRead(episodeId);
  };

  const handleEpisodeFinished = useCallback(
    (episodeId: string) => {
      setReadEpisodeIds((prev) => (prev.includes(episodeId) ? prev : [...prev, episodeId]));
      recordTodayRead(episodeId);
      const foundSeries = allSeries.find((s) => s.episodes.some((e) => e.id === episodeId));
      const foundEp = foundSeries?.episodes.find((e) => e.id === episodeId);
      if (!foundSeries || !foundEp) return;

      setHistoryToast({
        seriesTitle: foundSeries.title,
        episodeNumber: foundEp.number,
      });

      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => {
        setHistoryToast(null);
      }, 4200);
    },
    [allSeries, recordTodayRead],
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleSubscribe = (seriesId: string) => {
    setSubscribedIds((prev) =>
      prev.includes(seriesId) ? prev.filter((id) => id !== seriesId) : [...prev, seriesId],
    );
  };

  const handleToggleLike = (episodeId: string) => {
    setLikedEpisodeIds((prev) =>
      prev.includes(episodeId) ? prev.filter((id) => id !== episodeId) : [...prev, episodeId],
    );
  };

  const handleAddComment = (episodeId: string, text: string) => {
    const newComment: CommentItem = {
      id: `comment-${Date.now()}`,
      author: lang === 'kh' ? 'អ្នកអាន WEBTOON' : 'WEBTOON Reader',
      timestamp: { kh: 'អម្បាញ់មិញ', en: 'Just now' },
      text,
      likes: 0,
    };
    setCommentsByEpisode((prev) => ({
      ...prev,
      [episodeId]: [newComment, ...(prev[episodeId] ?? [])],
    }));
  };

  const handlePublishCanvas = (newSeries: WebtoonSeries) => {
    setCustomSeries((prev) => [newSeries, ...prev]);
    setActiveNav('canvas');
    setActiveSeriesId(null);
    setActiveEpisodeId(null);
  };

  const handleDeleteCustomSeries = (seriesId: string) => {
    setCustomSeries((prev) => prev.filter((s) => s.id !== seriesId));
  };

  const handleUpdateSeries = (seriesId: string, patch: Partial<WebtoonSeries>) => {
    if (customSeries.some((s) => s.id === seriesId)) {
      setCustomSeries((prev) =>
        prev.map((s) => (s.id === seriesId ? { ...s, ...patch } : s)),
      );
      return;
    }
    setSeriesOverrides((prev) => ({
      ...prev,
      [seriesId]: { ...(prev[seriesId] ?? {}), ...patch },
    }));
  };

  const handleAddEpisodeToSeries = (seriesId: string, episode: Episode) => {
    if (customSeries.some((s) => s.id === seriesId)) {
      setCustomSeries((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? {
                ...s,
                episodes: [...s.episodes, episode].sort((a, b) => a.number - b.number),
              }
            : s,
        ),
      );
      return;
    }
    const base = rawAllSeries.find((s) => s.id === seriesId);
    if (!base) return;
    setSeriesOverrides((prev) => ({
      ...prev,
      [seriesId]: {
        ...(prev[seriesId] ?? {}),
        episodes: [...base.episodes, episode].sort((a, b) => a.number - b.number),
      },
    }));
  };

  const handleUpdateEpisodeInSeries = (seriesId: string, updatedEpisode: Episode) => {
    if (customSeries.some((s) => s.id === seriesId)) {
      setCustomSeries((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? {
                ...s,
                episodes: s.episodes
                  .map((ep) => (ep.id === updatedEpisode.id ? updatedEpisode : ep))
                  .sort((a, b) => a.number - b.number),
              }
            : s,
        ),
      );
      return;
    }
    const base = rawAllSeries.find((s) => s.id === seriesId);
    if (!base) return;
    setSeriesOverrides((prev) => ({
      ...prev,
      [seriesId]: {
        ...(prev[seriesId] ?? {}),
        episodes: base.episodes
          .map((ep) => (ep.id === updatedEpisode.id ? updatedEpisode : ep))
          .sort((a, b) => a.number - b.number),
      },
    }));
  };

  const handleDeleteEpisodeFromSeries = (seriesId: string, episodeId: string) => {
    if (customSeries.some((s) => s.id === seriesId)) {
      setCustomSeries((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? {
                ...s,
                episodes: s.episodes.filter((ep) => ep.id !== episodeId),
              }
            : s,
        ),
      );
      return;
    }
    const base = rawAllSeries.find((s) => s.id === seriesId);
    if (!base) return;
    setSeriesOverrides((prev) => ({
      ...prev,
      [seriesId]: {
        ...(prev[seriesId] ?? {}),
        episodes: base.episodes.filter((ep) => ep.id !== episodeId),
      },
    }));
  };

  const handleDeleteComment = (episodeId: string, commentId: string) => {
    setCommentsByEpisode((prev) => ({
      ...prev,
      [episodeId]: (prev[episodeId] ?? []).filter((c) => c.id !== commentId),
    }));
  };

  const currentUserEmail = (userProfile?.email ?? auth.currentUser?.email ?? '')
    .trim()
    .toLowerCase();
  const isVerifiedEmail = Boolean(auth.currentUser?.emailVerified);
  const effectiveStaffRole: StaffRole | null = !isVerifiedEmail
    ? null
    : currentUserEmail === ADMIN_EMAIL
      ? 'super_admin'
      : resolvedStaffRole;
  const isVerifiedAdmin =
    effectiveStaffRole === 'super_admin' || effectiveStaffRole === 'admin';
  const canAccessConsole = effectiveStaffRole !== null;

  useEffect(() => {
    if (!authReady || !userProfile || !isVerifiedEmail || !canAccessConsole) {
      setActivityLogsLoading(false);
      return;
    }

    setActivityLogsLoading(true);
    setActivityLogsError(null);

    const logsQuery = query(
      collection(db, 'activityLogs'),
      orderBy('createdAt', 'desc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      logsQuery,
      (snapshot) => {
        const remoteLogs: ActivityLogEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          const role: StaffRole =
            data.actorRole === 'super_admin' || data.actorRole === 'admin'
              ? data.actorRole
              : 'moderator';
          const category: ActivityCategory =
            data.category === 'staff' ||
            data.category === 'series' ||
            data.category === 'episode' ||
            data.category === 'comment' ||
            data.category === 'ads'
              ? data.category
              : 'settings';
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          return {
            id: String(data.id ?? d.id),
            actorEmail: String(data.actorEmail ?? ''),
            actorName: String(data.actorName ?? data.actorEmail ?? 'Staff'),
            actorRole: role,
            category,
            action: String(data.action ?? 'settings_updated') as ActivityAction,
            ...(typeof data.targetId === 'string' && data.targetId
              ? { targetId: data.targetId }
              : {}),
            targetLabel: String(data.targetLabel ?? ''),
            ...(typeof data.details === 'string' && data.details
              ? { details: data.details }
              : {}),
            createdAtMs,
          };
        });
        setActivityLogs(remoteLogs);
        setActivityLogsLoading(false);
      },
      (err) => {
        setActivityLogsLoading(false);
        setActivityLogsError(
          err instanceof Error ? err.message : 'Failed to load activity log',
        );
        handleFirestoreError(err, OperationType.LIST, 'activityLogs');
      },
    );

    return () => unsubscribe();
  }, [authReady, userProfile, isVerifiedEmail, canAccessConsole]);

  const recordActivityLog = useCallback(
    async (entry: {
      category: ActivityCategory;
      action: ActivityAction;
      targetId?: string;
      targetLabel: string;
      details?: string;
    }) => {
      if (!effectiveStaffRole) return;
      const actorEmail = (
        auth.currentUser?.email ||
        userProfile?.email ||
        ADMIN_EMAIL
      )
        .trim()
        .slice(0, 254);
      const actorName = (
        userProfile?.displayName ||
        auth.currentUser?.displayName ||
        actorEmail.split('@')[0]
      )
        .trim()
        .slice(0, 100);
      const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const cleanTargetLabel = entry.targetLabel.trim().slice(0, 160) || 'Action';
      const cleanTargetId = entry.targetId?.trim().slice(0, 128);
      const cleanDetails = entry.details?.trim().slice(0, 300);

      const localEntry: ActivityLogEntry = {
        id,
        actorEmail,
        actorName,
        actorRole: effectiveStaffRole,
        category: entry.category,
        action: entry.action,
        ...(cleanTargetId ? { targetId: cleanTargetId } : {}),
        targetLabel: cleanTargetLabel,
        ...(cleanDetails ? { details: cleanDetails } : {}),
        createdAtMs: Date.now(),
      };

      setActivityLogs((prev) => [localEntry, ...prev].slice(0, 150));

      if (!auth.currentUser?.emailVerified) return;

      const payload: Record<string, unknown> = {
        id,
        actorEmail,
        actorName,
        actorRole: effectiveStaffRole,
        category: entry.category,
        action: entry.action,
        targetLabel: cleanTargetLabel,
        createdAt: serverTimestamp(),
      };
      if (cleanTargetId) payload.targetId = cleanTargetId;
      if (cleanDetails) payload.details = cleanDetails;

      try {
        await setDoc(doc(db, 'activityLogs', id), payload);
      } catch (err) {
        setActivityLogsError(
          err instanceof Error ? err.message : 'Failed to record activity log',
        );
        handleFirestoreError(err, OperationType.CREATE, `activityLogs/${id}`);
      }
    },
    [effectiveStaffRole, userProfile?.displayName, userProfile?.email],
  );

  const handleUpdateSiteConfig = async (
    next: SiteAdminConfig,
    syncCloud = false,
  ) => {
    setCloudConfigError(null);
    setSiteConfig(next);
    if (!syncCloud) return;

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.emailVerified || !effectiveStaffRole) {
      return;
    }

    setSyncingCloudConfig(true);
    try {
      if (effectiveStaffRole === 'super_admin' || effectiveStaffRole === 'admin') {
        await setDoc(doc(db, 'site', 'config'), {
          announcementEnabled: next.announcementEnabled,
          announcementKh: next.announcementKh.slice(0, 200),
          announcementEn: next.announcementEn.slice(0, 200),
          announcementTone: next.announcementTone,
          canvasSubmissionsEnabled: next.canvasSubmissionsEnabled,
          hiddenSeriesIds: next.hiddenSeriesIds.slice(0, 100),
          featuredSeriesIds: next.featuredSeriesIds.slice(0, 20),
          updatedBy: currentUser.email,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'site', 'config'), {
          hiddenSeriesIds: next.hiddenSeriesIds.slice(0, 100),
          updatedBy: currentUser.email,
          updatedAt: serverTimestamp(),
        });
      }
      setLastCloudSyncAt(Date.now());
    } catch (err) {
      setCloudConfigError(err instanceof Error ? err.message : 'Failed to sync Firestore');
      handleFirestoreError(err, OperationType.WRITE, 'site/config');
    } finally {
      setSyncingCloudConfig(false);
    }
  };

  const handleUpdateAdsConfig = async (
    next: SiteAdsConfig,
    syncCloud = false,
  ) => {
    setCloudConfigError(null);
    const cleanCampaigns = sanitizeCampaignList(next.campaigns);
    const cleanAdsterra = sanitizeAdsterraConfig(next.adsterra ?? adsConfig.adsterra);
    const cleanAdskeeper = sanitizeAdskeeperConfig(next.adskeeper ?? adsConfig.adskeeper);
    const cleanAdsense = sanitizeAdsenseConfig(next.adsense ?? adsConfig.adsense);
    const normalized: SiteAdsConfig = {
      adsEnabled: Boolean(next.adsEnabled),
      campaigns: cleanCampaigns,
      adsterra: cleanAdsterra,
      adskeeper: cleanAdskeeper,
      adsense: cleanAdsense,
    };
    setAdsConfig(normalized);

    if (!syncCloud) return;
    const currentUser = auth.currentUser;
    if (
      !currentUser ||
      !currentUser.emailVerified ||
      (effectiveStaffRole !== 'super_admin' && effectiveStaffRole !== 'admin')
    ) {
      return;
    }

    setSyncingCloudConfig(true);
    try {
      await setDoc(doc(db, 'site', 'ads'), {
        adsEnabled: normalized.adsEnabled,
        campaigns: normalized.campaigns,
        adsterra: normalized.adsterra,
        adskeeper: normalized.adskeeper,
        adsense: normalized.adsense,
        updatedBy: currentUser.email,
        updatedAt: serverTimestamp(),
      });
      setLastCloudSyncAt(Date.now());
    } catch (err) {
      setCloudConfigError(err instanceof Error ? err.message : 'Failed to sync sponsor ads');
      handleFirestoreError(err, OperationType.WRITE, 'site/ads');
    } finally {
      setSyncingCloudConfig(false);
    }
  };

  const handleTrackAdImpression = useCallback((campaignId: string) => {
    const dayKey = getLocalDateKey();
    setAdMetricsByDate((prev) => {
      const campaignDays = prev[campaignId] ?? {};
      const existing = campaignDays[dayKey] ?? { impressions: 0, clicks: 0 };
      return {
        ...prev,
        [campaignId]: {
          ...campaignDays,
          [dayKey]: {
            impressions: existing.impressions + 1,
            clicks: existing.clicks,
          },
        },
      };
    });
  }, []);

  const handleTrackAdClick = useCallback((campaignId: string) => {
    const dayKey = getLocalDateKey();
    setAdClickCounts((prev) => ({
      ...prev,
      [campaignId]: (prev[campaignId] ?? 0) + 1,
    }));
    setAdMetricsByDate((prev) => {
      const campaignDays = prev[campaignId] ?? {};
      const existing = campaignDays[dayKey] ?? { impressions: 0, clicks: 0 };
      return {
        ...prev,
        [campaignId]: {
          ...campaignDays,
          [dayKey]: {
            impressions: existing.impressions,
            clicks: existing.clicks + 1,
          },
        },
      };
    });
  }, []);

  const syncStaffTeamDoc = async (
    batch: ReturnType<typeof writeBatch>,
    nextMembers: StaffMember[],
    actorEmail: string,
  ) => {
    const adminEmails = Array.from(
      new Set(nextMembers.filter((m) => m.role === 'admin').map((m) => m.email.toLowerCase())),
    ).slice(0, 25);
    const moderatorEmails = Array.from(
      new Set(nextMembers.filter((m) => m.role === 'moderator').map((m) => m.email.toLowerCase())),
    ).slice(0, 50);
    const displayNames: Record<string, string> = {};
    for (const m of nextMembers.slice(0, 75)) {
      displayNames[m.email.toLowerCase()] = m.displayName.slice(0, 100);
    }
    batch.set(doc(db, 'site', 'team'), {
      adminEmails,
      moderatorEmails,
      displayNames,
      updatedBy: actorEmail,
      updatedAt: serverTimestamp(),
    });
  };

  const handleAddStaffMember = async (input: {
    email: string;
    displayName: string;
    role: 'admin' | 'moderator';
    note?: string;
  }) => {
    const cleanEmail = input.email.trim().toLowerCase().slice(0, 254);
    const cleanName = input.displayName.trim().slice(0, 100) || cleanEmail;
    const cleanNote = (input.note ?? '').trim().slice(0, 200);
    if (!cleanEmail || cleanEmail === ADMIN_EMAIL) return;

    const id = toStaffDocId(cleanEmail);
    const actorEmail = auth.currentUser?.email || ADMIN_EMAIL;
    const newMember: StaffMember = {
      id,
      email: cleanEmail,
      displayName: cleanName,
      role: input.role,
      note: cleanNote,
      addedBy: actorEmail,
      addedAt: getLocalDateKey(),
    };

    const nextMembers = [
      newMember,
      ...staffMembers.filter((m) => m.email.toLowerCase() !== cleanEmail),
    ];
    setStaffMembers(nextMembers);
    setCloudConfigError(null);

    if (!isVerifiedAdmin || !auth.currentUser?.emailVerified) return;

    setSyncingCloudConfig(true);
    try {
      const roleRef = doc(db, 'staffRoles', id);
      const existingSnap = await getDoc(roleRef);
      const batch = writeBatch(db);
      if (existingSnap.exists()) {
        batch.update(roleRef, {
          displayName: cleanName,
          role: input.role,
          note: cleanNote,
          addedBy: actorEmail,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(roleRef, {
          id,
          email: cleanEmail,
          displayName: cleanName,
          role: input.role,
          note: cleanNote,
          addedBy: actorEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await syncStaffTeamDoc(batch, nextMembers, actorEmail);
      await batch.commit();
      setLastCloudSyncAt(Date.now());
      void recordActivityLog({
        category: 'staff',
        action: 'staff_added',
        targetId: id,
        targetLabel: cleanEmail,
        details: `${cleanName} · ${input.role}`,
      }).catch(() => undefined);
    } catch (err) {
      setCloudConfigError(err instanceof Error ? err.message : 'Failed to sync team member');
      handleFirestoreError(err, OperationType.WRITE, `staffRoles/${id}`);
    } finally {
      setSyncingCloudConfig(false);
    }
  };

  const handleUpdateStaffRole = async (
    memberId: string,
    nextRole: 'admin' | 'moderator',
  ) => {
    const target = staffMembers.find((m) => m.id === memberId);
    if (!target || target.email.toLowerCase() === ADMIN_EMAIL) return;

    const actorEmail = auth.currentUser?.email || ADMIN_EMAIL;
    const nextMembers = staffMembers.map((m) =>
      m.id === memberId ? { ...m, role: nextRole } : m,
    );
    setStaffMembers(nextMembers);
    setCloudConfigError(null);

    if (!isVerifiedAdmin || !auth.currentUser?.emailVerified) return;

    setSyncingCloudConfig(true);
    try {
      const roleRef = doc(db, 'staffRoles', memberId);
      const existingSnap = await getDoc(roleRef);
      const batch = writeBatch(db);
      if (existingSnap.exists()) {
        batch.update(roleRef, {
          role: nextRole,
          addedBy: actorEmail,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(roleRef, {
          id: target.id,
          email: target.email.toLowerCase(),
          displayName: target.displayName.slice(0, 100),
          role: nextRole,
          note: (target.note ?? '').slice(0, 200),
          addedBy: actorEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await syncStaffTeamDoc(batch, nextMembers, actorEmail);
      await batch.commit();
      setLastCloudSyncAt(Date.now());
      void recordActivityLog({
        category: 'staff',
        action: 'staff_role_changed',
        targetId: memberId,
        targetLabel: target.email,
        details: `${target.role} -> ${nextRole}`,
      }).catch(() => undefined);
    } catch (err) {
      setCloudConfigError(err instanceof Error ? err.message : 'Failed to update member role');
      handleFirestoreError(err, OperationType.UPDATE, `staffRoles/${memberId}`);
    } finally {
      setSyncingCloudConfig(false);
    }
  };

  const handleRemoveStaffMember = async (memberId: string) => {
    const target = staffMembers.find((m) => m.id === memberId);
    if (!target || target.email.toLowerCase() === ADMIN_EMAIL) return;

    const actorEmail = auth.currentUser?.email || ADMIN_EMAIL;
    const nextMembers = staffMembers.filter((m) => m.id !== memberId);
    setStaffMembers(nextMembers);
    setCloudConfigError(null);

    if (!isVerifiedAdmin || !auth.currentUser?.emailVerified) return;

    setSyncingCloudConfig(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'staffRoles', memberId));
      await syncStaffTeamDoc(batch, nextMembers, actorEmail);
      await batch.commit();
      setLastCloudSyncAt(Date.now());
      void recordActivityLog({
        category: 'staff',
        action: 'staff_removed',
        targetId: memberId,
        targetLabel: target.email,
        details: `Removed ${target.role}`,
      }).catch(() => undefined);
    } catch (err) {
      setCloudConfigError(err instanceof Error ? err.message : 'Failed to remove team member');
      handleFirestoreError(err, OperationType.DELETE, `staffRoles/${memberId}`);
    } finally {
      setSyncingCloudConfig(false);
    }
  };

  const handleResetSiteConfig = () => {
    setSiteConfig(DEFAULT_SITE_CONFIG);
    setSeriesOverrides({});
    setCloudConfigError(null);
  };

  const handleSelectNav = (nav: NavSection) => {
    setActiveNav(nav);
    setActiveSeriesId(null);
    setActiveEpisodeId(null);
    if (nav === 'originals') {
      setSelectedGenre('all');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(t(UI_TEXT.profile.authErrorPopup, lang));
      } else {
        setAuthError(t(UI_TEXT.profile.authErrorGeneric, lang));
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUserProfile(null);
    setResolvedStaffRole(null);
    if (activeNav === 'admin') {
      setActiveNav('originals');
    }
  };

  const handleSaveProfile = async (updates: {
    displayName: string;
    photoURL: string;
    bio: string;
    preferredLang: Language;
    dailyGoal: number;
  }) => {
    if (!userProfile) return;
    const uid = userProfile.uid;
    const infoPath = `users/${uid}/private/info`;
    const infoRef = doc(db, 'users', uid, 'private', 'info');
    const cleanName = updates.displayName.slice(0, 100);
    const cleanPhoto = updates.photoURL.slice(0, 65536);
    const cleanBio = updates.bio.slice(0, 300);
    const cleanGoal = Math.max(1, Math.min(50, Math.round(updates.dailyGoal || 3)));

    try {
      await updateDoc(infoRef, {
        displayName: cleanName,
        photoURL: cleanPhoto,
        bio: cleanBio,
        preferredLang: updates.preferredLang,
        dailyGoal: cleanGoal,
        updatedAt: serverTimestamp(),
      });
      if (auth.currentUser) {
        const authPhoto =
          cleanPhoto && !cleanPhoto.startsWith('data:') && cleanPhoto.length <= 2000
            ? cleanPhoto
            : undefined;
        await updateProfile(auth.currentUser, {
          displayName: cleanName,
          ...(authPhoto !== undefined ? { photoURL: authPhoto } : {}),
        }).catch(() => {
          // Non-fatal if auth profile photo URL is non-standard
        });
      }
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: cleanName,
              photoURL: cleanPhoto,
              bio: cleanBio,
              preferredLang: updates.preferredLang,
              dailyGoal: cleanGoal,
            }
          : null,
      );
      setLang(updates.preferredLang);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, infoPath);
    }
  };

  const toastNode = historyToast ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/95 px-4 py-3 text-zinc-100 shadow-lg backdrop-blur-md transition-all duration-200"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00DC64]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">
          {t(UI_TEXT.reader.historySavedTitle, lang)}
        </p>
        <p className="truncate text-[11px] text-zinc-400 font-mono-num">
          {t(historyToast.seriesTitle, lang)} · {t(UI_TEXT.series.episodePrefix, lang)}{' '}
          {historyToast.episodeNumber}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setHistoryToast(null)}
        aria-label={t(UI_TEXT.reader.dismissToast, lang)}
        className="cursor-pointer rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  ) : null;

  const todayKey = getLocalDateKey();
  const dailyReadCount =
    dailyProgress.date === todayKey ? dailyProgress.episodeIds.length : 0;

  const weeklyActivity = useMemo<DailyActivityPoint[]>(() => {
    const now = new Date();
    const points: DailyActivityPoint[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const dateKey = getLocalDateKey(d);
      const isToday = offset === 0;
      const historyIds = weeklyHistory[dateKey] ?? [];
      const count = isToday
        ? Array.from(
            new Set([
              ...historyIds,
              ...(dailyProgress.date === dateKey ? dailyProgress.episodeIds : []),
            ]),
          ).length
        : historyIds.length;
      points.push({
        date: dateKey,
        weekdayKey: WEEKDAY_ORDER[d.getDay()],
        shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
        count,
        isToday,
      });
    }
    return points;
  }, [weeklyHistory, dailyProgress]);

  const readingStreak = useMemo(() => {
    const now = new Date();
    const hasReadAtOffset = (offset: number): boolean => {
      const d = new Date(now);
      d.setDate(now.getDate() - offset);
      const key = getLocalDateKey(d);
      const historyCount = (weeklyHistory[key] ?? []).length;
      if (offset === 0) {
        const todayCount =
          dailyProgress.date === key ? dailyProgress.episodeIds.length : 0;
        return historyCount > 0 || todayCount > 0;
      }
      return historyCount > 0;
    };

    const startOffset = hasReadAtOffset(0) ? 0 : hasReadAtOffset(1) ? 1 : -1;
    if (startOffset === -1) return 0;

    let streak = 0;
    for (let offset = startOffset; offset < 365; offset += 1) {
      if (hasReadAtOffset(offset)) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }, [weeklyHistory, dailyProgress]);

  const topReadGenres = useMemo<TopGenreItem[]>(() => {
    const counts = new Map<Exclude<GenreKey, 'all'>, number>();
    for (const epId of readEpisodeIds) {
      const foundSeries = allSeries.find((s) => s.episodes.some((e) => e.id === epId));
      if (foundSeries) {
        counts.set(foundSeries.genre, (counts.get(foundSeries.genre) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [allSeries, readEpisodeIds]);

  const handleDismissModalAd = useCallback(
    (campaign: SponsorAdCampaign) => {
      setSessionDismissedModalIds((prev) => {
        if (prev.includes(campaign.id)) return prev;
        const next = [...prev, campaign.id];
        try {
          sessionStorage.setItem(STORAGE_KEYS.dismissedModalAds, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
      setDailyDismissedModalMap((prev) => ({
        ...prev,
        [campaign.id]: getLocalDateKey(),
      }));
    },
    [],
  );

  const activeAdsByPlacement = useMemo(() => {
    if (!adsConfig.adsEnabled) {
      return {
        home_banner: null as SponsorAdCampaign | null,
        discovery_inline: null as SponsorAdCampaign | null,
        reader_footer: null as SponsorAdCampaign | null,
        popup_modal: null as SponsorAdCampaign | null,
      };
    }

    const eligible = [...adsConfig.campaigns]
      .filter((c) => {
        if (!c.isActive) return false;
        if (c.startDate && c.startDate > todayKey) return false;
        if (c.endDate && c.endDate < todayKey) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);

    const pickFor = (slot: Exclude<AdPlacement, 'all' | 'popup_modal'>): SponsorAdCampaign | null =>
      eligible.find((c) => c.placement === slot) ??
      eligible.find((c) => c.placement === 'all') ??
      null;

    const popupModalCandidate =
      eligible.find((c) => {
        if (c.placement !== 'popup_modal') return false;
        if (c.modalFrequency === 'once_per_day') {
          return dailyDismissedModalMap[c.id] !== todayKey;
        }
        return !sessionDismissedModalIds.includes(c.id);
      }) ?? null;

    return {
      home_banner: pickFor('home_banner'),
      discovery_inline: pickFor('discovery_inline'),
      reader_footer: pickFor('reader_footer'),
      popup_modal: popupModalCandidate,
    };
  }, [adsConfig, todayKey, sessionDismissedModalIds, dailyDismissedModalMap]);

  const activeAdsterraByPlacement = useMemo(() => {
    const adsterra = adsConfig.adsterra;
    if (!adsConfig.adsEnabled || !adsterra?.enabled) {
      return {
        home_banner: null as AdsterraUnit | null,
        discovery_inline: null as AdsterraUnit | null,
        reader_footer: null as AdsterraUnit | null,
        globalScripts: [] as AdsterraUnit[],
      };
    }

    const activeUnits = adsterra.units.filter((u) => u.isActive);
    const pickSlot = (slot: Exclude<AdsterraPlacement, 'global_script'>): AdsterraUnit | null =>
      activeUnits.find((u) => u.placement === slot) ?? null;

    const resolveSlot = (slot: Exclude<AdsterraPlacement, 'global_script'>): AdsterraUnit | null => {
      const unit = pickSlot(slot);
      if (!unit) return null;
      const hasSponsor = Boolean(activeAdsByPlacement[slot]);
      if (adsterra.displayMode === 'backfill' && hasSponsor) {
        return null;
      }
      return unit;
    };

    return {
      home_banner: resolveSlot('home_banner'),
      discovery_inline: resolveSlot('discovery_inline'),
      reader_footer: resolveSlot('reader_footer'),
      globalScripts: activeUnits.filter(
        (u) => u.placement === 'global_script' && (u.format === 'social_bar' || u.format === 'popunder'),
      ),
    };
  }, [adsConfig, activeAdsByPlacement]);

  const activeAdskeeperByPlacement = useMemo(() => {
    const adskeeper = adsConfig.adskeeper;
    if (!adsConfig.adsEnabled || !adskeeper?.enabled) {
      return {
        home_banner: null as AdskeeperUnit | null,
        discovery_inline: null as AdskeeperUnit | null,
        reader_footer: null as AdskeeperUnit | null,
        globalScripts: [] as AdskeeperUnit[],
      };
    }

    const activeUnits = adskeeper.units.filter((u) => u.isActive);
    const pickSlot = (slot: Exclude<AdskeeperPlacement, 'global_script'>): AdskeeperUnit | null =>
      activeUnits.find((u) => u.placement === slot) ?? null;

    const resolveSlot = (slot: Exclude<AdskeeperPlacement, 'global_script'>): AdskeeperUnit | null => {
      const unit = pickSlot(slot);
      if (!unit) return null;
      const hasSponsor = Boolean(activeAdsByPlacement[slot]);
      const hasAdsterraPrimary = Boolean(
        adsConfig.adsterra?.enabled &&
          adsConfig.adsterra.displayMode === 'primary' &&
          activeAdsterraByPlacement[slot],
      );
      if (adskeeper.displayMode === 'backfill' && (hasSponsor || hasAdsterraPrimary)) {
        return null;
      }
      return unit;
    };

    return {
      home_banner: resolveSlot('home_banner'),
      discovery_inline: resolveSlot('discovery_inline'),
      reader_footer: resolveSlot('reader_footer'),
      globalScripts: activeUnits.filter(
        (u) => u.placement === 'global_script' && u.format === 'smart_widget',
      ),
    };
  }, [adsConfig, activeAdsByPlacement, activeAdsterraByPlacement]);

  const adsensePublisherId = normalizeAdsensePublisherId(adsConfig.adsense?.publisherId ?? '');

  const activeAdsenseByPlacement = useMemo(() => {
    const adsense = adsConfig.adsense;
    if (!adsConfig.adsEnabled || !adsense?.enabled || !adsensePublisherId) {
      return {
        home_banner: null as AdsenseUnit | null,
        discovery_inline: null as AdsenseUnit | null,
        reader_footer: null as AdsenseUnit | null,
        hasActiveSlots: false,
      };
    }

    const activeUnits = adsense.units.filter((u) => u.isActive && u.slotId);
    const pickSlot = (slot: AdsensePlacement): AdsenseUnit | null =>
      activeUnits.find((u) => u.placement === slot) ?? null;

    const resolveSlot = (slot: AdsensePlacement): AdsenseUnit | null => {
      const unit = pickSlot(slot);
      if (!unit) return null;
      const hasSponsor = Boolean(activeAdsByPlacement[slot]);
      const hasAdsterraPrimary = Boolean(
        adsConfig.adsterra?.enabled &&
          adsConfig.adsterra.displayMode === 'primary' &&
          activeAdsterraByPlacement[slot],
      );
      const hasAdskeeperPrimary = Boolean(
        adsConfig.adskeeper?.enabled &&
          adsConfig.adskeeper.displayMode === 'primary' &&
          activeAdskeeperByPlacement[slot],
      );
      if (
        adsense.displayMode === 'backfill' &&
        (hasSponsor || hasAdsterraPrimary || hasAdskeeperPrimary)
      ) {
        return null;
      }
      return unit;
    };

    const home = resolveSlot('home_banner');
    const inline = resolveSlot('discovery_inline');
    const footer = resolveSlot('reader_footer');

    return {
      home_banner: home,
      discovery_inline: inline,
      reader_footer: footer,
      hasActiveSlots: Boolean(home || inline || footer),
    };
  }, [
    adsConfig,
    adsensePublisherId,
    activeAdsByPlacement,
    activeAdsterraByPlacement,
    activeAdskeeperByPlacement,
  ]);

  const resolvedSlotSponsor = (
    slot: Exclude<AdsterraPlacement, 'global_script'>,
  ): SponsorAdCampaign | null => {
    const sponsor = activeAdsByPlacement[slot];
    if (!sponsor) return null;
    if (
      adsConfig.adsense?.enabled &&
      adsConfig.adsense.displayMode === 'primary' &&
      activeAdsenseByPlacement[slot]
    ) {
      return null;
    }
    if (
      adsConfig.adsterra?.enabled &&
      adsConfig.adsterra.displayMode === 'primary' &&
      activeAdsterraByPlacement[slot]
    ) {
      return null;
    }
    if (
      adsConfig.adskeeper?.enabled &&
      adsConfig.adskeeper.displayMode === 'primary' &&
      activeAdskeeperByPlacement[slot]
    ) {
      return null;
    }
    return sponsor;
  };

  const modalAdNode =
    activeAdsByPlacement.popup_modal && activeNav !== 'admin' ? (
      <SponsorModalAd
        campaign={activeAdsByPlacement.popup_modal}
        lang={lang}
        onAdClick={handleTrackAdClick}
        onAdImpression={handleTrackAdImpression}
        onDismiss={() =>
          activeAdsByPlacement.popup_modal &&
          handleDismissModalAd(activeAdsByPlacement.popup_modal)
        }
      />
    ) : null;

  const adsterraGlobalNode =
    activeNav !== 'admin' && activeAdsterraByPlacement.globalScripts.length > 0 ? (
      <AdsterraGlobalScripts
        units={activeAdsterraByPlacement.globalScripts}
        onAdImpression={handleTrackAdImpression}
      />
    ) : null;

  const adskeeperGlobalNode =
    activeNav !== 'admin' && activeAdskeeperByPlacement.globalScripts.length > 0 ? (
      <AdskeeperGlobalScripts
        units={activeAdskeeperByPlacement.globalScripts}
        onAdImpression={handleTrackAdImpression}
      />
    ) : null;

  const adsenseHeadNode =
    activeNav !== 'admin' &&
    adsConfig.adsEnabled &&
    Boolean(adsConfig.adsense?.enabled) &&
    Boolean(adsensePublisherId) &&
    (Boolean(adsConfig.adsense?.autoAdsEnabled) || activeAdsenseByPlacement.hasActiveSlots) ? (
      <AdsenseHeadScript publisherId={adsensePublisherId} enabled />
    ) : null;

  // Reader Mode
  if (activeSeries && activeEpisode) {
    return (
      <>
        <WebtoonReader
          series={activeSeries}
          episode={activeEpisode}
          lang={lang}
          onToggleLang={setLang}
          isLiked={likedEpisodeIds.includes(activeEpisode.id)}
          isSubscribed={subscribedIds.includes(activeSeries.id)}
          comments={commentsByEpisode[activeEpisode.id] ?? []}
          sponsorAd={resolvedSlotSponsor('reader_footer')}
          adsterraFooterAd={activeAdsterraByPlacement.reader_footer}
          adskeeperFooterAd={activeAdskeeperByPlacement.reader_footer}
          adsenseFooterAd={activeAdsenseByPlacement.reader_footer}
          adsensePublisherId={adsensePublisherId}
          onAdClick={handleTrackAdClick}
          onAdImpression={handleTrackAdImpression}
          onToggleLike={handleToggleLike}
          onToggleSubscribe={handleToggleSubscribe}
          onSelectEpisode={(epId) => handleReadEpisode(activeSeries.id, epId)}
          onAddComment={handleAddComment}
          onEpisodeFinished={handleEpisodeFinished}
          onBackToSeries={() => setActiveEpisodeId(null)}
        />
        {adsenseHeadNode}
        {adsterraGlobalNode}
        {adskeeperGlobalNode}
        {modalAdNode}
        {toastNode}
      </>
    );
  }

  // Canvas Creator Dashboard Mode
  if (activeNav === 'canvas' && !activeSeries) {
    return (
      <>
        <CanvasDashboard
          lang={lang}
          onToggleLang={setLang}
          userProfile={userProfile}
          customSeries={customSeries}
          communityCanvasSeries={INITIAL_WEBTOONS.filter((s) => s.isCanvas)}
          commentsByEpisode={commentsByEpisode}
          onCreateSeries={handlePublishCanvas}
          onAddEpisode={handleAddEpisodeToSeries}
          onUpdateEpisode={handleUpdateEpisodeInSeries}
          onDeleteEpisode={handleDeleteEpisodeFromSeries}
          onDeleteCustomSeries={handleDeleteCustomSeries}
          onOpenSeries={handleOpenSeries}
          onOpenProfile={() => handleSelectNav('profile')}
          onBackToSite={() => handleSelectNav('originals')}
        />
        {toastNode}
      </>
    );
  }

  // Admin & Moderator Console Mode
  if (activeNav === 'admin' && !activeSeries) {
    if (!canAccessConsole || !effectiveStaffRole) {
      return (
        <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
          <Header
            lang={lang}
            onToggleLang={setLang}
            activeNav={activeNav}
            onSelectNav={handleSelectNav}
            onGoHome={() => handleSelectNav('originals')}
            userProfile={userProfile}
            isAdmin={canAccessConsole}
            staffRole={effectiveStaffRole}
            dailyReadCount={dailyReadCount}
          />
          <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-12">
            <section className="w-full rounded-2xl border border-zinc-200 bg-white p-8 text-center">
              <h1 className="text-xl font-extrabold text-zinc-950">
                {lang === 'kh' ? 'សម្រាប់តែគណនីអ្នកគ្រប់គ្រងប៉ុណ្ណោះ' : 'Admin Access Restricted'}
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                {userProfile
                  ? lang === 'kh'
                    ? `គណនី ${userProfile.email} មិនមានសិទ្ធិ Admin ឬ Moderator ទេ។ សូមស្នើសុំសិទ្ធិពី ${ADMIN_EMAIL}។`
                    : `Signed in as ${userProfile.email}. Access is restricted to verified Admin or Moderator accounts approved by ${ADMIN_EMAIL}.`
                  : lang === 'kh'
                    ? `សូមចូលគណនី Google (${ADMIN_EMAIL}) ឬគណនី Admin / Moderator ដែលបានអនុញ្ញាត។`
                    : `Please sign in with ${ADMIN_EMAIL} or an authorized Admin / Moderator Google account.`}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!userProfile && (
                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleSignIn}
                    className="cursor-pointer rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:opacity-60"
                  >
                    {t(UI_TEXT.profile.signInGoogleBtn, lang)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectNav('originals')}
                  className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {t(UI_TEXT.adminPanel.backToStorefront, lang)}
                </button>
              </div>
            </section>
          </main>
          {toastNode}
        </div>
      );
    }

    return (
      <>
        <AdminPanel
          lang={lang}
          onToggleLang={setLang}
          userProfile={userProfile}
          staffRole={effectiveStaffRole}
          superAdminEmail={ADMIN_EMAIL}
          staffMembers={staffMembers}
          activityLogs={activityLogs}
          activityLogsLoading={activityLogsLoading}
          activityLogsError={activityLogsError}
          onDismissActivityLogsError={() => setActivityLogsError(null)}
          onRecordActivity={(entry) =>
            void recordActivityLog(entry).catch(() => undefined)
          }
          isVerifiedAdmin={isVerifiedAdmin}
          allSeries={rawAllSeries}
          customSeriesIds={customSeries.map((s) => s.id)}
          commentsByEpisode={commentsByEpisode}
          siteConfig={siteConfig}
          adsConfig={adsConfig}
          adClickCounts={adClickCounts}
          adMetricsByDate={adMetricsByDate}
          syncingCloud={syncingCloudConfig}
          cloudError={cloudConfigError}
          lastCloudSyncAt={lastCloudSyncAt}
          onUpdateSiteConfig={handleUpdateSiteConfig}
          onUpdateAdsConfig={handleUpdateAdsConfig}
          onResetSiteConfig={handleResetSiteConfig}
          onAddStaffMember={handleAddStaffMember}
          onUpdateStaffRole={handleUpdateStaffRole}
          onRemoveStaffMember={handleRemoveStaffMember}
          onCreateSeries={(newSeries) => {
            setCustomSeries((prev) => [newSeries, ...prev]);
          }}
          onUpdateSeries={handleUpdateSeries}
          onDeleteCustomSeries={handleDeleteCustomSeries}
          onAddEpisode={handleAddEpisodeToSeries}
          onUpdateEpisode={handleUpdateEpisodeInSeries}
          onDeleteEpisode={handleDeleteEpisodeFromSeries}
          onDeleteComment={handleDeleteComment}
          onOpenSeries={handleOpenSeries}
          onReadEpisode={handleReadEpisode}
          onBackToSite={() => handleSelectNav('originals')}
        />
        {toastNode}
      </>
    );
  }

  const announcementMessage =
    lang === 'kh'
      ? siteConfig.announcementKh.trim() || siteConfig.announcementEn.trim()
      : siteConfig.announcementEn.trim() || siteConfig.announcementKh.trim();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <Header
        lang={lang}
        onToggleLang={setLang}
        activeNav={activeNav}
        onSelectNav={handleSelectNav}
        onGoHome={() => handleSelectNav('originals')}
        userProfile={userProfile}
        isAdmin={canAccessConsole}
        staffRole={effectiveStaffRole}
        dailyReadCount={dailyReadCount}
      />

      {siteConfig.announcementEnabled && announcementMessage && (
        <div
          role="region"
          aria-label="Site announcement"
          className={`border-b px-4 py-2 text-center text-xs font-semibold ${
            siteConfig.announcementTone === 'amber'
              ? 'border-amber-200 bg-amber-50 text-amber-950'
              : siteConfig.announcementTone === 'slate'
                ? 'border-zinc-800 bg-zinc-950 text-zinc-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
        >
          {announcementMessage}
        </div>
      )}

      {/* Series Detail Mode */}
      {activeSeries ? (
        <div className="flex-1">
          <SeriesDetailView
            series={activeSeries}
            lang={lang}
            isSubscribed={subscribedIds.includes(activeSeries.id)}
            readEpisodeIds={readEpisodeIds}
            likedEpisodeIds={likedEpisodeIds}
            onToggleSubscribe={handleToggleSubscribe}
            onReadEpisode={handleReadEpisode}
            onBack={() => setActiveSeriesId(null)}
          />
        </div>
      ) : activeNav === 'library' ? (
        /* My Library View */
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            {t(UI_TEXT.library.title, lang)}
          </h1>

          {/* Subscribed Series */}
          <section className="mt-8">
            <h2 className="text-lg font-bold text-zinc-950">
              {t(UI_TEXT.library.subscribedSection, lang)}
            </h2>
            {subscribedIds.length === 0 ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-8 text-center">
                <p className="text-sm text-zinc-600">
                  {t(UI_TEXT.library.noSubscriptions, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectNav('originals')}
                  className="mt-4 cursor-pointer rounded-lg bg-[#00DC64] px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-[#00c458]"
                >
                  {t(UI_TEXT.library.browseOriginals, lang)}
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {allSeries
                  .filter((s) => subscribedIds.includes(s.id))
                  .map((series) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      lang={lang}
                      onSelect={handleOpenSeries}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Recently Read */}
          <section className="mt-12">
            <h2 className="text-lg font-bold text-zinc-950">
              {t(UI_TEXT.library.historySection, lang)}
            </h2>
            {readEpisodeIds.length === 0 ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-8 text-center">
                <p className="text-sm text-zinc-600">{t(UI_TEXT.library.noHistory, lang)}</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
                {readEpisodeIds.map((epId) => {
                  const foundSeries = allSeries.find((s) =>
                    s.episodes.some((e) => e.id === epId),
                  );
                  const foundEp = foundSeries?.episodes.find((e) => e.id === epId);
                  if (!foundSeries || !foundEp) return null;
                  return (
                    <button
                      key={epId}
                      type="button"
                      onClick={() => handleReadEpisode(foundSeries.id, foundEp.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-zinc-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={foundEp.thumbnailUrl}
                          alt={t(foundSeries.title, lang)}
                          referrerPolicy="no-referrer"
                          className="h-14 w-20 shrink-0 rounded-md object-cover border border-zinc-200"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-zinc-950">
                            {t(foundSeries.title, lang)}
                          </div>
                          <div className="truncate text-xs text-zinc-500 font-mono-num">
                            {t(UI_TEXT.series.episodePrefix, lang)} {foundEp.number} ·{' '}
                            {t(foundEp.title, lang)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#00A84C] whitespace-nowrap shrink-0">
                        {t(UI_TEXT.series.continueReading, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      ) : activeNav === 'profile' ? (
        <ProfileView
          lang={lang}
          authReady={authReady}
          userProfile={userProfile}
          googlePhotoUrl={googlePhotoUrl}
          authLoading={authLoading}
          authError={authError}
          subscribedSeries={allSeries.filter((s) => subscribedIds.includes(s.id))}
          readCount={readEpisodeIds.length}
          dailyReadCount={dailyReadCount}
          weeklyActivity={weeklyActivity}
          readingStreak={readingStreak}
          topReadGenres={topReadGenres}
          likedCount={likedEpisodeIds.length}
          isAdmin={canAccessConsole}
          staffRole={effectiveStaffRole}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          onSaveProfile={handleSaveProfile}
          onOpenLibrary={() => handleSelectNav('library')}
          onOpenSeries={handleOpenSeries}
          onOpenAdmin={() => handleSelectNav('admin')}
        />
      ) : (
        /* Main Discovery Views: Originals, Popular, Canvas */
        <main className="flex-1 pb-16">
          {activeNav === 'originals' && (
            <HeroShowcase
              featured={featuredSeries}
              lang={lang}
              onOpenSeries={handleOpenSeries}
              onReadEpisode={handleReadEpisode}
            />
          )}

          {(resolvedSlotSponsor('home_banner') ||
            activeAdsenseByPlacement.home_banner ||
            activeAdsterraByPlacement.home_banner ||
            activeAdskeeperByPlacement.home_banner) && (
            <div className="mx-auto mt-6 max-w-7xl space-y-4 px-4 sm:px-6">
              {resolvedSlotSponsor('home_banner') && (
                <SponsorAdBanner
                  campaign={resolvedSlotSponsor('home_banner')!}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdsenseByPlacement.home_banner && adsensePublisherId && (
                <AdsenseAdSlot
                  unit={activeAdsenseByPlacement.home_banner}
                  publisherId={adsensePublisherId}
                  lang={lang}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdsterraByPlacement.home_banner && (
                <AdsterraAdSlot
                  unit={activeAdsterraByPlacement.home_banner}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdskeeperByPlacement.home_banner && (
                <AdskeeperAdSlot
                  unit={activeAdskeeperByPlacement.home_banner}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
            </div>
          )}

          {/* Discovery Controls Container */}
          <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
                  {activeNav === 'canvas'
                    ? t(UI_TEXT.home.canvasSpotlightTitle, lang)
                    : activeNav === 'popular'
                      ? t(UI_TEXT.home.popularTitle, lang)
                      : t(UI_TEXT.home.dailyScheduleTitle, lang)}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {activeNav === 'canvas'
                    ? t(UI_TEXT.home.canvasSpotlightSub, lang)
                    : activeNav === 'popular'
                      ? t(UI_TEXT.home.popularSub, lang)
                      : t(UI_TEXT.home.dailyScheduleSub, lang)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t(UI_TEXT.home.searchPlaceholder, lang)}
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                {activeNav === 'canvas' && siteConfig.canvasSubmissionsEnabled && (
                  <button
                    type="button"
                    onClick={() => setShowCanvasModal(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap shrink-0"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{t(UI_TEXT.home.publishCanvasBtn, lang)}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Genre Filter Bar */}
            <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {GENRE_KEYS.map((g) => {
                const active = selectedGenre === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGenre(g)}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {t(UI_TEXT.genres[g], lang)}
                  </button>
                );
              })}
            </div>

            {/* Catalog Grid */}
            {activeNav === 'popular' ? (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {popularSorted
                  .filter((item) =>
                    selectedGenre === 'all' ? true : item.genre === selectedGenre,
                  )
                  .map((series, idx) => (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      lang={lang}
                      rank={idx + 1}
                      onSelect={handleOpenSeries}
                    />
                  ))}
              </div>
            ) : filteredSeries.length === 0 ? (
              <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-10 text-center">
                <p className="text-sm font-medium text-zinc-600">
                  {t(UI_TEXT.home.emptyTitle, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGenre('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 cursor-pointer rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  {t(UI_TEXT.home.emptyAction, lang)}
                </button>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {filteredSeries.map((series) => (
                  <SeriesCard
                    key={series.id}
                    series={series}
                    lang={lang}
                    onSelect={handleOpenSeries}
                  />
                ))}
              </div>
            )}
          </section>

          {(resolvedSlotSponsor('discovery_inline') ||
            activeAdsenseByPlacement.discovery_inline ||
            activeAdsterraByPlacement.discovery_inline ||
            activeAdskeeperByPlacement.discovery_inline) && (
            <div className="mx-auto mt-10 max-w-7xl space-y-4 px-4 sm:px-6">
              {resolvedSlotSponsor('discovery_inline') && (
                <SponsorAdBanner
                  campaign={resolvedSlotSponsor('discovery_inline')!}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdsenseByPlacement.discovery_inline && adsensePublisherId && (
                <AdsenseAdSlot
                  unit={activeAdsenseByPlacement.discovery_inline}
                  publisherId={adsensePublisherId}
                  lang={lang}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdsterraByPlacement.discovery_inline && (
                <AdsterraAdSlot
                  unit={activeAdsterraByPlacement.discovery_inline}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
              {activeAdskeeperByPlacement.discovery_inline && (
                <AdskeeperAdSlot
                  unit={activeAdskeeperByPlacement.discovery_inline}
                  lang={lang}
                  onAdClick={handleTrackAdClick}
                  onAdImpression={handleTrackAdImpression}
                />
              )}
            </div>
          )}

          {/* Recommended for You Section on Originals Discovery */}
          {activeNav === 'originals' && recommendedData.series.length > 0 && (
            <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
              <div className="mb-5 flex flex-col gap-1 border-b border-zinc-200 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
                    {t(UI_TEXT.home.recommendedTitle, lang)}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {recommendedData.isPersonalized
                      ? `${t(UI_TEXT.home.recommendedSub, lang)}: ${recommendedData.topGenres
                          .map((g) => t(UI_TEXT.genres[g], lang))
                          .join(' · ')}`
                      : t(UI_TEXT.home.recommendedEmptySub, lang)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-6">
                {recommendedData.series.map((series) => (
                  <SeriesCard
                    key={series.id}
                    series={series}
                    lang={lang}
                    onSelect={handleOpenSeries}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Top Trending Section on Originals Home */}
          {activeNav === 'originals' && (
            <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
              <div className="mb-5 flex items-baseline justify-between border-b border-zinc-200 pb-3">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-zinc-950">
                    {t(UI_TEXT.home.popularTitle, lang)}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t(UI_TEXT.home.popularSub, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectNav('popular')}
                  className="cursor-pointer text-xs font-bold text-[#00A84C] hover:underline whitespace-nowrap shrink-0"
                >
                  {t(UI_TEXT.nav.popular, lang)} →
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {popularSorted.slice(0, 6).map((series, idx) => (
                  <button
                    key={series.id}
                    type="button"
                    onClick={() => handleOpenSeries(series.id)}
                    className="group flex cursor-pointer items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50/70"
                  >
                    <span className="w-7 text-center text-lg font-extrabold text-zinc-400 font-mono-num group-hover:text-[#00A84C]">
                      {idx + 1}
                    </span>
                    <img
                      src={series.coverUrl}
                      alt={t(series.title, lang)}
                      referrerPolicy="no-referrer"
                      className="h-16 w-12 shrink-0 rounded-md object-cover border border-zinc-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-500">
                        {t(UI_TEXT.genres[series.genre], lang)}
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span className="font-mono-num">
                          {formatCompactNumber(series.viewsCount, lang)}{' '}
                          {t(UI_TEXT.home.viewsLabel, lang)}
                        </span>
                      </div>
                      <h3 className="mt-0.5 truncate text-sm font-bold text-zinc-950 group-hover:text-[#00A84C]">
                        {t(series.title, lang)}
                      </h3>
                      <p className="truncate text-xs text-zinc-500">
                        {t(series.author, lang)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="text-sm font-extrabold tracking-tight text-zinc-950">
              <span className="text-[#00DC64]">WEBTOON</span>{' '}
              <span>{lang === 'kh' ? 'កម្ពុជា' : 'KH'}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{t(UI_TEXT.footer.tagline, lang)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            <span>{t(UI_TEXT.footer.languageLabel, lang)}:</span>
            <button
              type="button"
              onClick={() => setLang('kh')}
              className={`cursor-pointer font-semibold ${
                lang === 'kh' ? 'text-zinc-950 underline underline-offset-4' : 'hover:text-zinc-900'
              }`}
            >
              ភាសាខ្មែរ (KH)
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`cursor-pointer font-semibold ${
                lang === 'en' ? 'text-zinc-950 underline underline-offset-4' : 'hover:text-zinc-900'
              }`}
            >
              English (ENG)
            </button>
            <span aria-hidden="true">·</span>
            <span>{t(UI_TEXT.footer.copyright, lang)}</span>
          </div>
        </div>
      </footer>

      {showCanvasModal && (
        <CanvasSubmitModal
          lang={lang}
          onClose={() => setShowCanvasModal(false)}
          onPublish={handlePublishCanvas}
        />
      )}
      {adsenseHeadNode}
      {adsterraGlobalNode}
      {adskeeperGlobalNode}
      {modalAdNode}
      {toastNode}
    </div>
  );
}
