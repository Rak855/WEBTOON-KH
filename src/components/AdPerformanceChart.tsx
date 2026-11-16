import { Megaphone, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UI_TEXT, formatCompactNumber, t } from '../i18n';
import { AdDailyMetricsMap, Language, SponsorAdCampaign } from '../types';

interface AdPerformanceChartProps {
  lang: Language;
  adsEnabled: boolean;
  campaigns: SponsorAdCampaign[];
  adClickCounts: Record<string, number>;
  adMetricsByDate: AdDailyMetricsMap;
  onNavigateToAds?: () => void;
}

type TrendMetricMode = 'impressions' | 'ctr' | 'clicks';
type TrendRangeDays = 7 | 14 | 30;

const SERIES_PALETTE = [
  '#00A84C', // WEBTOON Emerald
  '#0F172A', // Slate 900
  '#D97706', // Amber 600
  '#2563EB', // Cobalt 600
  '#DC2626', // Crimson 600
  '#7C3AED', // Violet 600
];

function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDateWindow(days: TrendRangeDays): Array<{ key: string; shortLabel: string }> {
  const result: Array<{ key: string; shortLabel: string }> = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - offset);
    result.push({
      key: getLocalDateKey(dt),
      shortLabel: `${dt.getMonth() + 1}/${dt.getDate()}`,
    });
  }
  return result;
}

