"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function Nav({
  role,
  email,
}: {
  role: string;
  email?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold">
          FLOAE
        </Link>
        <Link href="/jobs" className="text-sm text-gray-600 hover:text-black">
          Browse jobs
        </Link>
        <Link
          href={`/dashboard/${role}`}
          className="text-sm text-gray-600 hover:text-black"
        >
          Dashboard
        </Link>
      </div>
      <div className="flex items-center gap-4">
        {email && <span className="text-sm text-gray-500">{email}</span>}
        <button onClick={handleLogout} className="text-sm underline text-gray-500">
          Log out
        </button>
      </div>
    </nav>
  );
}
