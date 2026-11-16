# 0001 Versionen des Stacks

**Stand:** 16.11.2026

- Next.js 16.4.6, React 19.3, Tailwind CSS 4.3, next-intl 4.15, Better Auth 1.7.
- **Prisma 7.10** statt 8: Version 8 ist erst als Release Candidate veröffentlicht.
- **TypeScript 6.0** statt 7: typescript-eslint unterstützt TypeScript 7 noch nicht, und ohne Lint liesse sich die 600-Zeilen-Regel nicht erzwingen.
- **ESLint 9** statt 10: eslint-plugin-jsx-a11y unterstützt ESLint 10 noch nicht.
- **Playwright 1.63** ist auf die Browser-Version der Entwicklungsumgebung festgelegt.

Geprüft gegen: die mit Next.js ausgelieferte Doku (`node_modules/next/dist/docs`, unter anderem `proxy.ts` statt `middleware.ts`, CSP mit Nonce, `next/font`) und die Railway-Doku über deren Suche (Config as Code, Monorepo). Die Doku-Seiten von Prisma, Tailwind und Better Auth waren aus der Build-Umgebung nicht erreichbar; dort gilt, was Installation, Typprüfung und Tests bestätigt haben.
