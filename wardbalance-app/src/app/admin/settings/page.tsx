"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [estimatedStudents, setEstimatedStudents] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.data) {
          setName(body.data.name ?? "");
          setAddress(body.data.address ?? "");
          setPhone(body.data.phone ?? "");
          setEmail(body.data.email ?? "");
          setEstimatedStudents(body.data.estimatedStudents ?? "");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load school profile settings");
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("School name is required");
      return;
    }
    if (!address.trim()) {
      setError("School address is required");
      return;
    }
    if (!phone.trim()) {
      setError("School contact phone is required");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          estimatedStudents: estimatedStudents || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to save settings");
      }

      setSuccess("School profile settings updated successfully.");
      router.refresh(); // Refresh layouts to update active indicators
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving school details...</p>
      </div>
    );
  }

  const isChecklistComplete = address.trim() && phone.trim();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-headline-small text-neutral-900 font-bold">School Settings</h1>
        <p className="text-body-medium text-neutral-600">
          Manage your school's workspace profile, contact credentials, and administrative variables.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-neutral-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
              <span>{success}</span>
            </div>
          )}

          {/* School Name */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">School Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone (Required for Checklist) */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">
                Contact Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +234 801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
              <p className="text-[11px] text-neutral-400">
                Required to complete Checklist Step 1.
              </p>
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1.5">
              <label className="text-label-medium text-neutral-700 block">Contact Email</label>
              <input
                type="email"
                placeholder="e.g. contact@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Address (Required for Checklist) */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">School Physical Address *</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. 15, Ademola Alabi Street, Ikeja, Lagos State, Nigeria"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none resize-none"
            />
            <p className="text-[11px] text-neutral-400">
              Required to complete Checklist Step 1.
            </p>
          </div>

          {/* Estimated Students */}
          <div className="space-y-1.5">
            <label className="text-label-medium text-neutral-700 block">Estimated Students Cohort Size</label>
            <select
              value={estimatedStudents}
              onChange={(e) => setEstimatedStudents(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 text-body-medium bg-white focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
            >
              <option value="">Select an option</option>
              <option value="under_100">Under 100 students</option>
              <option value="100_300">100 - 300 students</option>
              <option value="300_1000">300 - 1,000 students</option>
              <option value="above_1000">Above 1,000 students</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-neutral-200 gap-4">
            <div className="flex items-center gap-2">
              {isChecklistComplete ? (
                <span className="inline-flex items-center gap-1.5 text-body-small text-green-700 font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Profile complete for checklist
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-body-small text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                  Complete profile to unlock Step 1
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition disabled:opacity-50 inline-flex items-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Profile Settings"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
