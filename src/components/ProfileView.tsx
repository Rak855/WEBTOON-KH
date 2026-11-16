import { BookOpen, Camera, Check, Flame, LogOut, Pencil, RotateCcw, Shield, ShieldCheck, Sparkles, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { UI_TEXT, t } from '../i18n';
import { DailyActivityPoint, GenreKey, Language, StaffRole, TopGenreItem, UserProfile, WebtoonSeries } from '../types';

const GENRE_BADGE_STYLES: Record<
  Exclude<GenreKey, 'all'>,
  { container: string; rank: string; count: string }
> = {
  fantasy: {
    container: 'border-violet-200 bg-violet-50/90 text-violet-950',
    rank: 'bg-violet-600 text-white',
    count: 'text-violet-700',
  },
  romance: {
    container: 'border-rose-200 bg-rose-50/90 text-rose-950',
    rank: 'bg-rose-600 text-white',
    count: 'text-rose-700',
  },
  action: {
    container: 'border-amber-200 bg-amber-50/90 text-amber-950',
    rank: 'bg-amber-500 text-zinc-950',
    count: 'text-amber-800',
  },
  mystery: {
    container: 'border-indigo-200 bg-indigo-50/90 text-indigo-950',
    rank: 'bg-indigo-600 text-white',
    count: 'text-indigo-700',
  },
  slice_of_life: {
    container: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
    rank: 'bg-emerald-600 text-white',
    count: 'text-emerald-700',
  },
  horror: {
    container: 'border-zinc-300 bg-zinc-100 text-zinc-950',
    rank: 'bg-zinc-900 text-white',
    count: 'text-zinc-600',
  },
};

interface ProfileViewProps {
  lang: Language;
  authReady: boolean;
  userProfile: UserProfile | null;
  googlePhotoUrl: string;
  authLoading: boolean;
  authError: string | null;
  subscribedSeries: WebtoonSeries[];
  readCount: number;
  dailyReadCount: number;
  weeklyActivity: DailyActivityPoint[];
  readingStreak: number;
  topReadGenres: TopGenreItem[];
  likedCount: number;
  isAdmin?: boolean;
  staffRole?: StaffRole | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onSaveProfile: (updates: {
    displayName: string;
    photoURL: string;
    bio: string;
    preferredLang: Language;
    dailyGoal: number;
  }) => Promise<void>;
  onOpenLibrary: () => void;
  onOpenSeries: (seriesId: string) => void;
  onOpenAdmin?: () => void;
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

async function compressAvatarImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Invalid image'));
      el.src = objectUrl;
    });

    const targetSize = 160;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');

    const minDim = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sx = ((img.naturalWidth || img.width) - minDim) / 2;
    const sy = ((img.naturalHeight || img.height) - minDim) / 2;

    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

    for (const quality of [0.82, 0.68, 0.52]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= 60000) {
        return dataUrl;
      }
    }
    return canvas.toDataURL('image/jpeg', 0.4).slice(0, 65536);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ProfileView({
  lang,
  authReady,
  userProfile,
  googlePhotoUrl,
  authLoading,
  authError,
  subscribedSeries,
  readCount,
  dailyReadCount,
  weeklyActivity,
  readingStreak,
  topReadGenres,
  likedCount,
  isAdmin = false,
  staffRole = null,
  onGoogleSignIn,
  onSignOut,
  onSaveProfile,
  onOpenLibrary,
  onOpenSeries,
  onOpenAdmin,
}: ProfileViewProps) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName ?? '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL ?? '');
  const [bio, setBio] = useState(userProfile?.bio ?? '');
  const [preferredLang, setPreferredLang] = useState<Language>(
    userProfile?.preferredLang ?? lang,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [hoveredDayDate, setHoveredDayDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setPhotoURL(userProfile.photoURL);
      setBio(userProfile.bio ?? '');
      setPreferredLang(userProfile.preferredLang);
      setAvatarFailed(false);
    }
  }, [userProfile]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError(t(UI_TEXT.profile.uploadErrorInvalid, lang));
      return;
    }

    setUploadingImage(true);
    setSaveError(null);
    setSavedSuccess(false);
    try {
      const compressedDataUrl = await compressAvatarImage(file);
      setPhotoURL(compressedDataUrl);
      setAvatarFailed(false);

      const cleanName = (displayName.trim() || userProfile?.displayName || 'Reader').slice(0, 100);
      await onSaveProfile({
        displayName: cleanName,
        photoURL: compressedDataUrl,
        bio: bio.trim().slice(0, 300),
        preferredLang,
        dailyGoal: userProfile?.dailyGoal ?? 3,
      });
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSaveError(t(UI_TEXT.profile.uploadErrorInvalid, lang));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim().slice(0, 100);
    if (!cleanName) return;
    setSaving(true);
    setSavedSuccess(false);
    setSaveError(null);
    try {
      await onSaveProfile({
        displayName: cleanName,
        photoURL: photoURL.trim().slice(0, 65536),
        bio: bio.trim().slice(0, 300),
        preferredLang,
        dailyGoal: userProfile?.dailyGoal ?? 3,
      });
      setSavedSuccess(true);
      setIsEditing(false);
      window.setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      setSaveError(t(UI_TEXT.profile.saveError, lang));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setPhotoURL(userProfile.photoURL);
      setBio(userProfile.bio ?? '');
      setPreferredLang(userProfile.preferredLang);
      setAvatarFailed(false);
    }
    setSaveError(null);
    setIsEditing(false);
  };

  if (!authReady) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <div className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
      </main>
    );
  }

  if (!userProfile) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 sm:px-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-zinc-950">
            {t(UI_TEXT.profile.signInHeading, lang)}
          </h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-zinc-600">
            {t(UI_TEXT.profile.signInDesc, lang)}
          </p>

          {authError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
            >
              {authError}
            </p>
          )}

          <button
            type="button"
            disabled={authLoading}
            onClick={onGoogleSignIn}
            className="mt-6 inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-xs transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleMark />
            <span>
              {authLoading
                ? t(UI_TEXT.profile.signingIn, lang)
                : t(UI_TEXT.profile.signInGoogleBtn, lang)}
            </span>
          </button>
        </section>
      </main>
    );
  }

  const activeAvatar = photoURL.trim() || userProfile.photoURL;
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'W';

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="sr-only"
        aria-label={t(UI_TEXT.profile.uploadPhotoBtn, lang)}
      />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
          {t(UI_TEXT.profile.title, lang)}
        </h1>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950 whitespace-nowrap shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t(UI_TEXT.profile.signOutBtn, lang)}</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              {activeAvatar && !avatarFailed ? (
                <img
                  src={activeAvatar}
                  alt={userProfile.displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-16 w-16 rounded-full border border-zinc-200 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00DC64] text-lg font-extrabold text-zinc-950">
                  {initials}
                </div>
              )}

              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t(UI_TEXT.profile.uploadPhotoBtn, lang)}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-xs transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold text-zinc-950">
                {userProfile.displayName}
              </h2>
              <p className="truncate text-sm text-zinc-500">{userProfile.email}</p>
              {userProfile.bio && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-600">{userProfile.bio}</p>
              )}
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t(UI_TEXT.profile.verifiedBadge, lang)}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  aria-expanded={isEditing}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isEditing
                      ? 'border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t(UI_TEXT.profile.editProfileBtn, lang)}</span>
                </button>

                {(isAdmin || staffRole !== null) && onOpenAdmin && (
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-950 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-[#00DC64] transition-colors hover:bg-zinc-800 whitespace-nowrap"
                  >
                    <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {staffRole === 'moderator'
                        ? t(UI_TEXT.adminPanel.roleModerator, lang)
                        : t(UI_TEXT.nav.admin, lang)}
                    </span>
                  </button>
                )}

                {savedSuccess && !isEditing && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(UI_TEXT.profile.savedNotice, lang)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:justify-end shrink-0">
            <div
              role="status"
              aria-label={`${t(UI_TEXT.profile.readingStreakLabel, lang)}: ${readingStreak} ${
                readingStreak === 1
                  ? t(UI_TEXT.profile.streakDaySingular, lang)
                  : t(UI_TEXT.profile.streakDayPlural, lang)
              }`}
              className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-colors ${
                readingStreak > 0
                  ? 'border-amber-200 bg-amber-50/90 text-amber-950'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  readingStreak > 0
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-zinc-200/70 text-zinc-400'
                }`}
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-semibold opacity-80">
                  {t(UI_TEXT.profile.readingStreakLabel, lang)}
                </div>
                <div className="text-sm font-extrabold font-mono-num">
                  {readingStreak}{' '}
                  {readingStreak === 1
                    ? t(UI_TEXT.profile.streakDaySingular, lang)
                    : t(UI_TEXT.profile.streakDayPlural, lang)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenLibrary}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#00DC64] px-4 py-2.5 text-xs font-bold text-zinc-950 transition-colors hover:bg-[#00c458] whitespace-nowrap shrink-0"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              <span>{t(UI_TEXT.nav.library, lang)}</span>
            </button>
          </div>
        </div>

        {/* Unboxed Reading Summary Metrics */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-6">
          <div>
            <div className="text-xs text-zinc-500">
              {t(UI_TEXT.profile.statsSubscribed, lang)}
            </div>
            <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
              {subscribedSeries.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t(UI_TEXT.profile.statsRead, lang)}</div>
            <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
              {readCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t(UI_TEXT.profile.statsLiked, lang)}</div>
            <div className="mt-1 text-2xl font-extrabold text-zinc-950 font-mono-num">
              {likedCount}
            </div>
          </div>
        </div>
        {/* Today's Reading Goal Progress */}
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-zinc-700">
              {t(UI_TEXT.profile.dailyGoalToday, lang)}
            </span>
            <span className="font-medium text-zinc-600 font-mono-num">
              {dailyReadCount} / {userProfile.dailyGoal} {t(UI_TEXT.series.episodesUnit, lang)}
              {dailyReadCount >= userProfile.dailyGoal && (
                <>
                  <span aria-hidden="true" className="mx-1.5 text-zinc-300">·</span>
                  <span className="font-bold text-emerald-700">
                    {t(UI_TEXT.profile.dailyGoalDone, lang)}
                  </span>
                </>
              )}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t(UI_TEXT.profile.dailyGoalToday, lang)}
            aria-valuenow={Math.min(dailyReadCount, userProfile.dailyGoal)}
            aria-valuemin={0}
            aria-valuemax={userProfile.dailyGoal}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
          >
            <div
              className="h-full rounded-full bg-[#00DC64] transition-all duration-300"
              style={{
                width: `${
                  userProfile.dailyGoal > 0
                    ? Math.min(100, Math.round((dailyReadCount / userProfile.dailyGoal) * 100))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Last 7 Days Reading Activity Bar Chart */}
        {(() => {
          const total7Days = weeklyActivity.reduce((sum, day) => sum + day.count, 0);
          const maxCount = Math.max(1, ...weeklyActivity.map((day) => day.count));
          const inspectedDay = hoveredDayDate
            ? weeklyActivity.find((d) => d.date === hoveredDayDate) ?? null
            : null;

          return (
            <div className="mt-6 border-t border-zinc-100 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xs font-semibold text-zinc-700">
                  {t(UI_TEXT.profile.weeklyActivityTitle, lang)}
                </h3>
                <span className="text-xs font-medium text-zinc-600 font-mono-num">
                  {inspectedDay ? (
                    <>
                      {inspectedDay.isToday
                        ? t(UI_TEXT.profile.todayLabel, lang)
                        : t(UI_TEXT.shortWeekdays[inspectedDay.weekdayKey], lang)}{' '}
                      ({inspectedDay.shortDate}):{' '}
                      <strong className="font-bold text-zinc-950">{inspectedDay.count}</strong>{' '}
                      {t(UI_TEXT.series.episodesUnit, lang)}
                    </>
                  ) : (
                    <>
                      {t(UI_TEXT.profile.weeklyActivityTotal, lang)}:{' '}
                      <strong className="font-bold text-zinc-950">{total7Days}</strong>{' '}
                      {t(UI_TEXT.series.episodesUnit, lang)}
                    </>
                  )}
                </span>
              </div>

              <div
                role="img"
                aria-label={`${t(UI_TEXT.profile.weeklyActivityTitle, lang)}: ${total7Days} ${t(UI_TEXT.series.episodesUnit, lang)}`}
                className="mt-4 grid grid-cols-7 items-end gap-2 sm:gap-3"
                onMouseLeave={() => setHoveredDayDate(null)}
              >
                {weeklyActivity.map((day) => {
                  const heightPercent =
                    day.count > 0 ? Math.max(14, Math.round((day.count / maxCount) * 100)) : 0;
                  const weekdayLabel = day.isToday
                    ? t(UI_TEXT.profile.todayLabel, lang)
                    : t(UI_TEXT.shortWeekdays[day.weekdayKey], lang);
                  const isHovered = hoveredDayDate === day.date;

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onMouseEnter={() => setHoveredDayDate(day.date)}
                      onFocus={() => setHoveredDayDate(day.date)}
                      onBlur={() => setHoveredDayDate(null)}
                      onClick={() =>
                        setHoveredDayDate((prev) => (prev === day.date ? null : day.date))
                      }
                      aria-label={`${weekdayLabel} ${day.shortDate}: ${day.count} ${t(UI_TEXT.series.episodesUnit, lang)}`}
                      className="group flex min-w-0 cursor-pointer flex-col items-center focus:outline-none"
                    >
                      <span
                        className={`mb-1 text-[11px] font-mono-num transition-colors ${
                          day.count > 0
                            ? 'font-bold text-zinc-900'
                            : 'font-medium text-zinc-400'
                        }`}
                      >
                        {day.count}
                      </span>

                      <div
                        className={`flex h-20 w-full max-w-[38px] items-end justify-center rounded-md px-1.5 pt-1.5 transition-colors ${
                          isHovered ? 'bg-zinc-100' : 'bg-zinc-50'
                        }`}
                      >
                        {day.count > 0 ? (
                          <div
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              day.isToday
                                ? 'bg-[#00DC64]'
                                : isHovered
                                  ? 'bg-[#00DC64]'
                                  : 'bg-emerald-400'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        ) : (
                          <div className="h-[3px] w-full rounded-full bg-zinc-200" />
                        )}
                      </div>

                      <span
                        className={`mt-1.5 max-w-full truncate text-[11px] ${
                          day.isToday
                            ? 'font-bold text-zinc-950'
                            : 'font-medium text-zinc-500 group-hover:text-zinc-900'
                        }`}
                      >
                        {weekdayLabel}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono-num">
                        {day.shortDate}
                      </span>
                    </button>
                  );
                })}
              </div>

              {total7Days === 0 && (
                <p className="mt-2.5 text-center text-xs text-zinc-400">
                  {t(UI_TEXT.profile.weeklyActivityEmpty, lang)}
                </p>
              )}
            </div>
          );
        })()}
      </section>

      {/* Edit Profile Form (shown when Edit Profile is clicked) */}
      {isEditing && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-display-name"
                className="mb-1.5 block text-xs font-semibold text-zinc-700"
              >
                {t(UI_TEXT.profile.displayNameLabel, lang)}
              </label>
              <input
                id="profile-display-name"
                type="text"
                required
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="profile-preferred-lang"
                className="mb-1.5 block text-xs font-semibold text-zinc-700"
              >
                {t(UI_TEXT.profile.preferredLangLabel, lang)}
              </label>
              <select
                id="profile-preferred-lang"
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as Language)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-950 focus:border-[#00DC64] focus:outline-none"
              >
                <option value="kh">ភាសាខ្មែរ (KH)</option>
                <option value="en">English (ENG)</option>
              </select>
            </div>
          </div>

          {/* Avatar Upload & Custom URL */}
          <div>
            <label
              htmlFor="profile-avatar-url"
              className="mb-1.5 block text-xs font-semibold text-zinc-700"
            >
              {t(UI_TEXT.profile.avatarLabel, lang)}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3.5 py-2 text-xs font-bold text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {uploadingImage
                    ? t(UI_TEXT.profile.uploadingPhoto, lang)
                    : t(UI_TEXT.profile.uploadPhotoBtn, lang)}
                </span>
              </button>

              <input
                id="profile-avatar-url"
                type="url"
                maxLength={500}
                value={photoURL.startsWith('data:') ? '' : photoURL}
                onChange={(e) => {
                  setPhotoURL(e.target.value);
                  setAvatarFailed(false);
                }}
                placeholder={t(UI_TEXT.profile.avatarUrlPlaceholder, lang)}
                className="flex-1 rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-[#00DC64] focus:outline-none"
              />

              {googlePhotoUrl && photoURL !== googlePhotoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoURL(googlePhotoUrl);
                    setAvatarFailed(false);
                  }}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t(UI_TEXT.profile.useGooglePhoto, lang)}</span>
                </button>
              )}
            </div>

          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <label htmlFor="profile-bio" className="font-semibold text-zinc-700">
                {t(UI_TEXT.profile.bioLabel, lang)}
              </label>
              <span className="text-zinc-400 font-mono-num">{bio.length} / 300</span>
            </div>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t(UI_TEXT.profile.bioPlaceholder, lang)}
              className="w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-[#00DC64] focus:outline-none"
            />
          </div>

          {saveError && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700"
            >
              {saveError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="cursor-pointer rounded-lg bg-[#00DC64] px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#00c458] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? t(UI_TEXT.profile.savingProfile, lang)
                : t(UI_TEXT.profile.saveProfileBtn, lang)}
            </button>

            <button
              type="button"
              disabled={saving || uploadingImage}
              onClick={handleCancelEdit}
              className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t(UI_TEXT.canvasModal.cancel, lang)}
            </button>

            {savedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t(UI_TEXT.profile.savedNotice, lang)}
              </span>
            )}
          </div>
        </form>
        </section>
      )}

      {/* Top 3 Most-Frequently Read Genres */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-950">
              <Sparkles className="h-4 w-4 text-[#00A84C]" aria-hidden="true" />
              <span>{t(UI_TEXT.profile.topGenresTitle, lang)}</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {t(UI_TEXT.profile.topGenresSubtitle, lang)}
            </p>
          </div>
        </div>

        {topReadGenres.length === 0 ? (
          <p className="mt-4 text-xs text-zinc-500">
            {t(UI_TEXT.profile.topGenresEmpty, lang)}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {topReadGenres.map((item, idx) => {
              const palette = GENRE_BADGE_STYLES[item.genre];
              return (
                <div
                  key={item.genre}
                  className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${palette.container}`}
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-extrabold font-mono-num ${palette.rank}`}
                  >
                    #{idx + 1}
                  </span>
                  <div className="leading-tight">
                    <div className="text-sm font-bold">
                      {t(UI_TEXT.genres[item.genre], lang)}
                    </div>
                    <div className={`text-[11px] font-medium font-mono-num ${palette.count}`}>
                      {item.count} {t(UI_TEXT.series.episodesUnit, lang)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Following Series Quick Access */}
      {subscribedSeries.length > 0 && (
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
          <h2 className="text-base font-bold text-zinc-950">
            {t(UI_TEXT.profile.mySeriesHeading, lang)}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {subscribedSeries.map((series) => (
              <button
                key={series.id}
                type="button"
                onClick={() => onOpenSeries(series.id)}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-2.5 text-left transition-colors hover:bg-zinc-50"
              >
                <img
                  src={series.coverUrl}
                  alt={t(series.title, lang)}
                  referrerPolicy="no-referrer"
                  className="h-14 w-11 shrink-0 rounded-md object-cover border border-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-zinc-950">
                    {t(series.title, lang)}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {t(UI_TEXT.genres[series.genre], lang)} · {t(series.author, lang)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
