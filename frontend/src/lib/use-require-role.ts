"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { getRole } from "@/lib/get-role";

export interface AuthedUser {
  id: string;
  email: string | null;
  role: string;
}

/**
 * Protects a dashboard page: redirects to /login if not authenticated,
 * and redirects to the user's own dashboard if their role doesn't match
 * the one this page requires (e.g. a labourer trying to open /dashboard/admin).
 */
export function useRequireRole(requiredRole: string) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      const role = await getRole(supabase, data.user.id);
      if (!isMounted) return;

      if (role !== requiredRole && role !== "admin") {
        // Wrong role for this page - send them to the one that's actually theirs.
        router.replace(`/dashboard/${role}`);
        return;
      }

      setUser({ id: data.user.id, email: data.user.email ?? null, role });
      setChecking(false);
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredRole]);

  return { user, checking };
}
