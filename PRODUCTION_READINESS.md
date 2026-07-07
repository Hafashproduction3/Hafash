# Hafash.pk Production Deployment Audit

This document outlines the requirements and verification steps for deploying Hafash to a production environment (Vercel, Firebase Hosting, etc.).

## 1. Environment Variables (Required)

Set these in your hosting provider's dashboard:

### AI & Genkit
- `GOOGLE_GENAI_API_KEY`: Your Google AI / Gemini API key.

### Firebase Admin (Server-Side)
- `FIREBASE_PROJECT_ID`: `hafash-pk`
- `FIREBASE_CLIENT_EMAIL`: Your Firebase Service Account email.
- `FIREBASE_PRIVATE_KEY`: Your Firebase Service Account private key. 
  - *Note: If pasting into Vercel, ensure it handles the `\n` characters correctly.*

## 2. Security Verification
- [x] Server-side secrets are restricted to `src/app/actions` or `src/ai`.
- [x] Client-side Firebase config in `src/firebase/config.ts` contains only public identifiers.
- [x] Password reset links are prepared for custom domain recovery.

## 3. Build Configuration
- Current `next.config.ts` ignores build errors. This allows deployment even with minor TypeScript warnings but should be monitored for critical runtime issues.

## 4. Post-Deployment Steps
1. Verify Firebase Authentication "Action URL" is updated to `https://hafash.pk/reset-password` (once domain is active).
2. Enable Firestore Security Rules for the `users` and `galleries` collections.
