"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { getRole } from "@/lib/get-role";
import { apiFetch, Job, JOB_TYPE_LABELS } from "@/lib/api";
import JobCard from "@/components/JobCard";
import Nav from "@/components/Nav";

export default function JobsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");

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

  async function loadJobs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (location) params.set("location", location);
      if (jobType) params.set("job_type", jobType);
      const data = await apiFetch<Job[]>(`/jobs?${params.toString()}`);
      setJobs(data);
    } catch {
      setError("Couldn't load jobs. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (role) loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (!role) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <Nav role={role} email={email} />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-4">Browse jobs</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadJobs();
          }}
          className="flex flex-wrap gap-2 mb-6"
        >
          <input
            placeholder="Search title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[180px]"
          />
          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm w-40"
          />
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="">Any type</option>
            {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-black text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            Search
          </button>
        </form>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {loading ? (
          <p className="text-gray-400">Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-500">No open jobs match your filters yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
