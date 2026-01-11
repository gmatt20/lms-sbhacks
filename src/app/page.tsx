"use client";

import { GetStartedButton } from "@/components/GetStartedButton";
import { RotatingText } from "@/components/RotatingText";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Keep hero highlights fixed so the tone stays intentional
const highlightCards = [
  {
    title: "Start with honesty",
    copy: "Each assignment makes clear what's allowed and what isn't. Students understand what counts as their own work; no gray area.",
    tone: "purple",
  },
  {
    title: "Help students learn",
    copy: "Catch issues early and you can talk to students before grades are final, which means more teaching and less catching bad work.",
    tone: "blue",
  },
  {
    title: "Keep your standards",
    copy: "You built your programs with care; honest work keeps what you worked hard to build credible.",
    tone: "red",
  },
];

// Simple three-step path to keep orientation clear
const steps = [
  "Create assignments and share them with your class; setup is straightforward.",
  "Students submit their work, we check quietly for patterns and flag what looks off.",
  "You review what we found and make the call; you always decide what happens next.",
];

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait for Clerk to finish loading
    if (!isLoaded) return;

    // If user is logged in, check their role and redirect
    if (user) {
      const role = user.publicMetadata?.role as string;

      if (role === "teacher") {
        router.push("/teacher");
      } else if (role === "student") {
        router.push("/student");
      }
      // If they have no role, they'll need to go through onboarding
      // The GetStartedButton component handles that flow
    }
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white text-foreground">
      <section className="border-b border-border bg-white px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-start">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 border border-border px-3 py-1 text-xs font-semibold text-primary">
              Academic integrity matters
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                An LMS that helps you <RotatingText />
              </h1>
              <p className="text-lg text-muted-foreground">
                GradeMeIn catches issues early so you can handle them before they become problems. You assign, students submit, we show you what needs attention.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <GetStartedButton className="h-12 bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90" />
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
                    <p className="text-xs text-muted-foreground">Most turned it in on time, looks clean</p>
                  </div>
                  <span className="mono-emph bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Clean</span>
                </div>

                <div className="flex items-center justify-between border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Essay draft: Reconstruction era</p>
                    <p className="text-xs text-muted-foreground">A few responses need a closer look, flag for review</p>
                  </div>
                  <span className="mono-emph bg-destructive px-3 py-1 text-xs font-semibold text-white">Check</span>
                </div>

                <div className="flex items-center justify-between border border-border bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reflection: Week 5 progress</p>
                    <p className="text-xs text-muted-foreground">Saved automatically; you can go back if needed</p>
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
          <h2 className="text-3xl font-bold text-foreground">Built by people who actually teach</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
            When students do honest work, they learn better and think more clearly. Fair grades mean everyone gets what they earned; your programs stay credible.
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
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">What makes us different</p>
            <h2 className="text-3xl font-bold text-foreground">How GradeMeIn works</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-primary">✓</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">You see everything</h3>
              <p className="text-sm text-muted-foreground">
                We check all submissions; if something looks off, you'll know about it.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-secondary">⚡</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">You make the call</h3>
              <p className="text-sm text-muted-foreground">
                We show you what we found, but you decide what to do; not some automatic system.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-accent">⏱</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">Saves you time</h3>
              <p className="text-sm text-muted-foreground">
                Fits what you already do; no complicated setup or extra steps.
              </p>
            </div>

            <div className="space-y-2">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-border bg-white">
                <span className="mono-emph text-lg font-bold text-destructive">🔒</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">Keep the proof</h3>
              <p className="text-sm text-muted-foreground">
                Everything is saved securely; you have evidence if you need it later.
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
                Core promise
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
              GradeMeIn fits what you already do, so you focus on teaching while we handle detection.
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
            <GetStartedButton className="h-12 bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90" />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-white px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">What teachers say</p>
          <h2 className="mb-6 text-3xl font-bold text-foreground">
            Used by teachers who care about honest work
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            "I can see when something looks off without spending hours investigating. That means more time actually teaching, and students know someone is paying attention."
          </p>
          <p className="text-sm font-semibold text-foreground">Dr. Sarah Chen, Assistant Dean</p>
          <p className="text-xs text-muted-foreground">UC San Diego</p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            <GetStartedButton className="h-12 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90" />
          </div>
        </div>
      </section>
    </div>
  );
}
