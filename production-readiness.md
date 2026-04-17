# Plan: Production Readiness and Final Polish

This plan outlines the final steps to ensure "Mi Traductor" is 100% ready for production deployment.

## Objective
1.  **Restore Missing UI:** Re-implement the Conversation Branching banner in the Topbar.
2.  **Code Cleanup:** Remove redundant function definitions and unused imports.
3.  **Security Audit:** Final check of environment variables and RLS.
4.  **Consistency:** Ensure icons and spacing match the premium "LibreChat" aesthetic across all themes.

## Key Files & Context
- `app/src/pages/ChatPage.tsx`: Main UI logic.
- `app/src/App.css`: Global styles.
- `supabase/functions/chat-stream/index.ts`: Backend reliability.

## Implementation Steps

### 1. Final Polish of ChatPage.tsx
- Restore `handleNavigateToParent` and `handleNavigateToChild`.
- Pass the `banner` prop to the `Topbar` component.
- Remove the duplicate `handleTemperatureChange` declaration.
- Verify `onSwitchSibling` uses the correct parent message ID.

### 2. CSS Consistency
- Define `composer__edit-badge` in `App.css` to fix the layout when editing messages.
- Ensure `status-dot` and `loading-tag` animations are smooth.

### 3. Backend Verification
- Ensure the deployed Edge Function has the latest fixes for `user_id` and `userMessageId` payload.

## Verification & Testing
- **New Chat Flow:** Verify no "recycle" to Welcome screen happens after first send.
- **Branching:** Test both *Message Branching* (version switcher) and *Conversation Branching* (banner links).
- **Themes:** Cycle through all themes to check text contrast in user bubbles.
- **Mobile:** Check sidebar behavior on small screens.

## Production Checklist
- [ ] VITE_SUPABASE_URL and KEY are correctly set in `.env`.
- [ ] No hardcoded orange colors remain.
- [ ] Google OAuth is configured for the production domain.
- [ ] Edge Functions are deployed with `--no-verify-jwt` (if using custom auth headers).
