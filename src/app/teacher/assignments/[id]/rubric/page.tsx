"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface RubricItem {
  id: string;
  criterion: string;
  description: string;
  maxPoints: number;
}

export default function RubricPage() {
  const { user, isLoaded } = useUser();
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [rubric, setRubric] = useState<RubricItem[]>([]);
  const [visibleToStudents, setVisibleToStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/");
      return;
    }
    const role = user.publicMetadata?.role as string;
    if (!role) {
      router.push("/onboarding");
      return;
    }
    if (role !== "teacher") {
      router.push("/student");
      return;
    }
    fetch(`/api/assignments/${assignmentId}`)
      .then((r) => r.json())
      .then((data) => {
        setAssignment(data.assignment);
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    fetch(`/api/assignments/${assignmentId}/rubric`)
      .then((r) => r.json())
      .then((data) => {
        setRubric(data.rubric || []);
        setVisibleToStudents(!!data.visibleToStudents);
      })
      .catch(() => { });
  }, [isLoaded, user, router, assignmentId]);

  const totalPoints = useMemo(
    () => rubric.reduce((sum, item) => sum + (item.maxPoints || 0), 0),
    [rubric]
  );

  const updateItem = (id: string, field: keyof RubricItem, value: string | number) => {
    setRubric((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    const nextId = `r${Date.now()}`;
    setRubric((prev) => [
      ...prev,
      { id: nextId, criterion: "", description: "", maxPoints: 5 },
    ]);
  };

  const removeItem = (id: string) => {
    setRubric((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/rubric`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubric, visibleToStudents }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Rubric saved.");
      } else {
        setMessage(data.error || "Failed to save rubric.");
      }
    } catch (error) {
      setMessage("Network error saving rubric.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!assignment) return;
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch(`/api/assignments/rubric/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: assignment.instructions, title: assignment.title }),
      });
      const data = await res.json();
      if (res.ok) {
        setRubric(data.rubric || []);
        setMessage(data.cached ? "Loaded suggested rubric (cached)." : "Suggested rubric generated.");
      } else {
        setMessage(data.error || "Failed to generate.");
      }
    } catch (error) {
      setMessage("Network error generating rubric.");
    } finally {
      setGenerating(false);
    }
  };

  if (!isLoaded || loading) return <LoadingSpinner text="Loading rubric..." />;

  return (
    <div className="mx-auto max-w-5xl p-6 text-foreground">
      <Link href={`/teacher/assignments/${assignmentId}`} className="mb-3 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        ← Back to assignment
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Rubric</p>
          <h1 className="text-3xl font-semibold leading-tight">{assignment?.title || "Assignment"}</h1>
          <p className="text-sm text-muted-foreground">Points total: {totalPoints}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="h-10 bg-secondary px-4 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90"
          >
            {generating ? "Generating..." : "Generate"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={visibleToStudents}
            onChange={(e) => setVisibleToStudents(e.target.checked)}
          />
          Show to students
        </label>
        <span className="text-muted-foreground">Points: {totalPoints}</span>
      </div>

      <div className="space-y-3">
        {rubric.map((item) => (
          <div key={item.id} className="border border-border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1 space-y-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Criterion</label>
                  <input
                    type="text"
                    value={item.criterion}
                    onChange={(e) => updateItem(item.id, "criterion", e.target.value)}
                    className="w-full border border-border bg-white px-3 py-2 text-sm"
                    placeholder="Clear thesis statement"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    rows={3}
                    className="w-full border border-border bg-white px-3 py-2 text-sm"
                    placeholder="What to look for when scoring"
                  />
                </div>
              </div>
              <div className="w-full sm:w-40">
                <label className="mb-1 block text-xs font-semibold">Max points</label>
                <input
                  type="number"
                  value={item.maxPoints}
                  onChange={(e) => updateItem(item.id, "maxPoints", Number(e.target.value))}
                  className="w-full border border-border bg-white px-3 py-2 text-sm"
                  min={0}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-9 w-full border-border bg-white text-sm font-semibold text-foreground hover:bg-muted"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 border-border bg-white px-4 text-sm font-semibold text-foreground hover:bg-muted"
          onClick={addItem}
        >
          Add criterion
        </Button>
      </div>
    </div>
  );
}
