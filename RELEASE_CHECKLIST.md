# Digibizz LMS Student App - Release Checklist

## 1) Branding and Assets
- [x] App name/slug/package configured for Digibizz LMS Student in `app.json`
- [x] Branded `icon.png` generated and set in `app.json`
- [x] Branded `adaptive-icon.png` generated and set in `app.json`
- [x] Branded `splash-icon.png` generated and set in `app.json`
- [x] Branded `favicon.png` generated and set in `app.json`
- [x] Kesari theme color system applied in UI

## 2) Student-Only Product Scope
- [x] Authentication flow restricted to student users
- [x] No registration/signup routes implemented (`/registration`, `/itti-registration`, `/signup` excluded)
- [x] Student-only feature navigation implemented

## 3) Mandatory Features
- [x] Dashboard
- [x] Docs
- [x] Leave
- [x] Quiz (including attempt flow)
- [x] Assignments (including submission)
- [x] Tickets (including thread + replies)
- [x] Recordings
- [x] Resources
- [x] Feedback
- [x] Announcements
- [x] Course Module
- [x] Earnings

## 4) API and Environment
- [x] API layer uses `EXPO_PUBLIC_BACKEND_URL` from `.env`
- [x] `.env` configured with production endpoint
- [x] Student endpoints mapped from legacy frontend logic into native app services

## 5) Runtime Reliability
- [x] Pull-to-refresh on key list screens
- [x] Retry-once strategy for key loaders
- [x] Offline cache fallback for dashboard/features/assignments
- [x] Last synced timestamps displayed
- [x] Offline/cached status badges displayed

## 6) Cleanup and Code Health
- [x] Old Expo starter artifacts removed (`modal`, extra tab, themed template helpers)
- [x] TypeScript checks passing (`npx tsc --noEmit`)
- [x] Lint checks passing for updated files

## 7) Android Launch Verification
- [ ] `expo start --android` successful end-to-end run

### Current blocker on this machine
- Android SDK path not resolved:
  - Expected default not found at `C:\\Users\\hp\\AppData\\Local\\Android\\Sdk`
- `adb` command not available in PATH

### Required local setup to complete Android verification
1. Install Android Studio + Android SDK.
2. Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`) to SDK directory.
3. Add platform-tools to PATH (`...\\Android\\Sdk\\platform-tools`).
4. Start an emulator (or connect USB-debug Android device).
5. Re-run: `npx expo start --android --port 8083`
