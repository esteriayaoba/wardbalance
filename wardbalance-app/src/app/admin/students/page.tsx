"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Upload, Link2, AlertTriangle, Check, AlertCircle, Search, UserCheck } from "lucide-react";
import ImportWizard from "@/components/admin/shared/import-wizard";
import PaginationBar from "@/components/admin/shared/pagination-bar";
import ConfirmationDialog from "@/components/admin/shared/confirmation-dialog";
import Input from "@/components/admin/shared/input";
import Select from "@/components/admin/shared/select";

interface ParentLink {
  id: string;
  relationshipType: string;
  isPrimaryContact: boolean;
  receivesInvoiceNotifications: boolean;
  parent: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classLevelId: string;
  classArmId: string;
  gender: string | null;
  status: string;
  classLevel: { name: string };
  classArm: { name: string };
  parents: ParentLink[];
}

interface ClassArm {
  id: string;
  classLevelId: string;
  name: string;
}

interface ClassLevel {
  id: string;
  divisionId: string;
  name: string;
  classArms: ClassArm[];
}

interface Division {
  id: string;
  name: string;
  classLevels: ClassLevel[];
}

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevelId, setFilterLevelId] = useState("");
  const [filterArmId, setFilterArmId] = useState("");

  // UI state overlays
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [linkingStudent, setLinkingStudent] = useState<Student | null>(null);
  const [linkToRemove, setLinkToRemove] = useState<string | null>(null);

  // Forms manual add student
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classLevelId, setClassLevelId] = useState("");
  const [classArmId, setClassArmId] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Forms link parent
  const [selectedParentId, setSelectedParentId] = useState("");
  const [relationshipType, setRelationshipType] = useState("Guardian");
  const [isPrimaryContact, setIsPrimaryContact] = useState(true);
  const [receivesInvoiceNotifications, setReceivesInvoiceNotifications] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;

  useEffect(() => { setPage(1); }, [filterLevelId, filterArmId, searchQuery]);

  const loadData = () => {
    setLoading(true);
    const offset = (page - 1) * pageSize;
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
    if (searchQuery) params.set("search", searchQuery);
    if (filterLevelId) params.set("classLevelId", filterLevelId);
    if (filterArmId) params.set("classArmId", filterArmId);
    const studentUrl = `/api/admin/students?${params.toString()}`;
    Promise.all([
      fetch(studentUrl).then((r) => r.json()),
      fetch("/api/admin/academic/classes").then((r) => r.json()),
      fetch("/api/admin/parents").then((r) => r.json()),
    ])
      .then(([studentData, classData, parentData]) => {
        setStudents(studentData.data || []);
        setTotalRecords(studentData.meta?.total ?? 0);
        setDivisions(classData.data || []);
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
  }, [page, filterLevelId, filterArmId, searchQuery]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          admissionNumber: admissionNumber.trim(),
          classLevelId,
          classArmId,
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to register student");

      setSuccess("Student registered successfully.");
      setFirstName("");
      setLastName("");
      setAdmissionNumber("");
      setClassLevelId("");
      setClassArmId("");
      setGender("");
      setDateOfBirth("");
      setShowAddDrawer(false);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingStudent) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/parents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: selectedParentId,
          studentId: linkingStudent.id,
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
      setLinkingStudent(null);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveLink = (linkId: string) => {
    setLinkToRemove(linkId);
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
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
      setLinkToRemove(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-body-large text-neutral-600">Retrieving student directories...</p>
      </div>
    );
  }

  // Flatten levels & arms for selectors
  const flatClassLevels = divisions.flatMap((d) =>
    d.classLevels.map((l) => ({ id: l.id, name: `${d.name} — ${l.name}` }))
  );

  const flatClassArms = divisions.flatMap((d) =>
    d.classLevels.flatMap((l) =>
      l.classArms.map((a) => ({ id: a.id, levelId: l.id, name: `${l.name} — ${a.name}` }))
    )
  );

  // Available class arms based on selected level in manually add form
  const formAvailableArms = flatClassArms.filter((a) => a.levelId === classLevelId);

  // Student filtering logic
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = filterLevelId === "" || s.classLevelId === filterLevelId;
    const matchesArm = filterArmId === "" || s.classArmId === filterArmId;

    return matchesSearch && matchesLevel && matchesArm;
  });

  const importFields = [
    { targetField: "firstName", label: "First Name", required: true },
    { targetField: "lastName", label: "Last Name", required: true },
    { targetField: "admissionNumber", label: "Admission Number", required: true },
    { targetField: "classLevelName", label: "Class Level", required: true },
    { targetField: "classArmName", label: "Class Arm", required: true },
    { targetField: "gender", label: "Gender", required: false },
    { targetField: "dateOfBirth", label: "Date of Birth (YYYY-MM-DD)", required: false },
  ];

  return (
    <div className="space-y-8">
      {/* Header and CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-headline-small text-neutral-900 font-bold">Students Directory</h1>
          <p className="text-body-medium text-neutral-600">
            Manage student registrations, class arm allocations, and parental relationships.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportWizard(true)}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 bg-white rounded-lg text-body-small font-bold hover:bg-neutral-50 transition inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-neutral-500" />
            Import CSV
          </button>

          <button
            onClick={() => setShowAddDrawer(true)}
            className="px-4 py-2 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Messages */}
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

      {/* Import Wizard Popup Overlay */}
      {showImportWizard && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <ImportWizard
              type="student"
              fields={importFields}
              onComplete={() => loadData()}
              onClose={() => setShowImportWizard(false)}
            />
          </div>
        </div>
      )}

      {/* Parent-Ward Link Dialog Popup */}
      {linkingStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 w-full max-w-lg overflow-hidden shadow-xl z-10">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-title-small text-neutral-900 font-bold">
                  Link Parents to Ward
                </h3>
                <p className="text-body-small text-neutral-500">
                  Student: {linkingStudent.firstName} {linkingStudent.lastName} ({linkingStudent.admissionNumber})
                </p>
              </div>
              <button
                onClick={() => setLinkingStudent(null)}
                className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Currently Linked Parents list */}
              {linkingStudent.parents.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-label-medium text-neutral-900 block font-bold">Linked Parents</h4>
                  <div className="space-y-2">
                    {linkingStudent.parents.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-body-medium text-neutral-800"
                      >
                        <div>
                          <div className="font-bold">
                            {link.parent.firstName} {link.parent.lastName} ({link.relationshipType})
                          </div>
                          <div className="text-body-small text-neutral-500">
                            {link.parent.phone}
                            {link.isPrimaryContact && (
                              <span className="ml-2 inline-flex px-2 py-0.5 rounded bg-primary-light text-primary text-[9px] font-bold uppercase">
                                Primary Contact
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveLink(link.id)}
                          className="text-body-small text-error hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link Parent Form */}
              <form onSubmit={handleLinkParent} className="space-y-4 pt-4 border-t border-neutral-200">
                <h4 className="text-label-medium text-neutral-950 font-bold block">Link a Parent profile</h4>
                
                {/* Select Parent */}
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
                  {/* Relation Type */}
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

                  {/* Primary & Notifications Flags */}
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
                        Receives invoices alerts
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading || parents.length === 0}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2 shadow"
                >
                  Link Parent to Ward
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Register Student Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-8 shadow-xl flex flex-col justify-between border-l border-neutral-200 animate-fade-in-up">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
                <h3 className="text-title-small text-neutral-900 font-bold">Register Student</h3>
                <button
                  onClick={() => setShowAddDrawer(false)}
                  className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* First Name */}
                  <Input
                    type="text"
                    required
                    label="First Name *"
                    placeholder="e.g. David"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  {/* Last Name */}
                  <Input
                    type="text"
                    required
                    label="Last Name *"
                    placeholder="e.g. Johnson"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                {/* Admission Number */}
                <Input
                  type="text"
                  required
                  label="Admission Number *"
                  placeholder="e.g. ADM-0234"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                />

                {/* Select Class Level */}
                <Select
                  required
                  label="Class Level *"
                  value={classLevelId}
                  onChange={(e) => {
                    setClassLevelId(e.target.value);
                    setClassArmId("");
                  }}
                >
                  <option value="">Choose class level...</option>
                  {flatClassLevels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>

                {/* Select Class Arm */}
                <Select
                  required
                  disabled={!classLevelId}
                  label="Class Arm *"
                  value={classArmId}
                  onChange={(e) => setClassArmId(e.target.value)}
                >
                  <option value="">Choose class arm...</option>
                  {formAvailableArms.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>

                <div className="grid grid-cols-2 gap-4">
                  {/* Gender */}
                  <Select
                    label="Gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Select>
                  {/* DOB */}
                  <Input
                    type="date"
                    label="Date of Birth"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full px-4 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Register Student
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute w-4 h-4 text-neutral-400 left-3 top-3" />
          <Input
            type="text"
            placeholder="Search by name, admission no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto items-center">
          {/* Level Filter */}
          <Select
            value={filterLevelId}
            onChange={(e) => {
              setFilterLevelId(e.target.value);
              setFilterArmId("");
            }}
            className="shrink-0"
          >
            <option value="">All Class Levels</option>
            {flatClassLevels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>

          {/* Arm Filter */}
          <Select
            value={filterArmId}
            disabled={!filterLevelId}
            onChange={(e) => setFilterArmId(e.target.value)}
            className="shrink-0"
          >
            <option value="">All Arms</option>
            {flatClassArms
              .filter((a) => a.levelId === filterLevelId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
        </div>
      </div>

      {/* Unlinked Wards Alert banner */}
      {students.some((s) => s.parents.length === 0) && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 text-amber-800 text-body-small border border-amber-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            <strong>Attention:</strong> Some students in your registry have no parents linked. Invoices will be generated, but they will not be deliverable until relationships are established.
          </span>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
              <th className="px-6 py-3 font-semibold">Student Name</th>
              <th className="px-6 py-3 font-semibold">Admission No</th>
              <th className="px-6 py-3 font-semibold">Class / Level</th>
              <th className="px-6 py-3 font-semibold">Linked Parents</th>
              <th className="px-6 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredStudents.map((s) => {
              const hasParents = s.parents.length > 0;
              return (
                <tr key={s.id} className="text-body-medium text-neutral-800 hover:bg-neutral-50/50">
                  <td className="px-6 py-4 font-bold text-neutral-900">
                    {s.lastName}, {s.firstName}
                  </td>
                  <td className="px-6 py-4 font-mono text-neutral-500 tabular-nums">
                    {s.admissionNumber}
                  </td>
                  <td className="px-6 py-4">
                    {s.classLevel.name} — {s.classArm.name}
                  </td>
                  <td className="px-6 py-4">
                    {hasParents ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-50 text-green-700 text-body-small font-bold border border-green-200">
                        <UserCheck className="w-3.5 h-3.5 text-green-600" />
                        {s.parents.length} Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 text-body-small font-bold border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        No parent linked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setLinkingStudent(s)}
                      className="px-3 py-1.5 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-lg text-body-small font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Manage Links
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-400">
                  No students match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        currentPage={page}
        pageSize={pageSize}
        total={totalRecords}
        loading={loading}
        onPageChange={setPage}
      />

      {/* Confirmation Dialog for breaking links */}
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
