"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Check,
  AlertTriangle,
  Link2,
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  FileText,
  User,
} from "lucide-react";
import Select from "@/components/admin/shared/select";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";
import { formatNaira } from "@/lib/utils";
import StudentActivities from "@/components/admin/students/student-activities";

interface ParentLink {
  id: string;
  relationshipType: string;
  isPrimaryContact: boolean;
  receivesInvoiceNotifications: boolean;
  parent: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gender: string | null;
  dateOfBirth: string | null;
  status: string;
  classLevel: { name: string };
  classArm: { name: string };
  parents: ParentLink[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  finalAmount: number;
  amountPaid: number;
  balanceDue: number;
  term: {
    name: string;
    session: { name: string };
  };
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationshipType, setRelationshipType] = useState("Guardian");
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);
  const [receivesInvoiceNotifications, setReceivesInvoiceNotifications] = useState(true);
  const [linkToRemove, setLinkToRemove] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/students").then((r) => r.json()),
      fetch(`/api/admin/invoices?studentId=${studentId}`).then((r) => r.json()),
      fetch("/api/admin/parents").then((r) => r.json()),
    ])
      .then(([studentData, invoiceData, parentData]) => {
        const students: Student[] = studentData.data || [];
        const found = students.find((s) => s.id === studentId);
        setStudent(found || null);
        setInvoices(invoiceData.data || []);
        setParents(parentData.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Load failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/parents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: selectedParentId,
          studentId,
          relationshipType,
          isPrimaryContact,
          receivesInvoiceNotifications,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to link parent");

      setSuccess("Parent successfully linked to ward.");
      setSelectedParentId("");
      setRelationshipType("Guardian");
      setIsPrimaryContact(true);
      setReceivesInvoiceNotifications(true);
      setShowLinkModal(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRemoveLink = async () => {
    if (!linkToRemove) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/parents/link?id=${linkToRemove}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to unlink parent");

      setSuccess("Parent unlinked successfully.");
      setLinkToRemove(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-50 text-green-700 border-green-200",
      inactive: "bg-neutral-50 text-neutral-500 border-neutral-200",
    };
    return (
      <span
        className={`inline-flex px-2.5 py-1 rounded text-body-small font-bold border ${colors[status] || colors.inactive}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const invoiceStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-neutral-50 text-neutral-500 border-neutral-200",
      issued: "bg-blue-50 text-blue-700 border-blue-200",
      partial: "bg-amber-50 text-amber-700 border-amber-200",
      paid: "bg-green-50 text-green-700 border-green-200",
      overdue: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <span
        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border uppercase ${colors[status] || colors.draft}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Loading student profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-8">
        <button
          onClick={() => router.push("/admin/students")}
          className="inline-flex items-center gap-1.5 text-body-small text-neutral-500 hover:text-neutral-900 font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </button>
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-12 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-title-small text-neutral-900 font-bold mb-2">Student Not Found</h2>
          <p className="text-body-medium text-neutral-500">
            The student profile you are looking for does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <button
        onClick={() => router.push("/admin/students")}
        className="inline-flex items-center gap-1.5 text-body-small text-neutral-500 hover:text-neutral-900 font-bold transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Students
      </button>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-green-50 text-green-700 text-body-small border border-green-200">
          <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-headline-small text-neutral-900 font-bold">
                {student.lastName}, {student.firstName}
              </h1>
              <p className="text-body-medium text-neutral-500 font-mono tabular-nums">
                {student.admissionNumber}
              </p>
            </div>
            {statusBadge(student.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-body-small text-neutral-500 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Class Level
              </p>
              <p className="text-body-medium text-neutral-900 font-bold">{student.classLevel.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-body-small text-neutral-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Class Arm
              </p>
              <p className="text-body-medium text-neutral-900 font-bold">{student.classArm.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-body-small text-neutral-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Gender
              </p>
              <p className="text-body-medium text-neutral-900 font-bold">{student.gender || "Not Set"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-body-small text-neutral-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Date of Birth
              </p>
              <p className="text-body-medium text-neutral-900 font-bold">
                {student.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Not Set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="text-title-small text-neutral-900 font-bold">Linked Parents</h2>
            <p className="text-body-small text-neutral-500">Parental relationships for this student</p>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition"
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Parent
          </button>
        </div>

        <div className="p-6">
          {student.parents.length > 0 ? (
            <div className="space-y-3">
              {student.parents.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-lg"
                >
                  <div className="space-y-1.5">
                    <div className="font-bold text-neutral-900">
                      {link.parent.firstName} {link.parent.lastName}
                      <span className="font-normal text-neutral-500 ml-2 text-body-small">
                        ({link.relationshipType})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-body-small text-neutral-500">
                      <Phone className="w-3 h-3" />
                      {link.parent.phone}
                    </div>
                    {link.parent.email && (
                      <div className="flex items-center gap-1.5 text-body-small text-neutral-500">
                        <Mail className="w-3 h-3" />
                        {link.parent.email}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1">
                      {link.isPrimaryContact && (
                        <span className="inline-flex px-2 py-0.5 rounded bg-primary-light text-primary text-[9px] font-bold uppercase border border-primary/20">
                          Primary Contact
                        </span>
                      )}
                      {link.receivesInvoiceNotifications && (
                        <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold uppercase border border-blue-200">
                          Invoice Notifications
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setLinkToRemove(link.id)}
                    className="text-body-small text-error hover:underline font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 text-amber-800 text-body-small border border-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold mb-1">No parent linked</p>
                <p>
                  No parent linked — this student can receive invoices, but no parent will be
                  available for payment communication until one is linked.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-lg overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-title-small text-neutral-900 font-bold">Link Parent to Ward</h3>
                <p className="text-body-small text-neutral-500">
                  Student: {student.firstName} {student.lastName} ({student.admissionNumber})
                </p>
              </div>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {student.parents.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-label-medium text-neutral-900 block font-bold">
                    Currently Linked Parents
                  </h4>
                  <div className="space-y-2">
                    {student.parents.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-body-medium text-neutral-800"
                      >
                        <div>
                          <div className="font-bold">
                            {link.parent.firstName} {link.parent.lastName} ({link.relationshipType})
                          </div>
                          <div className="text-body-small text-neutral-500">{link.parent.phone}</div>
                        </div>
                        <button
                          onClick={() => {
                            setShowLinkModal(false);
                            setLinkToRemove(link.id);
                          }}
                          className="text-body-small text-error hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleLinkParent} className="space-y-4 pt-4 border-t border-neutral-200">
                <h4 className="text-label-medium text-neutral-950 font-bold block">Link a Parent Profile</h4>

                <Select
                  required
                  label="Select Parent *"
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                >
                  <option value="">Choose parent...</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.lastName}, {p.firstName} ({p.phone})
                    </option>
                  ))}
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    required
                    label="Relationship Type *"
                    value={relationshipType}
                    onChange={(e) => setRelationshipType(e.target.value)}
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sponsor">Sponsor</option>
                    <option value="Other">Other</option>
                  </Select>

                  <div className="space-y-3 pt-6">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="link-primary-check"
                        checked={isPrimaryContact}
                        onChange={(e) => setIsPrimaryContact(e.target.checked)}
                        className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
                      />
                      <label htmlFor="link-primary-check" className="text-body-small text-neutral-600 select-none">
                        Primary Contact
                      </label>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="link-notification-check"
                        checked={receivesInvoiceNotifications}
                        onChange={(e) => setReceivesInvoiceNotifications(e.target.checked)}
                        className="w-4 h-4 border border-neutral-300 rounded text-primary focus:ring-primary focus:outline-none"
                      />
                      <label htmlFor="link-notification-check" className="text-body-small text-neutral-600 select-none">
                        Receives invoice alerts
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || parents.length === 0}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2 shadow"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Link Parent to Ward
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <StudentActivities studentId={studentId} />

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-title-small text-neutral-900 font-bold">Invoice History</h2>
          <p className="text-body-small text-neutral-500">All invoices for this student</p>
        </div>

        {invoices.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                <th className="px-6 py-3 font-semibold">Invoice #</th>
                <th className="px-6 py-3 font-semibold">Term</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Paid</th>
                <th className="px-6 py-3 font-semibold">Balance</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-mono text-neutral-500 tabular-nums">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4">
                    {inv.term.session.name} — {inv.term.name}
                  </td>
                  <td className="px-6 py-4 font-bold">{formatNaira(inv.finalAmount)}</td>
                  <td className="px-6 py-4">{formatNaira(inv.amountPaid)}</td>
                  <td className="px-6 py-4 font-bold">{formatNaira(inv.balanceDue)}</td>
                  <td className="px-6 py-4">{invoiceStatusBadge(inv.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-neutral-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
            <p className="text-body-medium">No invoices generated for this student yet.</p>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={linkToRemove !== null}
        onClose={() => setLinkToRemove(null)}
        onConfirm={confirmRemoveLink}
        title="Break Parent-Ward Link"
        description="Are you sure you want to break this parent-ward link? The student will no longer be associated with this parent, and parent invoice alerts will stop."
        variant="destructive"
        isLoading={actionLoading}
      />
    </div>
  );
}
