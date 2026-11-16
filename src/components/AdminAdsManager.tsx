import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  Check,
  Cloud,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import {
  ActivityAction,
  ActivityCategory,
  AdDailyMetricsMap,
  AdPlacement,
  AdStyle,
  AdTone,
  AdsenseConfig,
  AdskeeperConfig,
  AdsterraConfig,
  Language,
  ModalAdFrequency,
  SiteAdsConfig,
  SponsorAdCampaign,
} from '../types';
import { AdPerformanceChart } from './AdPerformanceChart';
import { AdsenseManagerPanel } from './AdsenseManagerPanel';
import { AdskeeperManagerPanel } from './AdskeeperManagerPanel';
import { AdsterraManagerPanel } from './AdsterraManagerPanel';
import { SponsorAdBanner } from './SponsorAdBanner';
import { SponsorModalAd } from './SponsorModalAd';

interface AdminAdsManagerProps {
  lang: Language;
  adsConfig: SiteAdsConfig;
  adClickCounts: Record<string, number>;
  adMetricsByDate: AdDailyMetricsMap;
  isVerifiedAdmin: boolean;
  syncingCloud: boolean;
  cloudError: string | null;
  onSaveAdsConfig: (next: SiteAdsConfig, syncCloud?: boolean) => Promise<void>;
  onRecordActivity?: (entry: {
    category: ActivityCategory;
    action: ActivityAction;
    targetId?: string;
    targetLabel: string;
    details?: string;
  }) => void | Promise<void>;
}

const MAX_CAMPAIGNS = 15;

const PLACEMENT_OPTIONS: AdPlacement[] = [
  'home_banner',
  'discovery_inline',
  'reader_footer',
  'popup_modal',
  'all',
];

const TONE_OPTIONS: AdTone[] = ['emerald', 'amber', 'slate'];

const STYLE_OPTIONS: AdStyle[] = ['card', 'spotlight', 'hero_image', 'minimal'];

const TONE_SWATCHES: Record<AdTone, string> = {
  emerald: 'bg-[#00DC64] ring-emerald-200',
  amber: 'bg-amber-400 ring-amber-200',
  slate: 'bg-zinc-900 ring-zinc-300',
};

const FREQUENCY_OPTIONS: ModalAdFrequency[] = ['once_per_session', 'once_per_day'];

