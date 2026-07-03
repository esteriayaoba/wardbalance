"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Log out"
      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
    >
      <LogOut className="w-5 h-5 shrink-0" />
    </button>
  );
}
