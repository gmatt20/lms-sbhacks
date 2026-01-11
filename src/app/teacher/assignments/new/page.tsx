"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function NewAssignmentPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseId = searchParams.get("courseId") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) router.push("/");
    const role = user?.publicMetadata?.role as string;
    if (!role) router.push("/onboarding");
    if (role && role !== "teacher") router.push("/student");
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) {
    return <LoadingSpinner text="Loading..." />;
  }

  if (!courseId) {
    return (
      <div className="p-6 text-foreground">
        <p className="mb-4 text-sm text-muted-foreground">No course selected. Please choose a class first.</p>
        <Button asChild variant="outline" className="h-10 border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted">
          <Link href="/teacher/classes">Back to classes</Link>
        </Button>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`/api/courses/${courseId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          description: description,
          instructions: instructions,
          dueDate: dueDate,
          teacherId: user.id,
          courseId: courseId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("Done.");
        router.push(`/teacher/assignments/${data.assignment._id}/rubric`);
      } else {
        setMessage(data.error || "Failed to create.");
      }
    } catch (error) {
      setMessage("Network error creating assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 text-foreground">
      <Link href={`/teacher/classes/${courseId}`} className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to class
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Create new</p>
          <h1 className="text-3xl font-semibold leading-tight">Assignment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border border-border bg-white p-5 shadow-sm">
        <div>
          <label className="mb-2 block text-sm font-semibold">Title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full border border-border bg-white px-3 py-2 text-sm"
            placeholder="E.g., Essay on the American Dream"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Description</label>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full border border-border bg-white px-3 py-2 text-sm"
            placeholder="Short summary for students"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Prompt</label>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            required
            rows={8}
            className="w-full border border-border bg-white px-3 py-2 text-sm"
            placeholder="Paste your full assignment instructions..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Due date</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
            className="w-full border border-border bg-white px-3 py-2 text-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-10 bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {submitting ? "Creating..." : "Create"}
        </Button>

        {message && (
          <div className="border border-border bg-secondary/10 px-3 py-2 text-sm text-secondary-foreground">
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
