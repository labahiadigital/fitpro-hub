# FitPro Hub - Frontend Guideline Document

This document outlines the frontend architecture, design principles, and technologies used in FitPro Hub. It’s written in everyday language so anyone can understand how our frontend is set up and why.

## 1. Frontend Architecture

### 1.1 Overview
We’re building a web dashboard using React and Vite. We chose Vite for its fast startup and hot-reload times. Core libraries include:
- **React** (UI framework)
- **Vite** (build tool)
- **TanStack Query** (formerly React Query, for server-state fetching/caching)
- **Mantine** (component library and theming)
- **TanStack Table** (advanced table features)
- **React Hook Form + Zod** (forms and validation)
- **React Router** (routing)
- **Supabase-js** (auth, RLS, storage)
- **Stripe.js** (payments)
- **Brevo SDK** (email)

### 1.2 Scalability, Maintainability & Performance
- **Modular Code**: We organize features into small, focused directories (pages, components, hooks, services). As the app grows, we can add or remove modules without impacting other areas.
- **Server-State Caching**: TanStack Query minimizes network calls and keeps data fresh without manual loading flags.
- **Code Splitting & Lazy Loading**: We split routes and large components so users only download what they need.
- **Vite Optimizations**: Tree-shaking, ES module pre-bundling, and fast HMR speed up development and production builds.

## 2. Design Principles

### 2.1 Usability
- Clear labels and icons.
- Consistent layout across pages.
- Provide feedback (loaders, toasts) on actions.

### 2.2 Accessibility
- Follow WCAG guidelines (ARIA roles, keyboard navigation).
- Use semantic HTML elements.
- Ensure color contrast meets standards.

### 2.3 Responsiveness
- Mobile-first CSS grid and flexbox.
- Breakpoints for phones, tablets, and desktops.
- Collapsible sidebar on smaller screens.

### 2.4 Consistency & Clarity
- Reuse components for buttons, modals, cards.
- Maintain consistent spacing, typography, and color usage.

## 3. Styling and Theming

### 3.1 Styling Approach
We use **Mantine’s CSS-in-JS** system (powered by Emotion). This lets us define styles right alongside components, leverage JavaScript logic in styles, and switch themes at runtime.

### 3.2 Theming & Brand Customization
- A global `ThemeProvider` holds color tokens, spacing, and fonts.
- We support **per-workspace theming**: each client can upload a logo and define primary/secondary colors.
- Dark mode toggle is built in.

### 3.3 Visual Style
- **Style**: Modern flat design with material-inspired interactions.
- **Color Palette (default)**:
  - Primary: #2D6A4F (dark green)
  - Secondary: #40916C (medium green)
  - Accent: #F08A5D (warm orange)
  - Neutral Light: #F0F2F5
  - Neutral Dark: #343A40
  - Error: #D00000
  - Success: #28A745
- **Fonts**: Inter (sans-serif) for body and headings.

## 4. Component Structure

### 4.1 Organization
```
/src
  /components   # Reusable atoms, molecules
  /pages        # Route-driven page components
  /layouts      # Wrappers (sidebar + header)
  /hooks        # Custom React hooks
  /services     # API call wrappers (supabase, stripe)
  /utils        # Helpers (formatters, constants)
  /theme        # Mantine theme overrides
```

### 4.2 Atomic & Reusable
- **Atoms**: Button, Input, Card.
- **Molecules**: DatePicker+Input, FormField (label + input + error).
- **Organisms**: Calendar view, Client Table.
- Each component lives in its own folder with `.tsx`, `styles.ts`, and `test.tsx`.

## 5. State Management

### 5.1 Server State
- **TanStack Query** handles all data fetching, caching, invalidation, and background updates.

### 5.2 Client/UI State
- **React Context** for global UI flags (theme, modal open/close).
- **Local State** (`useState`) for ephemeral data inside components.

### 5.3 Forms & Validation
- **React Hook Form** for form state and performance.
- **Zod** for schema-based validation and type inference.

## 6. Routing and Navigation

### 6.1 React Router Setup
- Central `AppRoutes.tsx` defines all routes with nested layout routes:
  - `/dashboard`
  - `/clients`
  - `/calendar`
  - `/training` … etc.
- Protected routes redirect to login if not authenticated.

### 6.2 Navigation Patterns
- **Sidebar** for main sections (collapsible).
- **Top bar** for user menu, notifications, and workspace switcher.
- **Breadcrumbs** on deeper pages for context.

## 7. Performance Optimization

- **Lazy Loading**: `React.lazy` + `Suspense` for pages and large components (charts, calendar).
- **Code Splitting**: Vite auto-splits vendor code.
- **Asset Optimization**: Compress images, SVGIcons as React components.
- **Bundle Analysis**: Periodic checks with `rollup-plugin-visualizer`.
- **Memoization**: `React.memo`, `useMemo`, `useCallback` for expensive operations.

## 8. Testing and Quality Assurance

### 8.1 Unit & Integration Tests
- **Jest** + **React Testing Library** for components and hooks.
- Mock API calls with MSW (Mock Service Worker).

### 8.2 End-to-End Tests
- **Cypress** for critical user flows (login, booking, payment).

### 8.3 Linting & Formatting
- **ESLint** with React/TypeScript rules.
- **Prettier** for consistent code style.
- **Husky** + **lint-staged** to run checks before commits.

## 9. Conclusion and Summary

FitPro Hub’s frontend is built to be fast, scalable, and easy to maintain. With React, Vite, TanStack Query, and Mantine at its core, we achieve a professional and modern UI that’s also accessible and responsive. Component-based structure, robust testing, and clear design guidelines ensure every developer can pick up the codebase and deliver features confidently. The theming system allows each workspace to feel like its own brand, while performance best practices keep the user experience smooth and polished.

By following these guidelines, we keep FitPro Hub consistent, reliable, and ready to grow with our users’ needs.