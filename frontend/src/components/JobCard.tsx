import Link from "next/link";
import { Job, JOB_TYPE_LABELS, formatPay } from "@/lib/api";

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block border rounded-lg p-4 hover:border-black transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">{job.title}</h3>
          <p className="text-sm text-gray-500">
            {job.location} · {JOB_TYPE_LABELS[job.job_type]}
            {job.recruiter_name ? ` · posted by ${job.recruiter_name}` : ""}
          </p>
        </div>
        <span className="text-sm font-medium whitespace-nowrap">{formatPay(job)}</span>
      </div>
      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description}</p>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs bg-gray-100 rounded-full px-2 py-1">{job.category}</span>
        {job.status === "closed" && (
          <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-1">Closed</span>
        )}
        {typeof job.application_count === "number" && (
          <span className="text-xs text-gray-400">
            {job.application_count} applicant{job.application_count === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </Link>
  );
}
