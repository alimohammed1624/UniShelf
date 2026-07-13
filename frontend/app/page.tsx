'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="text-lg font-bold tracking-tight text-primary">UniShelf</span>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <button className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </button>
            </Link>
            <Link href="/signup">
              <button className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-all hover:bg-primary/90 hover:shadow-primary/20">
                Sign up
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero — split layout ── */}
      <section className="px-6 pt-16 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_1fr]">
          {/* Left — copy */}
          <div className="flex flex-col justify-center py-8">
            <h1 className="text-4xl font-extrabold tracking-tight leading-[1.15] sm:text-5xl md:text-6xl lg:text-[3.75rem]">
              Your campus knowledge.{' '}
              <span className="bg-gradient-to-r from-primary to-[oklch(0.82_0.13_75)] bg-clip-text text-transparent">
                one shelf.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Upload anything — notes, papers, diagrams, links. Organize it however you want. 
              Your classmates find it through search and tags. No rigid folders, no forced categories. 
              Just a shared shelf for your university community.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <Link href="/signup">
                <button className="group inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/15 transition-all hover:bg-primary/90 hover:shadow-primary/25">
                  Get started
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="mt-12 flex gap-8 border-t border-border/30 pt-6">
              {[
                { value: '.edu only', label: 'Verified students' },
                { value: '500 MB', label: 'Per upload' },
                { value: 'Any structure', label: 'You decide how to organize' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-lg font-bold text-primary">{s.value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live-ish resource mockup */}
          <div className="relative">
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-lg">
              <div className="mb-3 flex items-center gap-2 border-b border-border/30 pb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-[oklch(0.6_0.2_15)]" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="h-2.5 w-2.5 rounded-full bg-[oklch(0.696_0.17_162.48)]" />
                <span className="ml-auto text-xs text-muted-foreground">search results</span>
              </div>

              {/* Search bar mockup */}
              <div className="mb-3 rounded-md bg-background/60 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <span className="opacity-40">🔍</span>
                <span>machine learning notes</span>
              </div>

              {/* Results */}
              {[
                { title: 'ML — Linear Regression Cheat Sheet', meta: 'uploaded 3 days ago · pdf' },
                { title: 'Neural Networks from Scratch (Python)', meta: 'uploaded yesterday · link' },
                { title: 'Stats Notes — Probability Distributions', meta: 'uploaded 1 week ago · pdf' },
              ].map((r) => (
                <div key={r.title} className="rounded-md bg-background/40 px-3 py-2.5 transition-colors hover:bg-accent/40">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{r.meta}</div>
                </div>
              ))}

              {/* Tags bar */}
              <div className="mt-3 flex items-center gap-2 border-t border-border/30 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">filter by tag:</span>
                {['ml', 'notes', 'python'].map((t) => (
                  <span key={t} className="rounded-full bg-primary/15 px-2 py-px text-[10px] font-medium text-primary">{t}</span>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-primary/5 blur-xl" />
          </div>
        </div>
      </section>

      {/* ── How people actually use it ── */}
      <section className="mt-20 border-t border-border/30 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            You organize it. They find it.<br />
            <span className="text-muted-foreground">No rules, no templates.</span>
          </h2>

          {/* Three real-world scenarios */}
          <div className="mt-16 grid gap-0 lg:grid-cols-3">
            {[
              {
                label: 'Upload',
                scenario: 'Drag a file or paste a link. Add tags that make sense to you. Set it public, private, or share with specific people.',
                visual: (
                  <div className="mt-6 rounded-lg border border-border/40 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/30 pb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload</span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="rounded-md bg-background/60 px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                        <span>📎</span> drag files here or paste a link
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['notes', 'exam-prep', 'personal'].map((t) => (
                          <span key={t} className="rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Upload</button>
                        <span className="text-xs text-muted-foreground">visibility: public · private · specific users</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                label: 'Discover',
                scenario: 'Search by keyword, filter by tags or file type. Preview PDFs and images directly in the browser. Bookmark what you need.',
                visual: (
                  <div className="mt-6 rounded-lg border border-border/40 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/30 pb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discover</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { title: 'Final Exam Study Guide', tag: 'exam-prep' },
                        { title: 'Lab Setup Instructions', tag: 'tutorial' },
                        { title: 'Research Paper Summary', tag: 'reading' },
                      ].map((r) => (
                        <div key={r.title} className="rounded-md bg-background/60 px-3 py-2 text-sm flex items-center justify-between">
                          <span>{r.title}</span>
                          <span className="rounded-full bg-primary/15 px-2 py-px text-[10px] font-medium text-primary shrink-0 ml-2">{r.tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                label: 'Control',
                scenario: 'You decide who sees what. Public by default, but toggle private or whitelist/blacklist individual users per resource.',
                visual: (
                  <div className="mt-6 rounded-lg border border-border/40 bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-border/30 pb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Control</span>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Public', active: true },
                        { label: 'Private — only me' },
                        { label: 'Whitelist — specific users' },
                        { label: 'Blacklist — hide from these users' },
                      ].map((r) => (
                        <div key={r.label} className={`rounded-md px-3 py-2 text-sm flex items-center justify-between ${r.active ? 'bg-primary/15 border border-primary/30' : 'bg-background/60'}`}>
                          <span>{r.label}</span>
                          {r.active && <span className="text-[10px] font-semibold text-primary">active</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="border-b border-border/30 lg:border-b-0">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{item.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.scenario}</p>
                {item.visual}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── "Built for" — no course bullshit, just real capabilities ── */}
      <section className="border-t border-border/30 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              No folders. No categories.<br />
              <span className="text-muted-foreground">Just tags and search.</span>
            </h2>

            <div className="mt-10 space-y-8">
              {[
                {
                  title: 'Organize however you want',
                  desc: 'No forced course codes. No rigid directory structure. Tag your resources with whatever makes sense to you — and use the optional hierarchy if it helps.',
                },
                {
                  title: '.edu gatekeeping',
                  desc: 'Only verified university emails can join. No randoms. No spam accounts. Your campus, your shelf.',
                },
                {
                  title: 'Per-user access lists',
                  desc: 'Make a resource public or private — then whitelist/blacklist specific users on each one. Fine-grained without the complexity.',
                },
              ].map((item) => (
                <div key={item.title}>
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — visual: tag cloud + hierarchy toggle */}
          <div className="relative">
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-lg">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your tags
              </div>

              {/* Tag cloud */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['exam-prep', 'notes', 'tutorial', 'lab', 'reading', 'cheat-sheet', 'python', 'math', 'personal', 'group-project'].map((t) => (
                  <span key={t} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-default">
                    {t}
                  </span>
                ))}
              </div>

              {/* Hierarchy toggle — optional, not forced */}
              <div className="rounded-md bg-background/40 p-3 border border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Optional hierarchy</span>
                  <span className="text-[10px] rounded-full bg-primary/15 px-2 py-px font-medium text-primary">optional</span>
                </div>
                <div className="space-y-1 font-mono text-sm text-muted-foreground">
                  <div>my-notes ▸ exam-prep</div>
                  <div>my-notes ▸ tutorials</div>
                  <div>resources ▸ papers</div>
                </div>
              </div>

              {/* Resource list */}
              <div className="mt-4 border-t border-border/30 pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">recent uploads</div>
                {[
                  'Final Study Guide.pdf',
                  'Python Tutorial.ipynb',
                  'Group Project Notes.md',
                ].map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-md bg-background/40 px-3 py-2 text-sm text-muted-foreground hover:bg-accent/30">
                    <span>📄</span>
                    <span className="truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none absolute -inset-4 rounded-2xl bg-primary/5 blur-xl" />
          </div>
        </div>
      </section>

      {/* ── Final CTA — dead simple ── */}
      <section className="border-t border-border/30 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Your notes are sitting on your laptop.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Put them where they'll actually be useful.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <button className="group inline-flex items-center gap-2 rounded-lg bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground shadow-xl shadow-primary/15 transition-all hover:bg-primary/90 hover:shadow-primary/25">
                Create your account
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm text-muted-foreground">UniShelf — Academic resource sharing for universities.</span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">Log in</Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
