import { Download, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import {
  ActivityCategory,
  ActivityLogEntry,
  Language,
  StaffRole,
} from '../types';

interface ActivityLogProps {
  lang: Language;
  logs: ActivityLogEntry[];
  loading?: boolean;
  error?: string | null;
  onDismissError?: () => void;
}

const CATEGORY_FILTERS: Array<'all' | ActivityCategory> = [
  'all',
  'staff',
  'series',
  'episode',
  'comment',
  'ads',
  'settings',
];

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatLogTimestamp(ms: number, lang: Language): { date: string; time: string; relative: string } {
  const dt = new Date(ms);
  const date = dt.toLocaleDateString('en-CA');
  const time = dt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  let relative: string;
  if (diffSec < 60) {
    relative = t(UI_TEXT.adminPanel.activityLog.justNow, lang);
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    relative = lang === 'kh' ? `${mins} នាទីមុន` : `${mins}m ago`;
  } else if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    relative = lang === 'kh' ? `${hrs} ម៉ោងមុន` : `${hrs}h ago`;
  } else {
    const days = Math.floor(diffSec / 86400);
    relative = lang === 'kh' ? `${days} ថ្ងៃមុន` : `${days}d ago`;
  }

  return { date, time, relative };
}

function getRoleLabel(role: StaffRole, lang: Language): string {
  if (role === 'super_admin') return t(UI_TEXT.adminPanel.roleSuperAdmin, lang);
  if (role === 'admin') return t(UI_TEXT.adminPanel.roleAdmin, lang);
  return t(UI_TEXT.adminPanel.roleModerator, lang);
}

