"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Save, Info } from "lucide-react";

export default function NewDiscountRulePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "percentage",
    value: "",
    condition: "sibling_count",
    conditionValue: "2",
    scope: "all_students",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/fees/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, value: Number(formData.value) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create rule");
      router.push("/admin/fees/discounts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  const renderPreview = () => {
    const mockTotal = 150000;
    const discountAmount = formData.type === "percentage"
      ? mockTotal * (Number(formData.value || 0) / 100)
      : Number(formData.value || 0);
    const finalAmount = Math.max(0, mockTotal - discountAmount);

    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-label-large text-neutral-900 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-500" />
          Rule Preview
        </h3>
        <p className="text-body-small text-neutral-600 mb-6">
          This is how the discount will affect a standard invoice of ₦150,000 for students matching the criteria.
        </p>
        <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm space-y-3 mb-6">
          <div className="flex justify-between items-center text-body-medium text-neutral-600">
            <span>Original Invoice Total</span>
            <span className="tabular-nums font-bold">₦150,000</span>
          </div>
          <div className="flex justify-between items-center text-body-medium text-green-600 font-bold border-b border-neutral-100 pb-3">
            <span>Discount Applied</span>
            <span className="tabular-nums">-₦{discountAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-label-large text-neutral-900 pt-1">
            <span>Final Amount</span>
            <span className="tabular-nums text-lg">₦{finalAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="mt-auto bg-amber-50 border border-amber-200 text-amber-800 text-body-small p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-1">Important Note</span>
            Saving this rule will not alter existing issued invoices. It will automatically apply to newly generated invoices that match the scope.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Link href="/admin/fees/discounts" className="inline-flex items-center gap-2 text-body-small font-bold text-neutral-500 hover:text-neutral-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Discounts
        </Link>
        <h1 className="text-headline-small text-neutral-900 mb-1">Create Discount Rule</h1>
        <p className="text-body-small text-neutral-500">Define criteria for automated fee deductions.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 text-body-small font-bold">
                <AlertCircle className="w-5 h-5" /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="block text-label-medium text-neutral-700 mb-1.5">Rule Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. 2nd Child Sibling Discount"
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline" />
              </div>

              <div>
                <label className="block text-label-medium text-neutral-700 mb-1.5">Discount Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline bg-white">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₦)</option>
                </select>
              </div>

              <div>
                <label className="block text-label-medium text-neutral-700 mb-1.5">
                  Discount Value {formData.type === "percentage" ? "(%)" : "(₦)"}
                </label>
                <input required type="number" min="0" step={formData.type === "percentage" ? "1" : "100"}
                  value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}
                  placeholder={formData.type === "percentage" ? "10" : "5000"}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline" />
              </div>

              <div>
                <label className="block text-label-medium text-neutral-700 mb-1.5">Condition (Trigger)</label>
                <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline bg-white">
                  <option value="sibling_count">Sibling Enrolment</option>
                  <option value="early_payment">Early Payment</option>
                  <option value="manual">Manual Application</option>
                </select>
              </div>

              {formData.condition === "sibling_count" && (
                <div>
                  <label className="block text-label-medium text-neutral-700 mb-1.5">Apply to which child?</label>
                  <select value={formData.conditionValue} onChange={e => setFormData({...formData, conditionValue: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline bg-white">
                    <option value="2">2nd Child Onward</option>
                    <option value="3">3rd Child Onward</option>
                  </select>
                </div>
              )}

              {formData.condition === "early_payment" && (
                <div>
                  <label className="block text-label-medium text-neutral-700 mb-1.5">Cutoff Date</label>
                  <input type="date" value={formData.conditionValue} onChange={e => setFormData({...formData, conditionValue: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline" />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-label-medium text-neutral-700 mb-1.5">Scope (Who does this apply to?)</label>
                <select value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-body-medium focus:outline-2 focus:outline-primary/50 focus:outline-offset-1 focus:outline bg-white">
                  <option value="all_students">All Students in School</option>
                  <option value="specific_class">Specific Class Level</option>
                  <option value="specific_class_arm">Specific Class Arm</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-neutral-100">
              <button type="submit" disabled={isSubmitting || !formData.value}
                className="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-label-large hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSubmitting ? "Saving Rule..." : "Save Discount Rule"}
              </button>
            </div>
          </form>
        </div>
        <div className="xl:col-span-1">{renderPreview()}</div>
      </div>
    </div>
  );
}
