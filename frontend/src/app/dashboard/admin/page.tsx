"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/use-require-role";
import { apiFetch, Job, JOB_TYPE_LABELS, formatPay } from "@/lib/api";
import Nav from "@/components/Nav";

interface AdminStats {
  total_users: number;
  recruiters: number;
  contractors: number;
  labourers: number;
  total_jobs: number;
  open_jobs: number;
  total_applications: number;
}

export default function AdminDashboard() {
  const { user, checking } = useRequireRole("admin");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch<AdminStats>("/stats/admin").then(setStats),
      apiFetch<Job[]>("/jobs?mine=false").then(setJobs),
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
      <Nav role="admin" email={user?.email} />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6">Admin dashboard</h1>

        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard label="Total users" value={stats.total_users} />
            <StatCard label="Recruiters" value={stats.recruiters} />
            <StatCard label="Contractors" value={stats.contractors} />
            <StatCard label="Labourers" value={stats.labourers} />
            <StatCard label="Open jobs" value={stats.open_jobs} />
            <StatCard label="Total applications" value={stats.total_applications} />
          </div>
        )}

        <h2 className="font-semibold mb-3">Open listings platform-wide</h2>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-500">No open jobs right now.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-gray-500">
                    {job.location} · {JOB_TYPE_LABELS[job.job_type]} · {formatPay(job)} · posted by{" "}
                    {job.recruiter_name}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {job.application_count ?? 0} applicant
                  {job.application_count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
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
