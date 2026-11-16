export type Language = 'kh' | 'en';

export type NavSection = 'originals' | 'popular' | 'canvas' | 'library' | 'profile' | 'admin';

export interface SiteAdminConfig {
  announcementEnabled: boolean;
  announcementKh: string;
  announcementEn: string;
  announcementTone: 'emerald' | 'amber' | 'slate';
  canvasSubmissionsEnabled: boolean;
  hiddenSeriesIds: string[];
  featuredSeriesIds: string[];
}

export type AdPlacement =
  | 'home_banner'
  | 'discovery_inline'
  | 'reader_footer'
  | 'popup_modal'
  | 'all';

export type AdTone = 'emerald' | 'amber' | 'slate';

export type AdStyle = 'card' | 'spotlight' | 'hero_image' | 'minimal';

export type ModalAdFrequency = 'once_per_session' | 'once_per_day';

export interface SponsorAdCampaign {
  id: string;
  sponsorName: string;
  titleKh: string;
  titleEn: string;
  descriptionKh: string;
  descriptionEn: string;
  ctaLabelKh: string;
  ctaLabelEn: string;
  targetUrl: string;
  imageUrl: string;
  placement: AdPlacement;
  tone: AdTone;
  adStyle?: AdStyle;
  modalFrequency?: ModalAdFrequency;
  priority: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  updatedAtMs: number;
}

export type AdsterraFormat =
  | 'banner'
  | 'native_banner'
  | 'social_bar'
  | 'popunder'
  | 'direct_link';

export type AdsterraPlacement =
  | 'home_banner'
  | 'discovery_inline'
  | 'reader_footer'
  | 'global_script';

export type AdsterraDisplayMode = 'backfill' | 'coexist' | 'primary';

export interface AdsterraUnit {
  id: string;
  name: string;
  format: AdsterraFormat;
  placement: AdsterraPlacement;
  scriptSrc: string;
  zoneKey: string;
  containerId: string;
  width: number;
  height: number;
  directUrl: string;
  isActive: boolean;
  updatedAtMs: number;
}

export interface AdsterraConfig {
  enabled: boolean;
  displayMode: AdsterraDisplayMode;
  units: AdsterraUnit[];
}

export type AdskeeperFormat =
  | 'native_widget'
  | 'under_article'
  | 'in_feed_banner'
  | 'smart_widget'
  | 'direct_link';

export type AdskeeperPlacement =
  | 'home_banner'
  | 'discovery_inline'
  | 'reader_footer'
  | 'global_script';

export type AdskeeperDisplayMode = 'backfill' | 'coexist' | 'primary';

export interface AdskeeperUnit {
  id: string;
  name: string;
  format: AdskeeperFormat;
  placement: AdskeeperPlacement;
  scriptSrc: string;
  widgetId: string;
  rootId: string;
  directUrl: string;
  isActive: boolean;
  updatedAtMs: number;
}

export interface AdskeeperConfig {
  enabled: boolean;
  displayMode: AdskeeperDisplayMode;
  units: AdskeeperUnit[];
}

export type AdsenseFormat = 'display' | 'in_feed' | 'in_article' | 'multiplex';

export type AdsensePlacement = 'home_banner' | 'discovery_inline' | 'reader_footer';

export type AdsenseDisplayMode = 'backfill' | 'coexist' | 'primary';

export type AdsenseSizeMode = 'responsive' | 'fixed';

export interface AdsenseUnit {
  id: string;
  name: string;
  slotId: string;
  format: AdsenseFormat;
  placement: AdsensePlacement;
  sizeMode: AdsenseSizeMode;
  width: number;
  height: number;
  fullWidthResponsive: boolean;
  isActive: boolean;
  updatedAtMs: number;
}

export interface AdsenseConfig {
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  displayMode: AdsenseDisplayMode;
  units: AdsenseUnit[];
}

export interface SiteAdsConfig {
  adsEnabled: boolean;
  campaigns: SponsorAdCampaign[];
  adsterra?: AdsterraConfig;
  adskeeper?: AdskeeperConfig;
  adsense?: AdsenseConfig;
}

export interface AdDailyStat {
  impressions: number;
  clicks: number;
}

export type AdDailyMetricsMap = Record<string, Record<string, AdDailyStat>>;

export type StaffRole = 'super_admin' | 'admin' | 'moderator';

export interface StaffMember {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'moderator';
  note?: string;
  addedBy: string;
  addedAt: string;
}

export type ActivityCategory = 'staff' | 'series' | 'episode' | 'comment' | 'ads' | 'settings';

export type ActivityAction =
  | 'staff_added'
  | 'staff_role_changed'
  | 'staff_removed'
  | 'series_created'
  | 'series_updated'
  | 'series_deleted'
  | 'series_hidden'
  | 'series_restored'
  | 'series_featured'
  | 'series_unfeatured'
  | 'series_reordered'
  | 'episode_added'
  | 'episode_updated'
  | 'episode_deleted'
  | 'comment_deleted'
  | 'ad_created'
  | 'ad_updated'
  | 'ad_toggled'
  | 'ad_deleted'
  | 'ads_settings_updated'
  | 'settings_updated'
  | 'settings_reset';

export interface ActivityLogEntry {
  id: string;
  actorEmail: string;
  actorName: string;
  actorRole: StaffRole;
  category: ActivityCategory;
  action: ActivityAction;
  targetId?: string;
  targetLabel: string;
  details?: string;
  createdAtMs: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  preferredLang: Language;
  bio?: string;
  dailyGoal: number;
}

export interface DailyActivityPoint {
  date: string;
  weekdayKey: Exclude<WeekdayKey, 'completed'>;
  shortDate: string;
  count: number;
  isToday: boolean;
}

export interface TopGenreItem {
  genre: Exclude<GenreKey, 'all'>;
  count: number;
}

export type GenreKey =
  | 'all'
  | 'fantasy'
  | 'romance'
  | 'action'
  | 'mystery'
  | 'slice_of_life'
  | 'horror';

export type WeekdayKey =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun'
  | 'completed';

export interface BilingualText {
  kh: string;
  en: string;
}

export interface ComicSpeechBubble {
  id: string;
  speaker?: BilingualText;
  text: BilingualText;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  variant: 'speech' | 'thought' | 'narration' | 'sfx';
}

export interface ComicPanel {
  id: string;
  imageUrl?: string;
  sceneTheme: 'temple' | 'rain' | 'rooftop' | 'library' | 'noodle' | 'sanctuary';
  aspectClass?: string;
  caption?: BilingualText;
  bubbles: ComicSpeechBubble[];
}

export interface Episode {
  id: string;
  number: number;
  title: BilingualText;
  publishedDate: BilingualText;
  likes: number;
  thumbnailUrl: string;
  panels: ComicPanel[];
}

export interface WebtoonSeries {
  id: string;
  title: BilingualText;
  author: BilingualText;
  genre: Exclude<GenreKey, 'all'>;
  scheduleDay: WeekdayKey;
  isCanvas?: boolean;
  isNew?: boolean;
  coverUrl: string;
  bannerUrl: string;
  accentColor: string;
  synopsis: BilingualText;
  viewsCount: number;
  subscribersCount: number;
  rating: number;
  episodes: Episode[];
}

export interface CommentItem {
  id: string;
  author: string;
  timestamp: BilingualText;
  text: string;
  likes: number;
}
