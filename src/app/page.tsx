"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Keep hero highlights fixed so the tone stays intentional
const highlightCards = [
  {
    title: "Start with honesty",
    copy: "Each assignment sets clear expectations, so students know what counts as their own work and what crosses the line.",
    tone: "purple",
  },
  {
    title: "Help students learn",
    copy: "When you spot issues early, you can talk to students before grades go final, which means more teaching and less policing.",
    tone: "blue",
  },
  {
    title: "Keep your standards",
    copy: "You worked hard to build credible programs, and honest coursework protects what you built.",
    tone: "red",
  },
];

// Simple three-step path to keep orientation clear
const steps = [
  "Create assignments and share them with your class, the setup is simple.",
  "Students submit work, we quietly check patterns and let you know if something seems off.",
  "You review anything flagged and decide what to do, the final call is always yours.",
];

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white text-foreground">
      <section className="border-b border-border bg-white px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-start">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs font-semibold text-primary">
              Integrity you can trust
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                An LMS that helps you keep coursework honest
              </h1>
              <p className="text-lg text-muted-foreground">
                GradeMeIn makes it easier to catch issues before they become problems. You assign, students submit, and we show you what needs a closer look.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild className="h-12 bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90" variant="default">
                <Link href="/teacher">Get started</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 border-border bg-white px-6 text-base font-semibold text-foreground hover:bg-muted">
                <Link href="/student">For students</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="border border-border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Active courses</p>
                <p className="mono-emph text-3xl font-semibold text-foreground">12</p>
                <p className="text-xs text-foreground">Rosters stay synced</p>
              </div>
              <div className="border border-border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">On-time submissions</p>
                <p className="mono-emph text-3xl font-semibold text-secondary">94%</p>
                <p className="text-xs text-foreground">New this week</p>
              </div>
              <div className="border border-border bg-card p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Follow-ups queued</p>
                <p className="mono-emph text-3xl font-semibold text-destructive">3</p>
                <p className="text-xs text-foreground">Needs instructor review</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="border border-border bg-card p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
                  <p className="text-lg font-semibold text-foreground">Course activity</p>
                </div>
                <span className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Live</span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Homework 3: Cellular Energy</p>
                    <p className="text-xs text-muted-foreground">Most students turned it in on time, looks good so far</p>
                  </div>
                  <span className="mono-emph bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Clean</span>
                </div>

                <div className="flex items-center justify-between border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Essay draft: Reconstruction era</p>
                    <p className="text-xs text-muted-foreground">A couple responses need a second look, might be worth checking</p>
                  </div>
                  <span className="mono-emph bg-destructive px-3 py-1 text-xs font-semibold text-white">Check</span>
                </div>

                <div className="flex items-center justify-between border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reflection: Week 5 progress</p>
                    <p className="text-xs text-muted-foreground">Everything is saved if you need to go back later</p>
                  </div>
                  <span className="mono-emph bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">Done</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Why this matters</p>
          <h2 className="text-3xl font-bold text-foreground">Made by people who actually teach</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
            When students do honest work, they learn better and think for themselves. Fair grading means everyone gets what they earned, and your programs stay credible.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {highlightCards.map((item) => (
            <div
              key={item.title}
              className="border border-border bg-white p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={`h-2 w-10 ${
                    item.tone === "purple"
                      ? "bg-primary"
                      : item.tone === "blue"
                        ? "bg-secondary"
                        : "bg-destructive"
                  }`}
                />
                Core value
              </div>
              <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">What we do differently</p>
            <h2 className="text-3xl font-bold text-foreground">How GradeMeIn works for you</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-primary">✓</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">You see everything</h3>
              <p className="text-sm text-muted-foreground">
                We check all submissions, so if something looks off you will know about it.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-secondary">⚡</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">You make the call</h3>
              <p className="text-sm text-muted-foreground">
                We show you what we found, but you decide what to do about it, not some automated system.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-accent">⏱</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">Saves you time</h3>
              <p className="text-sm text-muted-foreground">
                Fits into what you already do, no complicated setup or extra hoops to jump through.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-destructive">🔒</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">Keep the proof</h3>
              <p className="text-sm text-muted-foreground">
                Everything gets saved securely, so you have evidence if you need it down the road.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {highlightCards.map((item) => (
            <div
              key={item.title}
              className="border border-border bg-white p-6 shadow-sm"
            >
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={`h-2 w-10 ${
                    item.tone === "purple"
                      ? "bg-primary"
                      : item.tone === "blue"
                        ? "bg-secondary"
                        : "bg-destructive"
                  }`}
                />
                Integrity promise
              </div>
              <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="border border-border bg-foreground px-8 py-10 text-white">
          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">How it works</p>
            <h2 className="mb-4 text-3xl font-semibold leading-tight">Three steps to keep work honest</h2>
            <p className="max-w-2xl text-sm text-white/80">
              GradeMeIn fits into what you already do, so you can focus on teaching while we handle the checking part.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="border border-border bg-slate-900 p-5 text-white"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="mono-emph flex h-8 w-8 items-center justify-center border border-accent bg-accent/10 text-sm font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">Step {index + 1}</span>
                </div>
                <p className="text-sm leading-6 text-white/90">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3">
            <Button
              asChild
              className="h-12 bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/teacher">See how it works</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-border bg-white px-6 text-base font-semibold text-foreground hover:bg-muted"
            >
              <Link href="/student">Try for free</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">What teachers say</p>
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            Used by instructors who care about honest work
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            "I can see when something looks wrong without spending hours on detective work. That means more time actually teaching, and students know someone is paying attention."
          </p>
          <p className="text-sm font-semibold text-foreground">Dr. Sarah Chen, Assistant Dean</p>
          <p className="text-xs text-muted-foreground">UC San Diego</p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            <Button asChild className="h-12 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90">
              <Link href="/teacher">Start using GradeMeIn</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
