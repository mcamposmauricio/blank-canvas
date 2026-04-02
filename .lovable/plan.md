

# Fix: AttendantLite redirects to /auth before auth finishes loading

## Root Cause

`AttendantLite.tsx` line 269 only checks `userDataLoading`, but ignores the initial `loading` state from `useAuth()`. The timing:

1. Component mounts: `loading = true`, `userDataLoading = false`, `user = null`
2. Guard at line 269 checks `userDataLoading` → false → skips spinner
3. Guard at line 277 checks `!user` → true → navigates to `/auth`
4. Auth finishes loading (too late — already redirected)

## Fix

**File: `src/pages/AttendantLite.tsx`**

1. Add `loading` to the destructured values from `useAuth()` (line ~42)
2. Change the loading guard (line 269) to check both: `if (userDataLoading || loading)`

Two-line change, zero risk.

