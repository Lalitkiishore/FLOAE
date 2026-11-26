"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/lib/use-require-role";
import {
  apiFetch,
  ApiError,
  Job,
  Application,
  JobType,
  PayType,
  JOB_TYPE_LABELS,
  formatPay,
} from "@/lib/api";
import Nav from "@/components/Nav";

interface RecruiterStats {
  open_jobs: number;
  total_jobs: number;
  total_applicants: number;
  pending_applicants: number;
}

const emptyForm = {
  title: "",
  description: "",
  category: "",
  location: "",
  job_type: "gig" as JobType,
  pay_type: "daily" as PayType,
  pay_min: "",
  pay_max: "",
};

export default function RecruiterDashboard() {
  const { user, checking } = useRequireRole("recruiter");

  const [stats, setStats] = useState<RecruiterStats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const data = await apiFetch<Job[]>("/jobs?mine=true");
      setJobs(data);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadStats() {
    const data = await apiFetch<RecruiterStats>("/stats/recruiter");
    setStats(data);
  }

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handlePostJob(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setFormError(null);
    try {
      await apiFetch("/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          pay_min: form.pay_min ? Number(form.pay_min) : null,
          pay_max: form.pay_max ? Number(form.pay_max) : null,
        }),
      });
      setForm(emptyForm);
      setShowForm(false);
      loadJobs();
      loadStats();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't post job.");
    } finally {
      setPosting(false);
    }
  }

  async function toggleCloseJob(job: Job) {
    await apiFetch(`/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: job.status === "open" ? "closed" : "open" }),
    });
    loadJobs();
  }

  async function refreshApplicants(jobId: string) {
    const data = await apiFetch<Application[]>(`/jobs/${jobId}/applications`);
    setApplicants(data);
  }

  async function viewApplicants(jobId: string) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    setLoadingApplicants(true);
    try {
      await refreshApplicants(jobId);
    } finally {
      setLoadingApplicants(false);
    }
  }

  async function setApplicationStatus(applicationId: string, status: "accepted" | "rejected") {
    await apiFetch(`/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (expandedJobId) refreshApplicants(expandedJobId);
    loadStats();
  }

  if (checking) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <Nav role="recruiter" email={user?.email} />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Recruiter dashboard</h1>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="bg-black text-white rounded-md px-4 py-2 text-sm font-medium"
          >
            {showForm ? "Cancel" : "+ Post a job"}
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard label="Open jobs" value={stats.open_jobs} />
            <StatCard label="Total jobs" value={stats.total_jobs} />
            <StatCard label="Applicants" value={stats.total_applicants} />
            <StatCard label="Pending review" value={stats.pending_applicants} />
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handlePostJob}
            className="border rounded-lg p-4 mb-6 flex flex-col gap-3"
          >
            <input
              required
              placeholder="Job title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm"
            />
            <textarea
              required
              placeholder="Description - what's the work, what should applicants know?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="border rounded-md px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Category (e.g. Construction, Delivery)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              />
              <select
                value={form.job_type}
                onChange={(e) => setForm({ ...form, job_type: e.target.value as JobType })}
                className="border rounded-md px-3 py-2 text-sm"
              >
                {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={form.pay_type}
                onChange={(e) => setForm({ ...form, pay_type: e.target.value as PayType })}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="daily">Per day</option>
                <option value="hourly">Per hour</option>
                <option value="fixed">Fixed price</option>
              </select>
              <input
                type="number"
                placeholder="Pay min (₹)"
                value={form.pay_min}
                onChange={(e) => setForm({ ...form, pay_min: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Pay max (₹)"
                value={form.pay_max}
                onChange={(e) => setForm({ ...form, pay_max: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              disabled={posting}
              className="bg-black text-white rounded-md py-2 font-medium disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post job"}
            </button>
          </form>
        )}

        <h2 className="font-semibold mb-3">Your listings</h2>
        {loadingJobs ? (
          <p className="text-gray-400">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t posted any jobs yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="text-sm text-gray-500">
                      {job.location} · {JOB_TYPE_LABELS[job.job_type]} · {formatPay(job)}
                    </p>
                  </div>
                  <span
                    className={`text-xs rounded-full px-2 py-1 whitespace-nowrap ${
                      job.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => viewApplicants(job.id)} className="text-sm underline">
                    {expandedJobId === job.id ? "Hide" : "View"} applicants (
                    {job.application_count ?? 0})
                  </button>
                  <button
                    onClick={() => toggleCloseJob(job)}
                    className="text-sm underline text-gray-500"
                  >
                    {job.status === "open" ? "Close listing" : "Reopen listing"}
                  </button>
                </div>

                {expandedJobId === job.id && (
                  <div className="mt-4 border-t pt-4">
                    {loadingApplicants ? (
                      <p className="text-sm text-gray-400">Loading applicants...</p>
                    ) : applicants.length === 0 ? (
                      <p className="text-sm text-gray-500">No applicants yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {applicants.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between border rounded-md p-3"
                          >
                            <div>
                              <p className="text-sm font-medium">{app.applicant_name}</p>
                              {app.cover_note && (
                                <p className="text-sm text-gray-500 mt-1">{app.cover_note}</p>
                              )}
                              <span className="text-xs text-gray-400">{app.status}</span>
                            </div>
                            {app.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setApplicationStatus(app.id, "accepted")}
                                  className="text-xs bg-black text-white rounded-md px-3 py-1"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => setApplicationStatus(app.id, "rejected")}
                                  className="text-xs border rounded-md px-3 py-1"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