interface CampaignDraft {
  id: string | null;
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
  adStyle: AdStyle;
  tone: AdTone;
  modalFrequency: ModalAdFrequency;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

function emptyDraft(): CampaignDraft {
  return {
    id: null,
    sponsorName: '',
    titleKh: '',
    titleEn: '',
    descriptionKh: '',
    descriptionEn: '',
    ctaLabelKh: 'ស្វែងយល់បន្ថែម',
    ctaLabelEn: 'Learn More',
    targetUrl: 'https://',
    imageUrl: '',
    placement: 'home_banner',
    adStyle: 'card',
    tone: 'emerald',
    modalFrequency: 'once_per_session',
    isActive: true,
    startDate: '',
    endDate: '',
  };
}

function compressBannerImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 640;
        const maxHeight = 360;
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const webp = canvas.toDataURL('image/webp', 0.78);
        if (webp.length <= 48000) {
          resolve(webp);
          return;
        }
        const jpeg = canvas.toDataURL('image/jpeg', 0.72);
        resolve(jpeg.slice(0, 58000));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AdminAdsManager({
  lang,
  adsConfig,
  adClickCounts,
  adMetricsByDate,
  isVerifiedAdmin,
  syncingCloud,
  cloudError,
  onSaveAdsConfig,
  onRecordActivity,
}: AdminAdsManagerProps) {
  const [sourceTab, setSourceTab] = useState<'sponsors' | 'adsense' | 'adsterra' | 'adskeeper'>(
    'sponsors',
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [placementFilter, setPlacementFilter] = useState<'all_filter' | AdPlacement>('all_filter');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewModalCampaign, setPreviewModalCampaign] = useState<SponsorAdCampaign | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const adsterraConfig: AdsterraConfig = adsConfig.adsterra ?? {
    enabled: false,
    displayMode: 'backfill',
    units: [],
  };

  const adskeeperConfig: AdskeeperConfig = adsConfig.adskeeper ?? {
    enabled: false,
    displayMode: 'backfill',
    units: [],
  };

  const adsenseConfig: AdsenseConfig = adsConfig.adsense ?? {
    enabled: false,
    publisherId: '',
    autoAdsEnabled: false,
    displayMode: 'backfill',
    units: [],
  };

  useEffect(() => {
    if (!editorOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !previewModalCampaign) {
        setEditorOpen(false);
        setFormError(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [editorOpen, previewModalCampaign]);

  const todayStr = getTodayDateString();

  const sortedCampaigns = useMemo(
    () => [...adsConfig.campaigns].sort((a, b) => a.priority - b.priority),
    [adsConfig.campaigns],
  );

  const summary = useMemo(() => {
    const active = sortedCampaigns.filter((c) => c.isActive).length;
    const paused = sortedCampaigns.length - active;
    let impressions = 0;
    let clicks = 0;
    for (const c of sortedCampaigns) {
      const byDate = adMetricsByDate[c.id] ?? {};
      let dailyImpr = 0;
      let dailyClicks = 0;
      for (const stat of Object.values(byDate)) {
        dailyImpr += Math.max(0, stat.impressions ?? 0);
        dailyClicks += Math.max(0, stat.clicks ?? 0);
      }
      impressions += dailyImpr;
      clicks += Math.max(dailyClicks, adClickCounts[c.id] ?? 0);
    }
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
    return {
      total: sortedCampaigns.length,
      active,
      paused,
      impressions,
      clicks,
      ctr,
    };
  }, [sortedCampaigns, adClickCounts, adMetricsByDate]);

  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedCampaigns.filter((c) => {
      if (placementFilter !== 'all_filter' && c.placement !== placementFilter) return false;
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'paused' && c.isActive) return false;
      if (q) {
        const hay = `${c.sponsorName} ${c.titleKh} ${c.titleEn} ${c.descriptionKh} ${c.descriptionEn}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sortedCampaigns, searchQuery, placementFilter, statusFilter]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const persistAds = async (next: SiteAdsConfig) => {
    await onSaveAdsConfig(next, isVerifiedAdmin);
    showToast(
      isVerifiedAdmin
        ? t(UI_TEXT.adminPanel.adsManager.savedCloudToast, lang)
        : t(UI_TEXT.adminPanel.adsManager.savedLocalToast, lang),
    );
  };

  const handleToggleMaster = async (enabled: boolean) => {
    const next: SiteAdsConfig = {
      ...adsConfig,
      adsEnabled: enabled,
    };
    await persistAds(next);
    void onRecordActivity?.({
      category: 'ads',
      action: 'ads_settings_updated',
      targetLabel: enabled ? 'Sponsor Ads: Enabled' : 'Sponsor Ads: Paused Globally',
      details: `${adsConfig.campaigns.length} campaigns configured`,
    });
  };

  const openCreateForm = () => {
    setFormError(null);
    setDraft(emptyDraft());
    setEditorOpen(true);
  };

  const openEditForm = (campaign: SponsorAdCampaign) => {
    setFormError(null);
    setDraft({
      id: campaign.id,
      sponsorName: campaign.sponsorName,
      titleKh: campaign.titleKh,
      titleEn: campaign.titleEn,
      descriptionKh: campaign.descriptionKh,
      descriptionEn: campaign.descriptionEn,
      ctaLabelKh: campaign.ctaLabelKh,
      ctaLabelEn: campaign.ctaLabelEn,
      targetUrl: campaign.targetUrl,
      imageUrl: campaign.imageUrl,
      placement: campaign.placement,
      adStyle: campaign.adStyle ?? 'card',
      tone: campaign.tone,
      modalFrequency: campaign.modalFrequency ?? 'once_per_session',
      isActive: campaign.isActive,
      startDate: campaign.startDate ?? '',
      endDate: campaign.endDate ?? '',
    });
    setEditorOpen(true);
  };

  const handleFillSample = () => {
    setDraft((prev) => ({
      ...prev,
      sponsorName: 'Khmer Roast Coffee',
      titleKh: 'រសជាតិកាហ្វេខ្មែរពិតៗ សម្រាប់អ្នកអាន WEBTOON',
      titleEn: '20% Off Iced Latte for WEBTOON KH Readers',
      descriptionKh: 'ប្រើកូដ WEBTOONKH នៅគ្រប់សាខាក្នុងរាជធានីភ្នំពេញ និងសៀមរាប។',
      descriptionEn: 'Show code WEBTOONKH at any Phnom Penh or Siem Reap branch this month.',
      ctaLabelKh: 'ទទួលប្រូម៉ូសិន',
      ctaLabelEn: 'Claim Offer',
      targetUrl: 'https://example.com/sponsor-offer',
      imageUrl: '/src/assets/images/cover_street_food_slice_1794804091862.jpg',
      tone: 'amber',
    }));
    setFormError(null);
  };

  const handleUploadBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      setFormError(t(UI_TEXT.profile.uploadErrorInvalid, lang));
      return;
    }
    try {
      const compressed = await compressBannerImage(file);
      setFormError(null);
      setDraft((prev) => ({ ...prev, imageUrl: compressed }));
    } catch {
      setFormError(t(UI_TEXT.profile.uploadErrorInvalid, lang));
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const sponsorName = draft.sponsorName.trim().slice(0, 80);
    const titleKh = (draft.titleKh.trim() || draft.titleEn.trim()).slice(0, 140);
    const titleEn = (draft.titleEn.trim() || draft.titleKh.trim()).slice(0, 140);
    const targetUrl = draft.targetUrl.trim().slice(0, 500);

    if (!sponsorName || (!titleKh && !titleEn) || !/^https?:\/\/.+/i.test(targetUrl)) {
      setFormError(t(UI_TEXT.adminPanel.adsManager.validationError, lang));
      return;
    }

    if (!draft.id && adsConfig.campaigns.length >= MAX_CAMPAIGNS) {
      setFormError(t(UI_TEXT.adminPanel.adsManager.maxCampaignsHint, lang));
      return;
    }

    const isEditing = Boolean(draft.id);
    const existing = isEditing ? adsConfig.campaigns.find((c) => c.id === draft.id) : null;
    const id = existing?.id || `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const nextCampaign: SponsorAdCampaign = {
      id,
      sponsorName,
      titleKh,
      titleEn,
      descriptionKh: draft.descriptionKh.trim().slice(0, 240),
      descriptionEn: draft.descriptionEn.trim().slice(0, 240),
      ctaLabelKh: (draft.ctaLabelKh.trim() || 'ស្វែងយល់បន្ថែម').slice(0, 40),
      ctaLabelEn: (draft.ctaLabelEn.trim() || 'Learn More').slice(0, 40),
      targetUrl,
      imageUrl: draft.imageUrl.trim().slice(0, 60000),
      placement: draft.placement,
      adStyle: draft.adStyle,
      tone: draft.tone,
      ...(draft.placement === 'popup_modal' ? { modalFrequency: draft.modalFrequency } : {}),
      priority: existing ? existing.priority : adsConfig.campaigns.length,
      isActive: draft.isActive,
      ...(draft.startDate ? { startDate: draft.startDate } : {}),
      ...(draft.endDate ? { endDate: draft.endDate } : {}),
      updatedAtMs: Date.now(),
    };

    const nextList = existing
      ? adsConfig.campaigns.map((c) => (c.id === existing.id ? nextCampaign : c))
      : [...adsConfig.campaigns, nextCampaign];

    const normalizedList = nextList
      .sort((a, b) => a.priority - b.priority)
      .map((item, idx) => ({ ...item, priority: idx }));

    await persistAds({
      ...adsConfig,
      campaigns: normalizedList,
    });

    void onRecordActivity?.({
      category: 'ads',
      action: isEditing ? 'ad_updated' : 'ad_created',
      targetId: id,
      targetLabel: `${sponsorName} · ${titleEn || titleKh}`,
      details: `Placement: ${draft.placement} · Style: ${draft.adStyle} · ${draft.isActive ? 'Active' : 'Paused'}`,
    });

    setEditorOpen(false);
    setDraft(emptyDraft());
    setFormError(null);
  };

  const handleToggleCampaignActive = async (campaign: SponsorAdCampaign) => {
    const nextActive = !campaign.isActive;
    const nextCampaigns = adsConfig.campaigns.map((c) =>
      c.id === campaign.id ? { ...c, isActive: nextActive, updatedAtMs: Date.now() } : c,
    );
    await persistAds({
      ...adsConfig,
      campaigns: nextCampaigns,
    });
    void onRecordActivity?.({
      category: 'ads',
      action: 'ad_toggled',
      targetId: campaign.id,
      targetLabel: campaign.sponsorName,
      details: nextActive ? 'Activated campaign' : 'Paused campaign',
    });
  };

  const handleMoveCampaign = async (campaignId: string, direction: -1 | 1) => {
    const idx = sortedCampaigns.findIndex((c) => c.id === campaignId);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sortedCampaigns.length) return;
    const reordered = [...sortedCampaigns];
    const tmp = reordered[idx];
    reordered[idx] = reordered[targetIdx];
    reordered[targetIdx] = tmp;
    const normalized = reordered.map((c, i) => ({ ...c, priority: i }));
    await persistAds({
      ...adsConfig,
      campaigns: normalized,
    });
  };

  const handleDeleteCampaign = async (campaign: SponsorAdCampaign) => {
    const remaining = sortedCampaigns
      .filter((c) => c.id !== campaign.id)
      .map((c, i) => ({ ...c, priority: i }));
    await persistAds({
      ...adsConfig,
      campaigns: remaining,
    });
    setConfirmDeleteId(null);
    void onRecordActivity?.({
      category: 'ads',
      action: 'ad_deleted',
      targetId: campaign.id,
      targetLabel: `${campaign.sponsorName} · ${campaign.titleEn || campaign.titleKh}`,
    });
  };

  const previewCampaign: SponsorAdCampaign = {
    id: draft.id ?? 'preview',
    sponsorName: draft.sponsorName.trim() || (lang === 'kh' ? 'ឈ្មោះក្រុមហ៊ុនដៃគូ' : 'Partner Brand'),
    titleKh: draft.titleKh.trim() || 'ចំណងជើងផ្សាយពាណិជ្ជកម្មរបស់អ្នកឧបត្ថម្ភ',
    titleEn: draft.titleEn.trim() || 'Partner Sponsor Headline Preview',
    descriptionKh: draft.descriptionKh.trim(),
    descriptionEn: draft.descriptionEn.trim(),
    ctaLabelKh: draft.ctaLabelKh.trim() || 'ស្វែងយល់បន្ថែម',
    ctaLabelEn: draft.ctaLabelEn.trim() || 'Learn More',
    targetUrl: draft.targetUrl.trim() || 'https://example.com',
    imageUrl: draft.imageUrl.trim(),
    placement: draft.placement,
    adStyle: draft.adStyle,
    tone: draft.tone,
    modalFrequency: draft.modalFrequency,
    priority: 0,
    isActive: draft.isActive,
    updatedAtMs: Date.now(),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
            {t(UI_TEXT.adminPanel.tabs.ads, lang)}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsManager.subtitle, lang)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedbackMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {feedbackMsg}
            </span>
          )}
          {sourceTab === 'sponsors' && (
            <button
              type="button"
              disabled={adsConfig.campaigns.length >= MAX_CAMPAIGNS}
              onClick={openCreateForm}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.adsManager.newAdBtn, lang)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ad Source Switcher: Direct Sponsors, Google AdSense, Adsterra, AdsKeeper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Ad source"
          className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'sponsors'}
            onClick={() => setSourceTab('sponsors')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'sponsors'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />
            <span>{t(UI_TEXT.adminPanel.adsterra.sourceTabSponsors, lang)}</span>
            <span className="font-mono-num text-[11px] text-zinc-400">
              ({summary.active}/{summary.total})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'adsense'}
            onClick={() => setSourceTab('adsense')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'adsense'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <BadgeDollarSign className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />
            <span>{t(UI_TEXT.adminPanel.adsense.sourceTabAdsense, lang)}</span>
            <span className="font-mono-num text-[11px] text-zinc-400">
              ({adsenseConfig.units.filter((u) => u.isActive).length})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'adsterra'}
            onClick={() => setSourceTab('adsterra')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'adsterra'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Globe className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />
            <span>{t(UI_TEXT.adminPanel.adsterra.sourceTabAdsterra, lang)}</span>
            <span className="font-mono-num text-[11px] text-zinc-400">
              ({adsterraConfig.units.filter((u) => u.isActive).length})
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceTab === 'adskeeper'}
            onClick={() => setSourceTab('adskeeper')}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              sourceTab === 'adskeeper'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-950'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />
            <span>{t(UI_TEXT.adminPanel.adskeeper.sourceTabAdskeeper, lang)}</span>
            <span className="font-mono-num text-[11px] text-zinc-400">
              ({adskeeperConfig.units.filter((u) => u.isActive).length})
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {sourceTab === 'adsense' && (
            <a
              href="https://adsense.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:underline whitespace-nowrap"
            >
              <span>adsense.google.com</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          {(sourceTab === 'sponsors' || sourceTab === 'adsterra') && (
            <a
              href="https://beta.publishers.adsterra.com/websites"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:underline whitespace-nowrap"
            >
              <span>beta.publishers.adsterra.com/websites</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
          {(sourceTab === 'sponsors' || sourceTab === 'adskeeper') && (
            <a
              href="https://dashboard.adskeeper.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:underline whitespace-nowrap"
            >
              <span>dashboard.adskeeper.com</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {cloudError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          {cloudError}
        </div>
      )}

      {sourceTab === 'adsense' ? (
        <AdsenseManagerPanel
          lang={lang}
          adsense={adsenseConfig}
          isVerifiedAdmin={isVerifiedAdmin}
          syncingCloud={syncingCloud}
          onSaveAdsense={async (nextAdsense, audit) => {
            await persistAds({
              ...adsConfig,
              adsense: nextAdsense,
            });
            if (audit) {
              void onRecordActivity?.({
                category: 'ads',
                action: audit.action,
                targetId: audit.targetId,
                targetLabel: audit.targetLabel,
                details: audit.details,
              });
            }
          }}
        />
      ) : sourceTab === 'adsterra' ? (
        <AdsterraManagerPanel
          lang={lang}
          adsterra={adsterraConfig}
          isVerifiedAdmin={isVerifiedAdmin}
          syncingCloud={syncingCloud}
          onSaveAdsterra={async (nextAdsterra, audit) => {
            await persistAds({
              ...adsConfig,
              adsterra: nextAdsterra,
            });
            if (audit) {
              void onRecordActivity?.({
                category: 'ads',
                action: audit.action,
                targetId: audit.targetId,
                targetLabel: audit.targetLabel,
                details: audit.details,
              });
            }
          }}
        />
      ) : sourceTab === 'adskeeper' ? (
        <AdskeeperManagerPanel
          lang={lang}
          adskeeper={adskeeperConfig}
          isVerifiedAdmin={isVerifiedAdmin}
          syncingCloud={syncingCloud}
          onSaveAdskeeper={async (nextAdskeeper, audit) => {
            await persistAds({
              ...adsConfig,
              adskeeper: nextAdskeeper,
            });
            if (audit) {
              void onRecordActivity?.({
                category: 'ads',
                action: audit.action,
                targetId: audit.targetId,
                targetLabel: audit.targetLabel,
                details: audit.details,
              });
            }
          }}
        />
      ) : (
        <>
          {/* Master Switch + KPI Strip */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 lg:col-span-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 shrink-0 text-[#00A84C]" aria-hidden="true" />
                  <span className="text-xs font-bold text-zinc-950">
                    {t(UI_TEXT.adminPanel.adsManager.masterSwitchTitle, lang)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.masterSwitchDesc, lang)}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={adsConfig.adsEnabled}
                disabled={syncingCloud}
                onClick={() => void handleToggleMaster(!adsConfig.adsEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  adsConfig.adsEnabled ? 'bg-[#00DC64]' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    adsConfig.adsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-5 lg:col-span-7">
              <div>
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.kpiTotal, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                  {summary.total}
                  <span className="text-xs font-medium text-zinc-400">/{MAX_CAMPAIGNS}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.kpiActive, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-700 font-mono-num">
                  {summary.active}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsAnalytics.kpiImpressions, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                  {formatCompactNumber(summary.impressions, lang)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsManager.kpiClicks, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
                  {formatCompactNumber(summary.clicks, lang)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">
                  {t(UI_TEXT.adminPanel.adsAnalytics.kpiCtr, lang)}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-[#00A84C] font-mono-num">
                  {summary.ctr.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Performance Trends & CTR Analytics */}
          <AdPerformanceChart
            lang={lang}
            adsEnabled={adsConfig.adsEnabled}
            campaigns={adsConfig.campaigns}
            adClickCounts={adClickCounts}
            adMetricsByDate={adMetricsByDate}
          />

      {/* Create / Edit Campaign Modal Dialog */}
      {editorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            draft.id
              ? t(UI_TEXT.adminPanel.adsManager.editAdHeading, lang)
              : t(UI_TEXT.adminPanel.adsManager.createAdHeading, lang)
          }
          onClick={() => {
            setEditorOpen(false);
            setFormError(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <h2 className="text-base font-extrabold text-zinc-950">
                {draft.id
                  ? t(UI_TEXT.adminPanel.adsManager.editAdHeading, lang)
                  : t(UI_TEXT.adminPanel.adsManager.createAdHeading, lang)}
              </h2>

              <div className="flex items-center gap-2">
                {!draft.id && (
                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#00A84C]" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.adsManager.quickTemplateBtn, lang)}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setFormError(null);
                  }}
                  aria-label={t(UI_TEXT.adminPanel.adsManager.cancelEditBtn, lang)}
                  className="cursor-pointer rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => void handleSaveCampaign(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.sponsorNameLabel, lang)}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={draft.sponsorName}
                    onChange={(e) => setDraft((prev) => ({ ...prev, sponsorName: e.target.value }))}
                    placeholder="e.g. Smart Axiata, ABA, Brown Coffee"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.placementLabel, lang)}
                  </label>
                  <select
                    value={draft.placement}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, placement: e.target.value as AdPlacement }))
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    {PLACEMENT_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {t(UI_TEXT.adminPanel.adsManager.placements[p], lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ad Layout Style Picker */}
              <div>
                <span className="mb-2 block text-xs font-semibold text-zinc-700">
                  {t(UI_TEXT.adminPanel.adsManager.adStyleLabel, lang)}
                </span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {STYLE_OPTIONS.map((styleOpt) => {
                    const selected = draft.adStyle === styleOpt;
                    return (
                      <button
                        key={styleOpt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDraft((prev) => ({ ...prev, adStyle: styleOpt }))}
                        className={`flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-2.5 text-left transition-all ${
                          selected
                            ? 'border-[#00DC64] bg-emerald-50/50 ring-2 ring-[#00DC64]/25'
                            : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        {/* Mini wireframe preview */}
                        <div className="flex h-11 w-full items-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 p-1.5">
                          {styleOpt === 'card' && (
                            <div className="flex w-full items-center gap-1.5">
                              <div className="h-7 w-9 shrink-0 rounded bg-zinc-300" />
                              <div className="flex-1 space-y-1">
                                <div className="h-1.5 w-3/4 rounded bg-zinc-700" />
                                <div className="h-1 w-1/2 rounded bg-zinc-300" />
                              </div>
                              <div className="h-3.5 w-6 shrink-0 rounded bg-[#00DC64]" />
                            </div>
                          )}
                          {styleOpt === 'spotlight' && (
                            <div className="flex w-full items-center gap-1.5 border-l-2 border-[#00DC64] pl-1.5">
                              <div className="h-8 w-11 shrink-0 rounded bg-zinc-300" />
                              <div className="flex-1 space-y-1">
                                <div className="h-1 w-1/3 rounded bg-emerald-600" />
                                <div className="h-1.5 w-full rounded bg-zinc-800" />
                                <div className="h-2.5 w-7 rounded bg-zinc-900" />
                              </div>
                            </div>
                          )}
                          {styleOpt === 'hero_image' && (
                            <div className="relative flex h-full w-full items-end justify-between rounded bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950 p-1.5">
                              <div className="space-y-0.5">
                                <div className="h-1 w-8 rounded bg-[#00DC64]" />
                                <div className="h-1.5 w-14 rounded bg-white" />
                              </div>
                              <div className="h-3 w-6 rounded bg-[#00DC64]" />
                            </div>
                          )}
                          {styleOpt === 'minimal' && (
                            <div className="flex w-full items-center justify-between gap-1.5 px-0.5">
                              <div className="h-4 w-4 shrink-0 rounded bg-zinc-300" />
                              <div className="h-1.5 flex-1 rounded bg-zinc-700" />
                              <div className="h-1.5 w-6 shrink-0 rounded bg-[#00A84C]" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 w-full">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-[11px] font-bold text-zinc-950">
                              {t(UI_TEXT.adminPanel.adsManager.styles[styleOpt].title, lang)}
                            </span>
                            {selected && (
                              <Check
                                className="h-3.5 w-3.5 shrink-0 text-[#00A84C]"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-zinc-500">
                            {t(UI_TEXT.adminPanel.adsManager.styles[styleOpt].desc, lang)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Theme Swatches */}
              <div>
                <span className="mb-2 block text-xs font-semibold text-zinc-700">
                  {t(UI_TEXT.adminPanel.adsManager.toneLabel, lang)}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {TONE_OPTIONS.map((toneOpt) => {
                    const selected = draft.tone === toneOpt;
                    return (
                      <button
                        key={toneOpt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setDraft((prev) => ({ ...prev, tone: toneOpt }))}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          selected
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <span
                          className={`h-3 w-3 rounded-full ring-2 ${TONE_SWATCHES[toneOpt]}`}
                          aria-hidden="true"
                        />
                        <span>{t(UI_TEXT.adminPanel.adsManager.tones[toneOpt], lang)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {draft.placement === 'popup_modal' && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.modalFrequencyLabel, lang)}
                  </label>
                  <select
                    value={draft.modalFrequency}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        modalFrequency: e.target.value as ModalAdFrequency,
                      }))
                    }
                    className="w-full sm:w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 focus:border-[#00DC64] focus:outline-none"
                  >
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <option key={freq} value={freq}>
                        {t(UI_TEXT.adminPanel.adsManager.frequencies[freq], lang)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.titleKhLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={draft.titleKh}
                    onChange={(e) => setDraft((prev) => ({ ...prev, titleKh: e.target.value }))}
                    placeholder="ចំណងជើងជាភាសាខ្មែរ..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.titleEnLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={140}
                    value={draft.titleEn}
                    onChange={(e) => setDraft((prev) => ({ ...prev, titleEn: e.target.value }))}
                    placeholder="Sponsor headline in English..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.descKhLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={240}
                    value={draft.descriptionKh}
                    onChange={(e) => setDraft((prev) => ({ ...prev, descriptionKh: e.target.value }))}
                    placeholder="សេចក្តីលម្អិតខ្លី..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.descEnLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={240}
                    value={draft.descriptionEn}
                    onChange={(e) => setDraft((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                    placeholder="Short product or offer summary..."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.ctaKhLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={draft.ctaLabelKh}
                    onChange={(e) => setDraft((prev) => ({ ...prev, ctaLabelKh: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.ctaEnLabel, lang)}
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={draft.ctaLabelEn}
                    onChange={(e) => setDraft((prev) => ({ ...prev, ctaLabelEn: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.startDateLabel, lang)}
                  </label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none font-mono-num"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.endDateLabel, lang)}
                  </label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none font-mono-num"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.targetUrlLabel, lang)}
                  </label>
                  <input
                    type="url"
                    required
                    maxLength={500}
                    value={draft.targetUrl}
                    onChange={(e) => setDraft((prev) => ({ ...prev, targetUrl: e.target.value }))}
                    placeholder="https://partner-brand.com/promo"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    {t(UI_TEXT.adminPanel.adsManager.imageUrlLabel, lang)}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={60000}
                      value={draft.imageUrl}
                      onChange={(e) => setDraft((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://... or upload image"
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => void handleUploadBanner(e)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t(UI_TEXT.adminPanel.adsManager.uploadBannerBtn, lang)}</span>
                    </button>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-zinc-800">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-[#00DC64]"
                />
                <span>{t(UI_TEXT.adminPanel.adsManager.activeLabel, lang)}</span>
              </label>

              {/* Live Storefront Preview */}
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    {t(UI_TEXT.adminPanel.adsManager.livePreviewLabel, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewModalCampaign(previewCampaign)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100 whitespace-nowrap"
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    <span>{t(UI_TEXT.adminPanel.adsManager.previewModalBtn, lang)}</span>
                  </button>
                </div>
                <SponsorAdBanner campaign={previewCampaign} lang={lang} previewMode />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditorOpen(false);
                    setFormError(null);
                  }}
                  className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {t(UI_TEXT.adminPanel.adsManager.cancelEditBtn, lang)}
                </button>
                <button
                  type="submit"
                  disabled={syncingCloud}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] disabled:opacity-50 whitespace-nowrap"
                >
                  {isVerifiedAdmin && <Cloud className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{t(UI_TEXT.adminPanel.adsManager.saveCampaignBtn, lang)}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(UI_TEXT.adminPanel.adsManager.searchPlaceholder, lang)}
            className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={placementFilter}
            onChange={(e) =>
              setPlacementFilter(e.target.value as 'all_filter' | AdPlacement)
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
          >
            <option value="all_filter">
              {t(UI_TEXT.adminPanel.adsManager.allPlacementsFilter, lang)}
            </option>
            {PLACEMENT_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {t(UI_TEXT.adminPanel.adsManager.placements[p], lang)}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'paused')}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
          >
            <option value="all">{t(UI_TEXT.adminPanel.adsManager.allStatusFilter, lang)}</option>
            <option value="active">{t(UI_TEXT.adminPanel.adsManager.statusActive, lang)}</option>
            <option value="paused">{t(UI_TEXT.adminPanel.adsManager.statusPaused, lang)}</option>
          </select>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        {filteredCampaigns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-zinc-900">
              {t(UI_TEXT.adminPanel.adsManager.emptyTitle, lang)}
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adsManager.emptyHint, lang)}
            </p>
            {!editorOpen && adsConfig.campaigns.length < MAX_CAMPAIGNS && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458]"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t(UI_TEXT.adminPanel.adsManager.newAdBtn, lang)}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredCampaigns.map((campaign) => {
              const globalIdx = sortedCampaigns.findIndex((c) => c.id === campaign.id);
              const isScheduledFuture = Boolean(campaign.startDate && campaign.startDate > todayStr);
              const isEnded = Boolean(campaign.endDate && campaign.endDate < todayStr);
              const byDate = adMetricsByDate[campaign.id] ?? {};
              let dailyImpressions = 0;
              let dailyClicks = 0;
              for (const stat of Object.values(byDate)) {
                dailyImpressions += Math.max(0, stat.impressions ?? 0);
                dailyClicks += Math.max(0, stat.clicks ?? 0);
              }
              const clicks = Math.max(dailyClicks, adClickCounts[campaign.id] ?? 0);
              const ctr =
                dailyImpressions > 0
                  ? ((clicks / dailyImpressions) * 100).toFixed(2)
                  : '0.00';
              const headline =
                (lang === 'kh' ? campaign.titleKh : campaign.titleEn) ||
                campaign.titleEn ||
                campaign.titleKh;
              const confirmingDelete = confirmDeleteId === campaign.id;

              return (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900">
                      {campaign.imageUrl ? (
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.sponsorName}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black text-[#00DC64]">
                          {campaign.sponsorName.slice(0, 3).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-extrabold text-zinc-950">{campaign.sponsorName}</span>
                        <span aria-hidden="true" className="text-zinc-300">·</span>
                        <span
                          className={`font-semibold ${
                            !campaign.isActive
                              ? 'text-zinc-500'
                              : isEnded
                                ? 'text-rose-600'
                                : isScheduledFuture
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                          }`}
                        >
                          {!campaign.isActive
                            ? t(UI_TEXT.adminPanel.adsManager.statusPaused, lang)
                            : isEnded
                              ? t(UI_TEXT.adminPanel.adsManager.statusExpired, lang)
                              : isScheduledFuture
                                ? t(UI_TEXT.adminPanel.adsManager.statusScheduled, lang)
                                : t(UI_TEXT.adminPanel.adsManager.statusActive, lang)}
                        </span>
                        <span aria-hidden="true" className="text-zinc-300">·</span>
                        <span className="text-[11px] font-medium text-zinc-500">
                          {t(UI_TEXT.adminPanel.adsManager.placements[campaign.placement], lang)}
                        </span>
                        <span aria-hidden="true" className="text-zinc-300">·</span>
                        <span className="text-[11px] font-medium text-zinc-500">
                          {t(
                            UI_TEXT.adminPanel.adsManager.styles[campaign.adStyle ?? 'card'].title,
                            lang,
                          )}
                        </span>
                      </div>

                      <div className="mt-0.5 truncate text-xs font-medium text-zinc-700">
                        {headline}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                        <a
                          href={campaign.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 truncate max-w-[240px] hover:text-zinc-700 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{campaign.targetUrl}</span>
                        </a>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num text-zinc-600">
                          {dailyImpressions.toLocaleString()}{' '}
                          {t(UI_TEXT.adminPanel.adsAnalytics.impressionsLabel, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num text-zinc-600">
                          {clicks.toLocaleString()} {t(UI_TEXT.adminPanel.adsManager.clicksLabel, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-num font-semibold text-emerald-700">
                          {t(UI_TEXT.adminPanel.adsAnalytics.ctrLabel, lang)} {ctr}%
                        </span>
                        {(campaign.startDate || campaign.endDate) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-num">
                              {campaign.startDate || '…'} → {campaign.endDate || '∞'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {confirmingDelete ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-rose-700">
                          {t(UI_TEXT.adminPanel.confirmDeleteLabel, lang)}
                        </span>
                        <button
                          type="button"
                          disabled={syncingCloud}
                          onClick={() => void handleDeleteCampaign(campaign)}
                          className="cursor-pointer rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700"
                        >
                          {t(UI_TEXT.adminPanel.confirmYes, lang)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="cursor-pointer rounded border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                        >
                          {t(UI_TEXT.adminPanel.confirmNo, lang)}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={globalIdx <= 0 || syncingCloud}
                          onClick={() => void handleMoveCampaign(campaign.id, -1)}
                          aria-label={t(UI_TEXT.adminPanel.moveUp, lang)}
                          className="cursor-pointer rounded border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          disabled={globalIdx < 0 || globalIdx >= sortedCampaigns.length - 1 || syncingCloud}
                          onClick={() => void handleMoveCampaign(campaign.id, 1)}
                          aria-label={t(UI_TEXT.adminPanel.moveDown, lang)}
                          className="cursor-pointer rounded border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          disabled={syncingCloud}
                          onClick={() => void handleToggleCampaignActive(campaign)}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap ${
                            campaign.isActive
                              ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {campaign.isActive ? (
                            <>
                              <Pause className="h-3 w-3" aria-hidden="true" />
                              <span>{t(UI_TEXT.adminPanel.adsManager.pauseBtn, lang)}</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" aria-hidden="true" />
                              <span>{t(UI_TEXT.adminPanel.adsManager.activateBtn, lang)}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewModalCampaign(campaign)}
                          title={t(UI_TEXT.adminPanel.adsManager.previewModalBtn, lang)}
                          aria-label={t(UI_TEXT.adminPanel.adsManager.previewModalBtn, lang)}
                          className="cursor-pointer rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-700 hover:bg-zinc-50"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditForm(campaign)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
                        >
                          <Pencil className="h-3 w-3" aria-hidden="true" />
                          <span>{t(UI_TEXT.adminPanel.actionEdit, lang)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(campaign.id)}
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
            })}
          </div>
        )}
      </div>

        </>
      )}

      {previewModalCampaign && (
        <SponsorModalAd
          campaign={previewModalCampaign}
          lang={lang}
          previewMode
          onDismiss={() => setPreviewModalCampaign(null)}
        />
      )}
    </div>
  );
}
