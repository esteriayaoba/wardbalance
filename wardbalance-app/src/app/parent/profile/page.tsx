"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Save, CheckCircle2, User } from "lucide-react";

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  address: string | null;
  schoolName: string;
}

export default function ParentProfilePage() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetch("/api/portal/profile")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load profile details.");
        return r.json();
      })
      .then((res) => {
        const p = res.data;
        setProfile(p);
        setFirstName(p.firstName);
        setLastName(p.lastName);
        setEmail(p.email || "");
        setPhone(p.phone);
        setAddress(p.address || "");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email || null,
          phone,
          address: address || null,
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save profile.");

      setSuccess("Profile settings updated successfully.");
      setProfile(body.data);
    } catch (err: any) {
      setError(err.message ?? "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-body-medium text-neutral-600">Retrieving profile directories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">My Profile</h1>
        <p className="text-body-small text-neutral-600">
          Manage your parent account profile and contact details.
        </p>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
              <span>{success}</span>
            </div>
          )}

          {/* School Context info */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-label-large">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Registered School Workspace</span>
              <span className="text-body-medium font-bold text-neutral-800">{profile?.schoolName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">First Name *</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none font-medium text-neutral-800"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Last Name *</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none font-medium text-neutral-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none font-medium text-neutral-800 font-mono"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none font-medium text-neutral-800"
                placeholder="e.g. parent@email.com"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Residential Address</label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none text-neutral-800"
              placeholder="e.g. 42 Parent Lane, Lagos"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-label-large transition flex items-center justify-center gap-2 shadow cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile Settings
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