export function ActivityLog({
  lang,
  logs,
  loading = false,
  error = null,
  onDismissError,
}: ActivityLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ActivityCategory>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | StaffRole>('all');

  const summary = useMemo(() => {
    let catalogEvents = 0;
    let moderationEvents = 0;
    let teamSettingsEvents = 0;

    for (const item of logs) {
      if (item.category === 'series' || item.category === 'episode') {
        catalogEvents += 1;
      } else if (item.category === 'comment') {
        moderationEvents += 1;
      } else {
        teamSettingsEvents += 1;
      }
    }

    return {
      total: logs.length,
      catalogEvents,
      moderationEvents,
      teamSettingsEvents,
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (roleFilter !== 'all' && entry.actorRole !== roleFilter) return false;
      if (q) {
        const actionText = t(UI_TEXT.adminPanel.activityLog.actions[entry.action], lang);
        const hay = `${entry.actorName} ${entry.actorEmail} ${entry.targetLabel} ${entry.details ?? ''} ${actionText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, searchQuery, categoryFilter, roleFilter, lang]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || categoryFilter !== 'all' || roleFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setRoleFilter('all');
  };

  const handleExportCsv = () => {
    const headers = [
      'Timestamp (ISO)',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Category',
      'Action',
      'Target',
      'Details',
    ];
    const rows = filteredLogs.map((entry) => [
      new Date(entry.createdAtMs).toISOString(),
      entry.actorName,
      entry.actorEmail,
      entry.actorRole,
      entry.category,
      t(UI_TEXT.adminPanel.activityLog.actions[entry.action], 'en'),
      entry.targetLabel,
      entry.details ?? '',
    ]);
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
    anchor.download = 'webtoon-kh-activity-log.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-950">
            {t(UI_TEXT.adminPanel.tabs.activity, lang)}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.activityLog.subtitle, lang)}
          </p>
        </div>

        <button
          type="button"
          disabled={filteredLogs.length === 0}
          onClick={handleExportCsv}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t(UI_TEXT.adminPanel.exportCsvBtn, lang)}</span>
        </button>
      </div>

      {/* Compact Summary Strip */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-4">
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.activityLog.totalEventsLabel, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {summary.total}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.activityLog.catalogEventsLabel, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {summary.catalogEvents}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.activityLog.moderationEventsLabel, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {summary.moderationEvents}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">
            {t(UI_TEXT.adminPanel.activityLog.teamSettingsEventsLabel, lang)}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
            {summary.teamSettingsEvents}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(UI_TEXT.adminPanel.activityLog.searchPlaceholder, lang)}
              className="w-full rounded-lg border border-zinc-300 py-1.5 pl-8 pr-3 text-xs text-zinc-950 focus:border-[#00DC64] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={t(UI_TEXT.adminPanel.memberRoleLabel, lang)}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | StaffRole)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 focus:border-[#00DC64] focus:outline-none"
            >
              <option value="all">{t(UI_TEXT.adminPanel.allRolesFilter, lang)}</option>
              <option value="super_admin">{t(UI_TEXT.adminPanel.roleSuperAdmin, lang)}</option>
              <option value="admin">{t(UI_TEXT.adminPanel.roleAdmin, lang)}</option>
              <option value="moderator">{t(UI_TEXT.adminPanel.roleModerator, lang)}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>{t(UI_TEXT.adminPanel.activityLog.resetFilters, lang)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Segmented Controls */}
        <div
          role="group"
          aria-label="Filter by category"
          className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1"
        >
          {CATEGORY_FILTERS.map((cat) => {
            const active = categoryFilter === cat;
            const label =
              cat === 'all'
                ? t(UI_TEXT.adminPanel.activityLog.allCategories, lang)
                : t(UI_TEXT.adminPanel.activityLog.categories[cat], lang);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
        >
          <span>{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label="Dismiss error"
              className="cursor-pointer rounded p-1 text-rose-600 hover:bg-rose-100 shrink-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Activity Feed */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        {loading && logs.length === 0 ? (
          <div className="divide-y divide-zinc-100" aria-busy="true">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-64 animate-pulse rounded bg-zinc-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-bold text-zinc-900">
              {hasActiveFilters
                ? t(UI_TEXT.adminPanel.activityLog.emptyFiltered, lang)
                : t(UI_TEXT.adminPanel.activityLog.emptyTitle, lang)}
            </p>
            {!hasActiveFilters && (
              <p className="mx-auto mt-1.5 max-w-md text-xs text-zinc-500">
                {t(UI_TEXT.adminPanel.activityLog.emptyHint, lang)}
              </p>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t(UI_TEXT.adminPanel.activityLog.resetFilters, lang)}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredLogs.map((entry) => {
              const actionTitle = t(UI_TEXT.adminPanel.activityLog.actions[entry.action], lang);
              const categoryTitle = t(
                UI_TEXT.adminPanel.activityLog.categories[entry.category],
                lang,
              );
              const roleLabel = getRoleLabel(entry.actorRole, lang);
              const ts = formatLogTimestamp(entry.createdAtMs, lang);
              const isDestructive =
                entry.action === 'staff_removed' ||
                entry.action === 'series_deleted' ||
                entry.action === 'episode_deleted' ||
                entry.action === 'comment_deleted' ||
                entry.action === 'series_hidden';

              return (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-zinc-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span
                        className={`font-bold ${
                          isDestructive ? 'text-rose-700' : 'text-zinc-950'
                        }`}
                      >
                        {actionTitle}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span className="font-semibold text-zinc-800 break-words">
                        {entry.targetLabel}
                      </span>
                      {entry.details && (
                        <>
                          <span aria-hidden="true" className="text-zinc-300">
                            ·
                          </span>
                          <span className="text-zinc-500">{entry.details}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                      <span className="font-medium text-zinc-700">{entry.actorName}</span>
                      <span>({entry.actorEmail})</span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span
                        className={
                          entry.actorRole === 'moderator'
                            ? 'font-semibold text-zinc-700'
                            : 'font-semibold text-emerald-700'
                        }
                      >
                        {roleLabel}
                      </span>
                      <span aria-hidden="true" className="text-zinc-300">
                        ·
                      </span>
                      <span>{categoryTitle}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right font-mono-num">
                    <div className="text-xs font-semibold text-zinc-700">{ts.relative}</div>
                    <div className="text-[11px] text-zinc-400">
                      {ts.date} · {ts.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
