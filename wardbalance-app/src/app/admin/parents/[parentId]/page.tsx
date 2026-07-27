"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  FileText,
  GraduationCap,
  Bell,
} from "lucide-react";
import { formatNaira } from "@/lib/utils";
import { InvoiceStatusBadge } from "@/components/admin/shared/status-badge";

interface WardLink {
  id: string;
  relationshipType: string;
  isPrimaryContact: boolean;
  receivesInvoiceNotifications: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classLevel: { name: string };
    classArm: { name: string };
  };
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  wards: WardLink[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  status: string;
  finalAmount: number;
  amountPaid: number;
  balanceDue: number;
  term: {
    name: string;
    session: { name: string };
  };
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
  };
}

export default function ParentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const parentId = params.parentId as string;

  const [loading, setLoading] = useState(true);
  const [parent, setParent] = useState<Parent | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const loadData = () => {
    setLoading(true);
    // Fetch parent by ID (efficient — single record, not all parents)
    fetch(`/api/admin/parents/${parentId}`)
      .then((r) => r.json())
      .then((parentData) => {
        const found: Parent | null = parentData.data || null;
        setParent(found);

        if (!found) {
          setLoading(false);
          return;
        }

        // Fetch invoices per ward using studentId filter
        const wardIds = found.wards.map((w) => w.student.id);
        if (wardIds.length === 0) {
          setLoading(false);
          return;
        }

        const invoicePromises = wardIds.map((sid) =>
          fetch(`/api/admin/invoices?studentId=${sid}`)
            .then((r) => r.json())
            .then((d) => d.data || [])
        );

        return Promise.all(invoicePromises).then((nestedInvoices) => {
          setInvoices(nestedInvoices.flat());
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error("Load failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [parentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Loading parent profile...</p>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => router.push("/admin/parents")}
          className="inline-flex items-center gap-1.5 text-body-small text-neutral-500 hover:text-neutral-900 font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Parents
        </button>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-title-small text-neutral-900 font-bold mb-2">Parent Not Found</h2>
          <p className="text-body-medium text-neutral-500">
            The parent profile you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const wardIds = parent.wards.map((w) => w.student.id);
  const wardInvoices = invoices.filter((inv) => wardIds.includes(inv.studentId));

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.push("/admin/parents")}
        className="inline-flex items-center gap-1.5 text-body-small text-neutral-500 hover:text-neutral-900 font-bold transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Parents
      </button>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <h1 className="text-headline-small text-neutral-900 font-bold">
            {parent.lastName}, {parent.firstName}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-body-medium text-neutral-800">
                <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>{parent.phone}</span>
              </div>
              {parent.email && (
                <div className="flex items-center gap-2 text-body-medium text-neutral-800">
                  <Mail className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>{parent.email}</span>
                </div>
              )}
              {parent.address && (
                <div className="flex items-start gap-2 text-body-medium text-neutral-800">
                  <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                  <span>{parent.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-title-small text-neutral-900 font-bold">Linked Wards</h2>
          <p className="text-body-small text-neutral-500">Students linked to this parent</p>
        </div>

        {parent.wards.length > 0 ? (
          <div className="divide-y divide-neutral-200">
            {parent.wards.map((ward) => (
              <div key={ward.id} className="px-6 py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-bold text-neutral-900">
                    {ward.student.lastName}, {ward.student.firstName}
                    <span className="font-normal text-neutral-500 ml-2 text-body-small">
                      ({ward.student.admissionNumber})
                    </span>
                  </div>
                  <div className="text-body-small text-neutral-500">
                    <GraduationCap className="w-3 h-3 inline mr-1" />
                    {ward.student.classLevel.name} — {ward.student.classArm.name}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="inline-flex px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px] font-bold border border-neutral-200">
                      {ward.relationshipType}
                    </span>
                    {ward.isPrimaryContact && (
                      <span className="inline-flex px-2 py-0.5 rounded bg-primary-light text-primary text-[10px] font-bold uppercase border border-primary/20">
                        Primary Contact
                      </span>
                    )}
                    {ward.receivesInvoiceNotifications && (
                      <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase border border-blue-200">
                        <Bell className="w-2.5 h-2.5 inline mr-0.5" />
                        Notifications
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-neutral-400">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-body-medium">No wards linked to this parent.</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-title-small text-neutral-900 font-bold">Invoice Activity</h2>
          <p className="text-body-small text-neutral-500">Recent invoices across all wards</p>
        </div>

        {wardInvoices.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Invoice #</th>
                <th className="px-6 py-3 font-semibold">Student</th>
                <th className="px-6 py-3 font-semibold">Term</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Paid</th>
                <th className="px-6 py-3 font-semibold">Balance</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {wardInvoices.map((inv) => (
                <tr key={inv.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-mono text-neutral-500 tabular-nums">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 font-bold text-neutral-900">
                    {inv.student.lastName}, {inv.student.firstName}
                  </td>
                  <td className="px-6 py-4">
                    {inv.term.session.name} — {inv.term.name}
                  </td>
                  <td className="px-6 py-4 font-bold">{formatNaira(inv.finalAmount)}</td>
                  <td className="px-6 py-4">{formatNaira(inv.amountPaid)}</td>
                  <td className="px-6 py-4 font-bold">{formatNaira(inv.balanceDue)}</td>
                  <td className="px-6 py-4"><InvoiceStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-neutral-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-body-medium">No invoices found for this parent's wards.</p>
          </div>
        )}
      </div>
    </div>
  );
}
