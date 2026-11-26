import { createClient } from "@/lib/supabase-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Calls the FastAPI backend with the current Supabase session's access
 * token attached, so the backend's require_role() checks can do their job.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON - fall back to statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// --- Types shared with the backend's Pydantic schemas ---

export type JobType = "full_time" | "part_time" | "gig" | "contract";
export type PayType = "hourly" | "fixed" | "daily";
export type JobStatus = "open" | "closed";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  job_type: JobType;
  pay_type: PayType;
  pay_min: number | null;
  pay_max: number | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  recruiter_name?: string | null;
  application_count?: number | null;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_note: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  applicant_name?: string | null;
  applicant_email?: string | null;
  job_title?: string | null;
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  gig: "Gig",
  contract: "Contract",
};

export function formatPay(job: Job): string {
  if (job.pay_min == null && job.pay_max == null) return "Pay not specified";
  const unit = job.pay_type === "hourly" ? "/hr" : job.pay_type === "daily" ? "/day" : "";
  if (job.pay_min != null && job.pay_max != null && job.pay_min !== job.pay_max) {
    return `₹${job.pay_min}–₹${job.pay_max}${unit}`;
  }
  const value = job.pay_min ?? job.pay_max;
  return `₹${value}${unit}`;
}
