# Glowist — Senior Review & UX Overhaul

**Date:** 2026-06-13
**Branch:** `feat/ux-overhaul`
**App:** Glowist — skincare routine app (Expo Router + Supabase, React Native), 4-locale i18n (en/de/es/tr).

## Goal

Improve the existing app like a senior developer would: fix correctness issues,
replace placeholder/fake data with real data, polish UI/UX, and add a Progress
Dashboard. The architecture is sound; this is targeted improvement, not a rewrite.

## Principles

- **No fake data.** Show only what we can compute from real sources. If data
  isn't backed, remove the element rather than fabricate it.
- **Follow existing patterns.** Design system (`constants/Colors`, `Typography`,
  `Shadows`), `useLanguage().t()` for all strings, Reanimated for motion,
  `haptic.*` for feedback, `BottomSheet`/`AnimatedCard`/`Skeleton` components.
- **No schema changes.** Everything derivable from existing tables.
- **`npx tsc --noEmit` must be clean (0 errors) at the end.**

## Phase 1 — Foundation health

Baseline `tsc` currently reports 8 errors. Fix all.

1. **Delete `index.ts`** — leftover Expo template that does `import App from './App'`
   (no such file; app entry is `expo-router/entry` per `package.json`). Causes a
   casing-collision TS error.
2. **`context/LanguageContext.tsx:43`** — `t` param typed against a non-exported
   `translations`. Type it as `TranslationKey`.
3. **`lib/google-auth.ts`** — narrow `error: unknown` in catch blocks (3 errors)
   before reading properties.
4. **`components/AnimatedTabBar.tsx`** — hooks (`useSharedValue`,
   `useAnimatedStyle`) are called inside `.map()`. Refactor so hook count is
   fixed/stable (e.g. a fixed-size array of shared values created once, or per-tab
   child components), keeping current behavior.
5. **Missing translations** — add keys in all 4 locales: `viewDetails`
   (products grid, currently hardcoded "View Details"), `routineComplete`
   (routine progress, currently hardcoded "Complete!"), and localized month
   abbreviations for `formatMemberSince` (currently hardcoded Turkish).

**Acceptance:** `npx tsc --noEmit` → 0 errors; no hardcoded user-facing English
strings in the touched screens; tab bar behaves identically.

## Phase 2 — Real data instead of placeholders

1. **Profile streak card** — currently uses `getRoutineLogDaysCount` (total unique
   active days) but is labeled "streak". Show the **real current streak**
   (`getStreak`, consistent with the routine flame). Keep total active days as a
   secondary stat if useful.
2. **Remove fake "+2%" trend** chip. Replace with a real metric: **longest streak**.
3. **`AnimatedCounter`** — make it actually animate (it currently renders the
   static value). Implement count-up via Reanimated `useAnimatedProps` on a
   non-editable `AnimatedTextInput`.
4. **Skin profile rows** — remove the three unbacked rows (sensitivity, climate,
   allergies; all hardcoded `—`). Keep **skin type** + **concerns** (chips), which
   are real (`user_metadata.skin_type` / `skin_concerns`).

**Acceptance:** every number/label on the profile screen maps to a real source;
no `—`-only placeholder rows; counter visibly animates on mount.

## Phase 3 — UI/UX polish

1. **Branded splash/redirect screen (`app/index.tsx`)** — replace off-brand pink
   spinner (`#ec4899`) and `#f5f3ef` bg with palette colors + a subtle branded
   loading treatment (Glowist wordmark / gentle pulse). This is the first frame
   users see.
2. **Hardcoded hex → palette.** Move stray hex values (shadow colors, badge
   colors, etc.) into `Colors`/`Shadows` where they represent reusable tokens.
   (Leave intrinsically-branded SVG colors like `GoogleIcon` and the flame accent
   as-is, but centralize repeated tokens such as `#8f5c74` shadow.)
3. **Accessibility** — add `accessibilityRole`/`accessibilityLabel` to icon-only
   Pressables (bell, view-toggle, FABs, bookmark, reorder), ensure ≥44px touch
   targets, verify text contrast on colored surfaces.
4. **Consistency pass** — empty states and micro-interactions aligned across
   routine/shelf/products.

**Acceptance:** first frame on launch is on-brand; icon-only controls have a11y
labels; no obvious contrast/touch-target regressions.

## Phase 4 — Progress Dashboard (new screen)

New screen `app/progress.tsx`, reachable by making the Profile stat cards
**tappable** (tab count stays at 4; `AnimatedTabBar` untouched). Registered in
`app/_layout.tsx` Stack with a localized title.

**Data layer — `lib/progress.ts`:** one query for all of a user's `routine_logs`,
then compute (no schema change):
- `currentStreak`, `longestStreak`, `totalActiveDays`
- `byDate: Record<string, number>` — completed-step count per date (AM+PM summed)
- `thisMonthActiveDays` and days elapsed this month
- heatmap series for the last ~12 weeks

`longestStreak` and the heatmap are new derivations; reuse `getStreak`'s
day-set logic where possible (extract a shared helper rather than duplicate).

**UI (uses existing design system + `CircularProgress`):**
- **Top stat row:** current streak · longest streak · total active days.
- **Calendar heatmap:** last ~12 weeks, intensity by `byDate` count
  (0 = empty cell, higher counts = warmer palette steps). Week-of labels.
- **This-month consistency ring:** active days / days elapsed via `CircularProgress`.
- Loading via existing `Skeleton`; empty state when no logs.

**i18n:** add all new strings (`progressTitle`, `currentStreak`, `longestStreak`,
`totalDays`, `thisMonthConsistency`, heatmap legend, empty state) in 4 locales.

**Acceptance:** dashboard opens from Profile; all values match real logs; renders
correctly with 0 logs and with sparse/dense data; `tsc` clean; 4 locales present.

## Out of scope

- Camera/photo diary, smart routine suggestions, voice search (mic button stays
  visually but is out of scope; either wire a no-op-safe affordance or leave for
  later — no fake behavior).
- Onboarding expansion to collect sensitivity/climate/allergies.
- Backend/RLS/schema changes.

## Risks

- Reanimated `useAnimatedProps` text animation has platform nuances — verify on
  the target platform; fall back to a simple mount transition if flaky.
- Heatmap date math must be timezone-safe (reuse the `T12:00:00` anchoring pattern
  already used in `routine.tsx`/`getStreak`).