function formatTickValue(val: number, mode: TrendMetricMode): string {
  if (mode === 'ctr') {
    return `${val >= 10 ? val.toFixed(0) : val.toFixed(1)}%`;
  }
  if (val >= 1000) {
    return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return String(Math.round(val));
}

export function AdPerformanceChart({
  lang,
  adsEnabled,
  campaigns,
  adClickCounts,
  adMetricsByDate,
  onNavigateToAds,
}: AdPerformanceChartProps) {
  const [metricMode, setMetricMode] = useState<TrendMetricMode>('impressions');
  const [rangeDays, setRangeDays] = useState<TrendRangeDays>(14);
  const [focusedCampaignId, setFocusedCampaignId] = useState<string | null>(null);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const todayKey = getLocalDateKey();

  const activeCampaigns = useMemo(() => {
    return [...campaigns]
      .filter((c) => {
        if (!c.isActive) return false;
        if (c.startDate && c.startDate > todayKey) return false;
        if (c.endDate && c.endDate < todayKey) return false;
        return true;
      })
      .sort((a, b) => a.priority - b.priority);
  }, [campaigns, todayKey]);

  const dateWindow = useMemo(() => buildDateWindow(rangeDays), [rangeDays]);

  const effectiveFocusId =
    focusedCampaignId && activeCampaigns.some((c) => c.id === focusedCampaignId)
      ? focusedCampaignId
      : null;

  const visibleCampaigns = useMemo(() => {
    if (effectiveFocusId) {
      return activeCampaigns.filter((c) => c.id === effectiveFocusId);
    }
    return activeCampaigns;
  }, [activeCampaigns, effectiveFocusId]);

  const campaignSummaries = useMemo(() => {
    return activeCampaigns.map((campaign, idx) => {
      const byDate = adMetricsByDate[campaign.id] ?? {};
      let windowImpressions = 0;
      let windowClicks = 0;

      const dailyPoints = dateWindow.map((day) => {
        const entry = byDate[day.key];
        const impressions = Math.max(0, entry?.impressions ?? 0);
        const clicks = Math.max(0, entry?.clicks ?? 0);
        windowImpressions += impressions;
        windowClicks += clicks;
        const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
        return {
          dateKey: day.key,
          shortLabel: day.shortLabel,
          impressions,
          clicks,
          ctr,
        };
      });

      // Reconcile all-time clicks from adClickCounts if historical daily buckets weren't populated
      let allRecordedImpressions = 0;
      let allRecordedClicks = 0;
      for (const stat of Object.values(byDate)) {
        allRecordedImpressions += Math.max(0, stat.impressions ?? 0);
        allRecordedClicks += Math.max(0, stat.clicks ?? 0);
      }

      const totalClicks = Math.max(allRecordedClicks, adClickCounts[campaign.id] ?? 0);
      const totalImpressions = Math.max(allRecordedImpressions, windowImpressions);
      const ctr =
        totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

      return {
        campaign,
        color: SERIES_PALETTE[idx % SERIES_PALETTE.length],
        dailyPoints,
        windowImpressions,
        windowClicks,
        totalImpressions,
        totalClicks,
        ctr,
      };
    });
  }, [activeCampaigns, adMetricsByDate, adClickCounts, dateWindow]);

  const summaryById = useMemo(
    () => new Map(campaignSummaries.map((item) => [item.campaign.id, item])),
    [campaignSummaries],
  );

  const aggregateStats = useMemo(() => {
    const totalImpressions = campaignSummaries.reduce((acc, s) => acc + s.totalImpressions, 0);
    const totalClicks = campaignSummaries.reduce((acc, s) => acc + s.totalClicks, 0);
    const avgCtr =
      totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    return {
      activeCount: activeCampaigns.length,
      totalImpressions,
      totalClicks,
      avgCtr,
    };
  }, [campaignSummaries, activeCampaigns.length]);

  const visibleSeries = useMemo(() => {
    return visibleCampaigns
      .map((c) => summaryById.get(c.id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
  }, [visibleCampaigns, summaryById]);

  const chartGeometry = useMemo(() => {
    const width = 760;
    const height = 250;
    const padLeft = 48;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 32;
    const innerWidth = width - padLeft - padRight;
    const innerHeight = height - padTop - padBottom;

    let rawMax = 0;
    for (const series of visibleSeries) {
      for (const pt of series.dailyPoints) {
        const val = pt[metricMode];
        if (val > rawMax) rawMax = val;
      }
    }

    let yMax: number;
    if (metricMode === 'ctr') {
      if (rawMax <= 0) yMax = 10;
      else if (rawMax <= 5) yMax = 5;
      else if (rawMax <= 10) yMax = 10;
      else if (rawMax <= 25) yMax = 25;
      else if (rawMax <= 50) yMax = 50;
      else yMax = 100;
    } else {
      if (rawMax <= 0) yMax = 10;
      else if (rawMax <= 5) yMax = 5;
      else if (rawMax <= 10) yMax = 10;
      else {
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
        const step = magnitude / 2;
        yMax = Math.ceil((rawMax * 1.15) / step) * step;
      }
    }

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, idx) => {
      const value = (yMax / tickCount) * idx;
      const y = padTop + innerHeight - (value / yMax) * innerHeight;
      return { value, y };
    });

    const n = dateWindow.length;
    const getX = (idx: number) =>
      n <= 1 ? padLeft + innerWidth / 2 : padLeft + (idx / (n - 1)) * innerWidth;
    const getY = (value: number) =>
      padTop + innerHeight - Math.min(1, Math.max(0, value / yMax)) * innerHeight;

    const paths = visibleSeries.map((series) => {
      const coords = series.dailyPoints.map((pt, idx) => ({
        x: getX(idx),
        y: getY(pt[metricMode]),
        pt,
      }));
      const linePath = coords
        .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
        .join(' ');
      const areaPath =
        coords.length > 0
          ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} Z`
          : '';
      return {
        ...series,
        coords,
        linePath,
        areaPath,
      };
    });

    const labelStep = rangeDays === 7 ? 1 : rangeDays === 14 ? 2 : 5;
    const xLabels = dateWindow.map((d, idx) => ({
      ...d,
      idx,
      x: getX(idx),
      show: idx === 0 || idx === n - 1 || idx % labelStep === 0,
    }));

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerWidth,
      innerHeight,
      yMax,
      yTicks,
      xLabels,
      paths,
      getX,
    };
  }, [visibleSeries, metricMode, dateWindow, rangeDays]);

  const hoveredDay = hoveredDayIdx !== null ? dateWindow[hoveredDayIdx] : null;
  const hasAnyTraffic = aggregateStats.totalImpressions > 0 || aggregateStats.totalClicks > 0;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-zinc-950">
            {t(UI_TEXT.adminPanel.adsAnalytics.sectionTitle, lang)}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.sectionSub, lang)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!adsEnabled && (
            <span className="text-xs font-semibold text-amber-700">
              {t(UI_TEXT.adminPanel.adsAnalytics.adsDisabledNotice, lang)}
            </span>
          )}
          {onNavigateToAds && (
            <button
              type="button"
              onClick={onNavigateToAds}
              className="cursor-pointer text-xs font-semibold text-[#00A84C] hover:underline whitespace-nowrap shrink-0"
            >
              {t(UI_TEXT.adminPanel.adsAnalytics.manageAdsLink, lang)} →
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-2 gap-4 border-y border-zinc-100 py-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.kpiActiveCampaigns, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {aggregateStats.activeCount}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.kpiImpressions, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {formatCompactNumber(aggregateStats.totalImpressions, lang)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.kpiClicks, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {formatCompactNumber(aggregateStats.totalClicks, lang)}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.kpiCtr, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-[#00A84C] font-mono-num">
            {aggregateStats.avgCtr.toFixed(2)}%
          </div>
        </div>
      </div>

      {activeCampaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70 px-6 py-10 text-center">
          <Megaphone className="mx-auto h-6 w-6 text-zinc-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-zinc-900">
            {t(UI_TEXT.adminPanel.adsAnalytics.emptyTitle, lang)}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.adsAnalytics.emptyHint, lang)}
          </p>
          {onNavigateToAds && (
            <button
              type="button"
              onClick={onNavigateToAds}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00DC64] px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-[#00c458] whitespace-nowrap"
            >
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(UI_TEXT.adminPanel.adsAnalytics.createAdCta, lang)}</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Controls Toolbar: Metric Switcher + Timeframe Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Chart metric"
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1"
            >
              {(
                [
                  { id: 'impressions', label: UI_TEXT.adminPanel.adsAnalytics.metricImpressions },
                  { id: 'ctr', label: UI_TEXT.adminPanel.adsAnalytics.metricCtr },
                  { id: 'clicks', label: UI_TEXT.adminPanel.adsAnalytics.metricClicks },
                ] as const
              ).map((item) => {
                const active = metricMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMetricMode(item.id)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {t(item.label, lang)}
                  </button>
                );
              })}
            </div>

            <div
              role="group"
              aria-label="Date range"
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1"
            >
              {(
                [
                  { days: 7, label: UI_TEXT.adminPanel.adsAnalytics.range7d },
                  { days: 14, label: UI_TEXT.adminPanel.adsAnalytics.range14d },
                  { days: 30, label: UI_TEXT.adminPanel.adsAnalytics.range30d },
                ] as const
              ).map((item) => {
                const active = rangeDays === item.days;
                return (
                  <button
                    key={item.days}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRangeDays(item.days)}
                    className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold font-mono-num transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {t(item.label, lang)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Campaign Series Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={effectiveFocusId === null}
              onClick={() => setFocusedCampaignId(null)}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                effectiveFocusId === null
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span>{t(UI_TEXT.adminPanel.adsAnalytics.allActiveLabel, lang)}</span>
            </button>

            {campaignSummaries.map(({ campaign, color, ctr }) => {
              const isFocused = effectiveFocusId === campaign.id;
              const isMuted = effectiveFocusId !== null && !isFocused;
              return (
                <button
                  key={campaign.id}
                  type="button"
                  aria-pressed={isFocused}
                  onClick={() =>
                    setFocusedCampaignId((prev) => (prev === campaign.id ? null : campaign.id))
                  }
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isFocused
                      ? 'border-zinc-900 bg-zinc-50 text-zinc-950'
                      : isMuted
                        ? 'border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <span
                    className="h-0.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="max-w-[140px] truncate">{campaign.sponsorName}</span>
                  <span className="font-mono-num text-[11px] text-zinc-400">
                    {ctr.toFixed(1)}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Multi-Line SVG Trend Chart */}
          <div className="relative" onMouseLeave={() => setHoveredDayIdx(null)}>
            <svg
              viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
              role="img"
              aria-label={t(UI_TEXT.adminPanel.adsAnalytics.sectionTitle, lang)}
              className="h-60 w-full overflow-visible select-none"
            >
              <title>{t(UI_TEXT.adminPanel.adsAnalytics.sectionTitle, lang)}</title>
              <desc>{t(UI_TEXT.adminPanel.adsAnalytics.sectionSub, lang)}</desc>

              {/* Horizontal Gridlines & Y-Axis Ticks */}
              {chartGeometry.yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={chartGeometry.padLeft}
                    y1={tick.y}
                    x2={chartGeometry.width - chartGeometry.padRight}
                    y2={tick.y}
                    stroke={idx === 0 ? '#d4d4d8' : '#e4e4e7'}
                    strokeDasharray={idx === 0 ? undefined : '3 3'}
                    strokeWidth={1}
                  />
                  <text
                    x={chartGeometry.padLeft - 8}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize={11}
                    className="font-mono-num"
                  >
                    {formatTickValue(tick.value, metricMode)}
                  </text>
                </g>
              ))}

              {/* Hovered Day Vertical Guide */}
              {hoveredDayIdx !== null && (
                <line
                  x1={chartGeometry.getX(hoveredDayIdx)}
                  y1={chartGeometry.padTop}
                  x2={chartGeometry.getX(hoveredDayIdx)}
                  y2={chartGeometry.padTop + chartGeometry.innerHeight}
                  stroke="#a1a1aa"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}

              {/* Subtle Area Fill when a single campaign is focused */}
              {visibleSeries.length === 1 && chartGeometry.paths[0]?.areaPath && (
                <path
                  d={chartGeometry.paths[0].areaPath}
                  fill={chartGeometry.paths[0].color}
                  opacity={0.08}
                />
              )}

              {/* Campaign Trend Lines & Data Points */}
              {chartGeometry.paths.map((series) => (
                <g key={series.campaign.id}>
                  <path
                    d={series.linePath}
                    fill="none"
                    stroke={series.color}
                    strokeWidth={2.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {series.coords.map((coord, dayIdx) => {
                    const isHovered = hoveredDayIdx === dayIdx;
                    return (
                      <circle
                        key={coord.pt.dateKey}
                        cx={coord.x}
                        cy={coord.y}
                        r={isHovered ? 4.5 : rangeDays <= 14 ? 3 : 2.25}
                        fill={isHovered ? series.color : '#ffffff'}
                        stroke={series.color}
                        strokeWidth={2}
                      />
                    );
                  })}
                </g>
              ))}

              {/* X-Axis Date Labels */}
              {chartGeometry.xLabels.map((lbl) => (
                <text
                  key={lbl.key}
                  x={lbl.x}
                  y={chartGeometry.height - 8}
                  textAnchor="middle"
                  fill={hoveredDayIdx === lbl.idx ? '#09090b' : '#71717a'}
                  fontWeight={hoveredDayIdx === lbl.idx ? 700 : 500}
                  fontSize={11}
                  className="font-mono-num"
                >
                  {lbl.show ? lbl.shortLabel : ''}
                </text>
              ))}

              {/* Interactive Hover / Focus Hit Bands */}
              {dateWindow.map((day, idx) => {
                const colWidth =
                  dateWindow.length <= 1
                    ? chartGeometry.innerWidth
                    : chartGeometry.innerWidth / Math.max(1, dateWindow.length - 1);
                const xCenter = chartGeometry.getX(idx);
                const rectX = Math.max(chartGeometry.padLeft, xCenter - colWidth / 2);
                const rectWidth = Math.min(
                  chartGeometry.width - chartGeometry.padRight - rectX,
                  idx === 0 || idx === dateWindow.length - 1 ? colWidth / 2 : colWidth,
                );
                return (
                  <rect
                    key={day.key}
                    x={rectX}
                    y={chartGeometry.padTop}
                    width={Math.max(8, rectWidth)}
                    height={chartGeometry.innerHeight + 18}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${day.key}`}
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onFocus={() => setHoveredDayIdx(idx)}
                    onBlur={() => setHoveredDayIdx(null)}
                    className="cursor-crosshair outline-none"
                  />
                );
              })}
            </svg>

            {/* Floating Interactive Tooltip */}
            {hoveredDayIdx !== null && hoveredDay && (
              <div
                style={{
                  left: `${Math.min(72, Math.max(6, (hoveredDayIdx / Math.max(1, dateWindow.length - 1)) * 100 - 10))}%`,
                }}
                className="pointer-events-none absolute top-2 z-10 min-w-[210px] rounded-lg border border-zinc-800 bg-zinc-950/95 p-3 text-xs text-white shadow-lg"
              >
                <div className="border-b border-zinc-800 pb-1.5 font-bold font-mono-num text-zinc-200">
                  {hoveredDay.key}
                </div>
                <div className="mt-2 space-y-1.5">
                  {visibleSeries.map((series) => {
                    const pt = series.dailyPoints[hoveredDayIdx];
                    if (!pt) return null;
                    return (
                      <div
                        key={series.campaign.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[115px] text-zinc-200">
                          <span
                            className="h-0.5 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: series.color }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{series.campaign.sponsorName}</span>
                        </span>
                        <span className="font-mono-num text-[11px] text-zinc-300 shrink-0">
                          {pt.impressions} {t(UI_TEXT.adminPanel.adsAnalytics.impressionsLabel, lang)}{' '}
                          · {pt.clicks} ·{' '}
                          <strong className="text-[#00DC64]">{pt.ctr.toFixed(1)}%</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {!hasAnyTraffic && (
            <p className="text-xs text-zinc-500">
              {t(UI_TEXT.adminPanel.adsAnalytics.zeroTrafficHint, lang)}
            </p>
          )}

          {/* Active Campaigns Breakdown Table */}
          <div className="overflow-x-auto border-t border-zinc-100 pt-4">
            <table className="w-full min-w-[540px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] font-semibold text-zinc-500">
                  <th className="py-2.5 pr-4">{t(UI_TEXT.adminPanel.adsAnalytics.tableCampaign, lang)}</th>
                  <th className="py-2.5 px-3">{t(UI_TEXT.adminPanel.adsAnalytics.tablePlacement, lang)}</th>
                  <th className="py-2.5 px-3 text-right">
                    {t(UI_TEXT.adminPanel.adsAnalytics.tableImpressions, lang)}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {t(UI_TEXT.adminPanel.adsAnalytics.tableClicks, lang)}
                  </th>
                  <th className="py-2.5 px-3 text-right">
                    {t(UI_TEXT.adminPanel.adsAnalytics.tableCtr, lang)}
                  </th>
                  <th className="py-2.5 pl-3 text-right">
                    {t(UI_TEXT.adminPanel.adsAnalytics.tableShare, lang)}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {campaignSummaries.map(({ campaign, color, totalImpressions, totalClicks, ctr }) => {
                  const sharePct =
                    aggregateStats.totalImpressions > 0
                      ? Math.round((totalImpressions / aggregateStats.totalImpressions) * 100)
                      : 0;
                  const headline =
                    (lang === 'kh' ? campaign.titleKh : campaign.titleEn) ||
                    campaign.titleEn ||
                    campaign.titleKh;

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() =>
                        setFocusedCampaignId((prev) => (prev === campaign.id ? null : campaign.id))
                      }
                      className={`cursor-pointer transition-colors hover:bg-zinc-50 ${
                        effectiveFocusId === campaign.id ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="h-0.5 w-4 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-bold text-zinc-950 max-w-[210px]">
                              {campaign.sponsorName}
                            </div>
                            <div className="truncate text-[11px] text-zinc-500 max-w-[210px]">
                              {headline}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap">
                        {t(UI_TEXT.adminPanel.adsManager.placements[campaign.placement], lang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 font-mono-num whitespace-nowrap">
                        {totalImpressions.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 font-mono-num whitespace-nowrap">
                        {totalClicks.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold font-mono-num whitespace-nowrap ${
                          ctr > 0 ? 'text-emerald-700' : 'text-zinc-500'
                        }`}
                      >
                        {ctr.toFixed(2)}%
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${sharePct}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                          <span className="w-8 text-right text-[11px] text-zinc-500 font-mono-num">
                            {sharePct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
