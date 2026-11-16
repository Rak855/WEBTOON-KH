import { Check, Globe, Shield, Target } from 'lucide-react';
import { UI_TEXT, t } from '../i18n';
import { Language, NavSection, StaffRole, UserProfile } from '../types';

interface HeaderProps {
  lang: Language;
  onToggleLang: (next: Language) => void;
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  onGoHome: () => void;
  userProfile: UserProfile | null;
  isAdmin?: boolean;
  staffRole?: StaffRole | null;
  dailyReadCount: number;
}

const NAV_ITEMS: NavSection[] = ['originals', 'popular', 'library', 'canvas', 'profile'];

export function Header({
  lang,
  onToggleLang,
  activeNav,
  onSelectNav,
  onGoHome,
  userProfile,
  isAdmin = false,
  staffRole = null,
  dailyReadCount,
}: HeaderProps) {
  const goal = userProfile?.dailyGoal ?? 3;
  const pct = goal > 0 ? Math.min(100, Math.round((dailyReadCount / goal) * 100)) : 0;
  const goalMet = Boolean(userProfile) && dailyReadCount >= goal;

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-8 sm:px-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={onGoHome}
          className="cursor-pointer whitespace-nowrap shrink-0 text-left text-lg font-extrabold tracking-tight text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00DC64]"
        >
          <span className="text-[#00DC64]">WEBTOON</span>{' '}
          <span>{lang === 'kh' ? 'កម្ពុជា' : 'KH'}</span>
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold"
        >
          {NAV_ITEMS.map((key) => {
            const isActive = activeNav === key;
            const showAvatar = key === 'profile' && Boolean(userProfile?.photoURL);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectNav(key)}
                className={`relative inline-flex cursor-pointer items-center gap-2 py-1 whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#00DC64] ${
                  isActive
                    ? 'text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {showAvatar && userProfile && (
                  <img
                    src={userProfile.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-5 w-5 rounded-full border border-zinc-200 object-cover"
                  />
                )}
                <span>{t(UI_TEXT.nav[key], lang)}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-[#00DC64]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Authenticated Daily Goal Indicator + Language Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          {userProfile && (
            <button
              type="button"
              onClick={() => onSelectNav('profile')}
              aria-label={`${t(UI_TEXT.profile.dailyGoalShort, lang)}: ${dailyReadCount} / ${goal}`}
              className={`group flex cursor-pointer flex-col justify-center rounded-lg border px-2.5 py-1 text-left transition-colors whitespace-nowrap shrink-0 ${
                goalMet
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold leading-none">
                {goalMet ? (
                  <Check className="h-3 w-3 text-emerald-600 shrink-0" aria-hidden="true" />
                ) : (
                  <Target className="h-3 w-3 text-zinc-500 shrink-0" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {t(UI_TEXT.profile.dailyGoalShort, lang)}
                </span>
                <span className="font-bold font-mono-num">
                  {dailyReadCount}/{goal}
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-200/80"
              >
                <div
                  className="h-full rounded-full bg-[#00DC64] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          )}

          {(isAdmin || staffRole !== null) && (
            <button
              type="button"
              onClick={() => onSelectNav('admin')}
              aria-label={
                staffRole === 'moderator'
                  ? t(UI_TEXT.adminPanel.roleModerator, lang)
                  : t(UI_TEXT.nav.admin, lang)
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeNav === 'admin'
                  ? 'border-zinc-950 bg-zinc-950 text-[#00DC64]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950'
              }`}
            >
              <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {staffRole === 'moderator' ? 'Moderator' : t(UI_TEXT.nav.admin, lang)}
              </span>
            </button>
          )}

          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5"
          >
            <Globe className="ml-2 mr-1 hidden h-3.5 w-3.5 text-zinc-500 sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onToggleLang('kh')}
              className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                lang === 'kh'
                  ? 'bg-[#00DC64] text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ខ្មែរ
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                lang === 'en'
                  ? 'bg-[#00DC64] text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              ENG
            </button>
          </div>
        </div>
      </div>

      {/* Compact mobile nav row */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden items-center gap-4 overflow-x-auto border-t border-zinc-100 px-4 py-2 text-xs font-semibold no-scrollbar"
      >
        {NAV_ITEMS.map((key) => {
          const isActive = activeNav === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectNav(key)}
              className={`cursor-pointer whitespace-nowrap shrink-0 py-1 transition-colors ${
                isActive ? 'text-[#00A84C]' : 'text-zinc-600'
              }`}
            >
              {t(UI_TEXT.nav[key], lang)}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
