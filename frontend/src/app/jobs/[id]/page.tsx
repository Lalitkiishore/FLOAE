"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { getRole } from "@/lib/get-role";
import { apiFetch, ApiError, Job, JOB_TYPE_LABELS, formatPay } from "@/lib/api";
import Nav from "@/components/Nav";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [coverNote, setCoverNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setRole(await getRole(supabase, data.user.id));
      setEmail(data.user.email ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!role || !id) return;
    apiFetch<Job>(`/jobs/${id}`)
      .then(setJob)
      .catch(() => setError("Job not found."))
      .finally(() => setLoading(false));
  }, [role, id]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setApplying(true);
    setError(null);
    try {
      await apiFetch(`/jobs/${id}/apply`, {
        method: "POST",
        body: JSON.stringify({ cover_note: coverNote || null }),
      });
      setApplied(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit application.");
    } finally {
      setApplying(false);
    }
  }

  if (!role || loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  const canApply = role === "contractor" || role === "labourer";

  return (
    <>
      <Nav role={role} email={email} />
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {error && !job && <p className="text-sm text-red-600">{error}</p>}
        {job && (
          <>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {job.location} · {JOB_TYPE_LABELS[job.job_type]} · {formatPay(job)}
            </p>
            <p className="text-sm text-gray-500">
              Posted by {job.recruiter_name ?? "a recruiter"}
            </p>
            <span className="inline-block text-xs bg-gray-100 rounded-full px-2 py-1 mt-2">
              {job.category}
            </span>

            <p className="mt-6 whitespace-pre-wrap text-gray-700">{job.description}</p>

            {canApply && (
              <div className="mt-8 border-t pt-6">
                {applied ? (
                  <p className="text-green-700 font-medium">
                    Application submitted! Check your dashboard for updates.
                  </p>
                ) : job.status !== "open" ? (
                  <p className="text-gray-500">This job is no longer accepting applications.</p>
                ) : (
                  <form onSubmit={handleApply} className="flex flex-col gap-3">
                    <label className="text-sm font-medium">
                      Cover note (optional)
                    </label>
                    <textarea
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={4}
                      placeholder="Why are you a good fit for this job?"
                      className="border rounded-md px-3 py-2 text-sm"
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button
                      type="submit"
                      disabled={applying}
                      className="bg-black text-white rounded-md py-2 font-medium disabled:opacity-50 w-fit px-6"
                    >
                      {applying ? "Applying..." : "Apply now"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
