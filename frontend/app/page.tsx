'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchCurrentUser, initializeAuth } from '@/lib/features/auth/authSlice';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  Search,
  User,
} from 'lucide-react';

/* ── Local building blocks ──
   These deliberately mirror the real app's surfaces rather than inventing a
   separate marketing style: the icon set is the one Dirtree uses, and TagPill
   reproduces <Badge variant="secondary"> so the mockups read as the product
   instead of as wireframes of something else. */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <span className="h-px w-6 bg-primary/60" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {children}
      </span>
    </div>
  );
}

/** Matches <Badge variant="secondary"> in the dark theme, which is what the
    resource table actually renders for tags. */
function TagPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-[oklch(0.68_0.14_75/25%)] bg-[oklch(0.68_0.14_75/18%)] px-2 py-0.5 text-xs font-medium text-[oklch(0.82_0.13_75)]">
      {children}
    </span>
  );
}

/** The 40px muted tile the resource table puts at the head of every row. */
function IconTile({ children, thumb }: { children?: ReactNode; thumb?: boolean }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/50 bg-muted/50">
      {thumb ? (
        <div className="h-full w-full bg-[oklch(0.93_0.01_90)] p-1">
          <div className="space-y-[3px] pt-1">
            <div className="h-[2px] w-3/4 rounded-full bg-black/25" />
            <div className="h-[1px] w-full rounded-full bg-black/15" />
            <div className="h-[1px] w-full rounded-full bg-black/15" />
            <div className="h-[1px] w-2/3 rounded-full bg-black/15" />
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function UploaderChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[oklch(0.68_0.14_75/25%)] bg-[oklch(0.68_0.14_75/18%)] px-2 py-0.5 text-xs font-medium text-[oklch(0.82_0.13_75)]">
      <User className="h-3 w-3" />
      {name}
    </span>
  );
}

/**
 * The signed-out bar. `actions="hidden"` keeps the buttons in the layout but
 * invisible, which is what renders before auth is known: the server has no
 * access to localStorage, so anything auth-dependent in the first paint would
 * be a hydration mismatch. Reserving the space avoids a jump when it resolves.
 */
function LandingNav({ actions }: { actions: 'auth' | 'hidden' }) {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="brand-logo text-lg font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          UniShelf
        </Link>
        <div className={cn('flex items-center gap-1.5', actions === 'hidden' && 'invisible')}>
          <Link href="/login">
            <button className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Log in
            </button>
          </Link>
          <Link href="/signup">
            <button className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Sign up
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ── Hero: the directory tree ── */

const TREE: {
  depth: number;
  name: string;
  kind: 'open' | 'closed' | 'file';
  badge?: string;
  active?: boolean;
}[] = [
  { depth: 0, name: 'engineering', kind: 'open' },
  { depth: 1, name: 'onboarding', kind: 'open', active: true },
  { depth: 2, name: 'Setup Guide.pdf', kind: 'file' },
  { depth: 2, name: 'access-checklist.md', kind: 'file' },
  { depth: 1, name: 'architecture', kind: 'closed', badge: 'private' },
  { depth: 1, name: 'runbooks', kind: 'closed' },
];

function TreeRow({ depth, name, kind, badge, active }: (typeof TREE)[number]) {
  const isFile = kind === 'file';
  return (
    <div className="flex items-stretch">
      {Array.from({ length: depth }).map((_, i) => (
        // border-border is 14% alpha in this theme and disappears on the card
        <span key={i} className="ml-[13px] w-[13px] shrink-0 border-l border-muted-foreground/25" />
      ))}
      <div
        className={`flex flex-1 items-center gap-1.5 rounded-md px-2 py-[7px] transition-colors ${
          active ? 'bg-primary/12' : 'hover:bg-accent/50'
        }`}
      >
        {isFile ? (
          <span className="w-3.5 shrink-0" />
        ) : kind === 'open' ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        {isFile ? (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : kind === 'open' ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span
          className={`truncate text-[13px] ${
            isFile ? 'text-muted-foreground' : 'font-medium text-foreground'
          }`}
        >
          {name}
        </span>
        {badge && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-muted/70 px-2 py-px text-[10px] font-medium text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── The product surface: the resource table ── */

const ROWS = [
  {
    title: 'Production Deploy Runbook',
    file: 'engineering-runbooks-deploy.md',
    tags: ['engineering', 'runbook'],
    visibility: 'Public',
    uploader: 'Tomas',
    icon: <FileText className="h-4 w-4 text-muted-foreground/60" />,
  },
  {
    title: 'Brand Guidelines',
    file: 'design-brand_guidelines.pdf',
    tags: ['design', 'approved'],
    visibility: 'Public',
    uploader: 'Aisha',
    thumb: true,
  },
  {
    title: 'Architecture',
    file: 'no file',
    tags: ['spec', 'confidential'],
    visibility: 'Private',
    uploader: 'Daniel',
    icon: <Folder className="h-4 w-4 text-muted-foreground/60" />,
  },
];

const STEPS = [
  {
    n: '01',
    label: 'Store',
    body: 'Drop a file into a folder, or paste a link. Build the directory structure your team already thinks in: departments, projects, whatever fits.',
  },
  {
    n: '02',
    label: 'Browse or search',
    body: 'Walk the tree when you know where it lives. Search by keyword, tag, or file type when you don’t. Preview PDFs, images, code and video in the browser.',
  },
  {
    n: '03',
    label: 'Control',
    body: 'Public to the organization, private to you, or shared with named people. Set it on a folder and everything inside follows, with no re-checking file by file.',
  },
];

const CAPABILITIES = [
  {
    title: 'A real filesystem, not a tag soup',
    desc: 'Create directories, nest them, move things between them, and navigate with breadcrumbs. Every folder is addressable by its full path, so the structure you build is the structure that persists. It is not a view you rebuild each time.',
  },
  {
    title: 'Privacy is inherited, not repeated',
    desc: 'Lock a folder and everything beneath it goes with it, however each file is set. Each one keeps its own setting, so reopening the folder restores exactly what was there. Set it once, at the level you actually think about.',
  },
  {
    title: 'Upload anonymously, stay accountable',
    desc: 'Post a document without your name on it. Useful for feedback, incident notes, or anything that should be judged on content. Moderators can still see who uploaded what, so anonymity never means unaccountable.',
  },
  {
    title: 'Your domain is the door',
    desc: 'Each deployment is bound to your organization’s email domain. If the address isn’t on it, the account is never created. No invite sprawl, no stray outside accounts.',
  },
  {
    title: 'Per-person access lists',
    desc: 'Beyond public and private, whitelist or blacklist individual people on any file or folder. Fine-grained where you need it, ignorable where you don’t.',
  },
];

export default function HomePage() {
  const dispatch = useAppDispatch();
  const authChecked = useAppSelector((state) => state.auth.authChecked);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  // Unlike (app)/layout.tsx this must not redirect: the landing page is public,
  // so a missing or stale token just means "show the signed-out bar".
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Confirms the stored token is still valid. No catch needed: the slice's
    // fetchCurrentUser.rejected case clears the token and flips
    // isAuthenticated, which swaps the bar back on its own.
    dispatch(fetchCurrentUser());
  }, [dispatch, isAuthenticated]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      {!authChecked ? (
        <LandingNav actions="hidden" />
      ) : isAuthenticated ? (
        <Navbar containerClassName="max-w-6xl" />
      ) : (
        <LandingNav actions="auth" />
      )}

      {/* ── Hero ── */}
      <section className="px-6 pt-16 pb-20 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              One deployment, one organization
            </div>

            <h1 className="text-[2.25rem] font-extrabold leading-[1.06] tracking-[-0.02em] sm:text-[2.65rem] lg:text-[2.9rem]">
              Every document your organization has.{' '}
              {/* Own line at every width; left to wrap, it orphans "shelf." */}
              <span className="block text-primary">One shelf.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-[1.7] text-muted-foreground">
              A central store for the files your organization actually runs on. Real
              folders you can nest and browse, permissions that follow the folder, and
              search across everything you’re allowed to see, instead of a dozen drives
              and a thread of expired links.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <button className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-[0.9375rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                  Get started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <Link href="/login">
                <button className="rounded-lg border border-border/60 px-6 py-3 text-[0.9375rem] font-medium text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground">
                  Log in
                </button>
              </Link>
            </div>

            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border/40 pt-7">
              {[
                { v: 'One domain', l: 'Your organization, and only yours' },
                { v: 'Real folders', l: 'Nest them as deep as you need' },
                { v: '500 MB', l: 'Per upload' },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="text-sm font-bold text-primary">{s.v}</dt>
                  <dd className="mt-1 text-xs leading-snug text-muted-foreground">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Directory tree, using the product's own iconography */}
          <div className="rounded-xl border border-border/50 bg-card">
            <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">engineering</span>
              <ChevronRight className="h-3 w-3" />
              <span>onboarding</span>
            </div>

            <div className="p-2.5">
              {TREE.map((n) => (
                <TreeRow key={n.name} {...n} />
              ))}
            </div>

            <div className="border-t border-border/40 px-4 py-3.5">
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">architecture</span> is
                private. Everything inside it is too, whatever each file says. Reopen the
                folder and it all comes back.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The product surface ── */}
      <section className="border-t border-border/40 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="max-w-3xl text-[1.75rem] font-bold leading-[1.2] tracking-[-0.015em] sm:text-4xl">
            Put it somewhere. Find it later.{' '}
            <span className="text-muted-foreground">Even if nobody sent it to you.</span>
          </h2>

          {/* One wide, faithful recreation of the resource table */}
          <div className="mt-12 overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-border/40 px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Available Resources</div>
                <div className="text-xs text-muted-foreground">29 resources available</div>
              </div>
              <div className="hidden items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                <Search className="h-3.5 w-3.5" />
                deployment runbook
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_5rem_6rem] gap-4 px-5 py-3 text-xs font-medium text-muted-foreground">
                  <span>Title</span>
                  <span>Filename</span>
                  <span>Tags</span>
                  <span>Visibility</span>
                  <span>Uploader</span>
                </div>
                {ROWS.map((r) => (
                  <div
                    key={r.title}
                    className="grid grid-cols-[minmax(0,2.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_5rem_6rem] items-center gap-4 border-t border-muted-foreground/10 px-5 py-3 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <IconTile thumb={r.thumb}>{r.icon}</IconTile>
                      <span className="truncate text-sm font-medium">{r.title}</span>
                    </div>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {r.file}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <TagPill key={t}>{t}</TagPill>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">{r.visibility}</span>
                    <UploaderChip name={r.uploader} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Steps as plain typography, no boxes, for contrast with the panel above */}
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.label} className="border-t border-border/40 pt-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs text-primary/70">{s.n}</span>
                  <h3 className="text-sm font-semibold">{s.label}</h3>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="border-t border-border/40 px-6 py-24">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
          <div>
            <Eyebrow>What you get</Eyebrow>
            <h2 className="text-[1.75rem] font-bold leading-[1.2] tracking-[-0.015em] sm:text-4xl">
              Folders that behave like folders.{' '}
              <span className="text-muted-foreground">Permissions included.</span>
            </h2>

            <dl className="mt-12">
              {CAPABILITIES.map((item, i) => (
                <div
                  key={item.title}
                  className={`py-6 ${i > 0 ? 'border-t border-border/40' : ''}`}
                >
                  <dt className="text-[0.9375rem] font-semibold">{item.title}</dt>
                  <dd className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* An actual table row, in its anonymous state */}
            <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <div className="border-b border-border/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Anonymous upload
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <IconTile>
                    <FileText className="h-4 w-4 text-muted-foreground/60" />
                  </IconTile>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      Incident Notes: Payment Outage
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <User className="h-3 w-3" />
                        Anonymous
                      </span>
                      <span className="text-[11px] text-muted-foreground">2 days ago</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
                  Shown to the organization as{' '}
                  <span className="font-medium text-foreground">Anonymous</span>.
                  Moderators still see the uploader.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <div className="border-b border-border/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Everything has a path
              </div>
              <div className="space-y-2 p-4">
                {[
                  ['engineering', 'runbooks', 'deploy'],
                  ['finance', 'fy26', 'invoices'],
                  ['people', 'onboarding', 'templates'],
                ].map((parts) => (
                  <div
                    key={parts.join('/')}
                    className="flex items-center gap-1 truncate font-mono text-xs text-muted-foreground"
                  >
                    {parts.map((p, i) => (
                      <span key={p} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                        <span className={i === parts.length - 1 ? 'text-foreground' : ''}>
                          {p}
                        </span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
              <div className="border-b border-border/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Previews in the browser
              </div>
              <div className="flex flex-wrap gap-1.5 p-4">
                {['PDF', 'Images', 'Code', 'Video', 'Links'].map((t) => (
                  <TagPill key={t}>{t}</TagPill>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-border/40 px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-[1.75rem] font-bold leading-[1.2] tracking-[-0.015em] sm:text-4xl">
            Your organization’s files are on twelve laptops.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            Put them where everyone can actually find them.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <button className="group inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-[0.9375rem] font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Create your account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ──
           No Log in / Sign up here on purpose: the navbar is sticky and carries
           both at all times, and the CTA directly above is "Create your account".
           A third copy is noise, and there are no other routes worth linking. */}
      <footer className="border-t border-border/40 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 text-center sm:flex-row sm:items-baseline sm:gap-3 sm:text-left">
          <span className="text-sm font-bold tracking-tight text-primary">UniShelf</span>
          <span className="text-xs text-muted-foreground">
            Central document storage and sharing for your organization.
          </span>
        </div>
      </footer>
    </div>
  );
}
