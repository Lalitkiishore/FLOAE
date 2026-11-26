"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireRole } from "@/lib/use-require-role";
import { apiFetch, Application, Job } from "@/lib/api";
import Nav from "@/components/Nav";
import JobCard from "@/components/JobCard";

interface WorkerStats {
  total_applications: number;
  pending: number;
  accepted: number;
  rejected: number;
  open_jobs: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-gray-100 text-gray-500",
};

/** Shared UI for the contractor and labourer dashboards - same shape, different role. */
export default function WorkerDashboard({ role }: { role: "contractor" | "labourer" }) {
  const { user, checking } = useRequireRole(role);

  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<WorkerStats>("/stats/worker").then(setStats),
      apiFetch<Application[]>("/applications/me").then(setApplications),
      apiFetch<Job[]>("/jobs").then((jobs) => setRecentJobs(jobs.slice(0, 5))),
    ]).finally(() => setLoading(false));
  }, [user]);

  if (checking) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <Nav role={role} email={user?.email} />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold capitalize">{role} dashboard</h1>
          <Link
            href="/jobs"
            className="bg-black text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            Browse jobs
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            <StatCard label="Open jobs" value={stats.open_jobs} />
            <StatCard label="Applications" value={stats.total_applications} />
            <StatCard label="Pending" value={stats.pending} />
            <StatCard label="Accepted" value={stats.accepted} />
          </div>
        )}

        <h2 className="font-semibold mb-3">Your applications</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : applications.length === 0 ? (
          <p className="text-gray-500 mb-8">
            You haven&apos;t applied to anything yet — browse open jobs above to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mb-8">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div>
                  <p className="text-sm font-medium">{app.job_title}</p>
                  {app.cover_note && (
                    <p className="text-xs text-gray-500 mt-1">{app.cover_note}</p>
                  )}
                </div>
                <span
                  className={`text-xs rounded-full px-2 py-1 ${STATUS_STYLES[app.status]}`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-semibold mb-3">Newest listings</h2>
        <div className="flex flex-col gap-3">
          {recentJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
