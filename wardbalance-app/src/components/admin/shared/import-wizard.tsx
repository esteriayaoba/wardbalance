"use client";

import { useState, useRef } from "react";
import { Loader2, UploadCloud, CheckCircle2, ChevronRight, FileSpreadsheet, ArrowLeft, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react";
import Select from "./select";

interface FieldMapping {
  targetField: string;
  label: string;
  required: boolean;
}

interface ImportWizardProps {
  type: "student" | "parent";
  fields: FieldMapping[];
  onComplete: () => void;
  onClose: () => void;
}

// Hand-rolled CSV parser that handles quotes, escaping, and line breaks
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      lines.push(row.map((val) => val.trim()));
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row.map((val) => val.trim()));
  }
  return lines.filter((l) => l.some((cell) => cell !== ""));
}

export default function ImportWizard({ type, fields, onComplete, onClose }: ImportWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState("");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  
  // Maps targetField -> CSV Header Index
  const [mappings, setMappings] = useState<Record<string, number>>({});
  
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<{
    imported: number;
    skipped: number;
    skippedDetails: { row: number; reason: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);

        if (parsed.length < 2) {
          throw new Error("CSV file must contain a header row and at least one data row.");
        }

        const headers = parsed[0] || [];
        setCsvHeaders(headers);
        setCsvData(parsed.slice(1));

        // Auto-map headers based on similar names
        const initialMappings: Record<string, number> = {};
        fields.forEach((field) => {
          const matchIndex = headers.findIndex(
            (h) =>
              h.toLowerCase().replace(/[^a-z]/g, "") ===
              field.label.toLowerCase().replace(/[^a-z]/g, "") ||
              h.toLowerCase().replace(/[^a-z]/g, "") ===
              field.targetField.toLowerCase().replace(/[^a-z]/g, "")
          );
          if (matchIndex !== -1) {
            initialMappings[field.targetField] = matchIndex;
          }
        });
        setMappings(initialMappings);

        setStep(2);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (field: string, index: number) => {
    setMappings((prev) => ({
      ...prev,
      [field]: index,
    }));
  };

  const validateMappings = () => {
    setError(null);
    // Ensure all required fields are mapped
    const unmappedRequired = fields.filter((f) => f.required && mappings[f.targetField] === undefined);

    if (unmappedRequired.length > 0) {
      setError(`Please map all required fields: ${unmappedRequired.map((f) => f.label).join(", ")}`);
      return;
    }
    setStep(3);
  };

  // Build rows based on header mapping mappings
  const getMappedRows = (limit?: number) => {
    const dataToMap = limit ? csvData.slice(0, limit) : csvData;
    return dataToMap.map((row) => {
      const mappedRow: Record<string, string> = {};
      fields.forEach((field) => {
        const idx = mappings[field.targetField];
        mappedRow[field.targetField] = idx !== undefined ? row[idx] || "" : "";
      });
      return mappedRow;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);

    const payloadRows = getMappedRows();
    const endpoint = type === "student" ? "/api/admin/students/import" : "/api/admin/parents/import";
    const bodyKey = type === "student" ? "students" : "parents";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [bodyKey]: payloadRows }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to execute import");
      }

      setSummary(body.data);
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to execute import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Wizard Header */}
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h3 className="text-title-small text-neutral-900 font-bold capitalize">
            Bulk Import {type}s
          </h3>
          <p className="text-body-small text-neutral-500">
            {step === 1 && "Select your CSV file"}
            {step === 2 && "Map CSV columns to database fields"}
            {step === 3 && "Preview mapped import details"}
            {step === 4 && "Bulk import completed summary"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-body-small text-neutral-500 hover:text-neutral-900 font-bold"
        >
          Cancel
        </button>
      </div>

      {/* Progress Tracker Bar */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-3 flex items-center justify-center gap-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === s
                ? "bg-primary text-white"
                : step > s
                ? "bg-green-100 text-green-700"
                : "bg-neutral-200 text-neutral-500"
            }`}>
              {s}
            </span>
            <span className={`text-[11px] font-bold ${step === s ? "text-primary" : "text-neutral-500"}`}>
              {s === 1 && "Upload"}
              {s === 2 && "Mapping"}
              {s === 3 && "Preview"}
              {s === 4 && "Summary"}
            </span>
            {s < 4 && <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
          </div>
        ))}
      </div>

      {/* Step Body */}
      <div className="p-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-error-container text-on-error-container text-body-small mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 rounded-xl p-12 hover:border-primary transition cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />
            <UploadCloud className="w-12 h-12 text-neutral-400 mb-4" />
            <h4 className="text-title-small text-neutral-900 font-bold mb-1">
              Select or Drag CSV File
            </h4>
            <p className="text-body-small text-neutral-500 text-center max-w-sm mb-4">
              Your file must contain columns corresponding to the {type} properties (headers required).
            </p>
            <button className="px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-label-large font-bold hover:bg-neutral-800 transition">
              Choose File
            </button>
          </div>
        )}

        {/* STEP 2: MAPPING */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200 flex items-center justify-between gap-4">
              <span className="text-body-medium font-bold text-neutral-700 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                {fileName} ({csvData.length} records parsed)
              </span>
              <button
                onClick={() => {
                  setStep(1);
                  setFileName("");
                }}
                className="text-body-small text-primary hover:underline font-bold inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Change File
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-title-small text-neutral-950 font-bold">Map Target Fields</h4>
              <div className="grid grid-cols-1 gap-4">
                {fields.map((field) => (
                  <div key={field.targetField} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-neutral-100">
                    <div>
                      <span className="text-body-medium font-bold text-neutral-900">
                        {field.label} {field.required && <span className="text-error">*</span>}
                      </span>
                      <p className="text-[11px] text-neutral-400 capitalize">Target Database Field: {field.targetField}</p>
                    </div>

                    <Select
                      value={mappings[field.targetField] !== undefined ? mappings[field.targetField] : ""}
                      onChange={(e) =>
                        handleMappingChange(
                          field.targetField,
                          e.target.value === "" ? -1 : Number(e.target.value)
                        )
                      }
                      className="w-full sm:w-64"
                    >
                      <option value="">-- Skip Field --</option>
                      {csvHeaders.map((header, idx) => (
                        <option key={idx} value={idx}>
                          CSV Header: {header}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                onClick={validateMappings}
                className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition shadow"
              >
                Preview Mapped Records
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {step === 3 && (
          <div className="space-y-6">
            <h4 className="text-title-small text-neutral-950 font-bold">
              Preview Mapped Records (First 20 rows of {csvData.length} records)
            </h4>

            <div className="border border-neutral-200 rounded-lg overflow-x-auto max-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                  <tr>
                    <th className="px-4 py-2 bg-neutral-50">Row</th>
                    {fields.map((field) => (
                      <th key={field.targetField} className="px-4 py-2 bg-neutral-50">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {getMappedRows(20).map((row, idx) => (
                    <tr key={idx} className="text-body-small text-neutral-800 hover:bg-neutral-50/50">
                      <td className="px-4 py-2 font-medium text-neutral-400">{idx + 1}</td>
                      {fields.map((field) => (
                        <td key={field.targetField} className="px-4 py-2 truncate max-w-[150px]">
                          {String(row[field.targetField]) || <span className="text-neutral-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-6 border-t border-neutral-200 flex justify-between items-center gap-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg text-body-small font-bold hover:bg-neutral-50 transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Mapping
              </button>

              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2.5 bg-primary text-white hover:bg-primary-dark font-bold text-label-large rounded-lg transition inline-flex items-center gap-2 shadow"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Import...
                  </>
                ) : (
                  `Execute Import (${csvData.length} records)`
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY */}
        {step === 4 && summary && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-700 border border-green-200 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-headline-small text-neutral-950 font-bold">Import Completed!</h4>
              <p className="text-body-medium text-neutral-600 mt-2">
                Successfully processed CSV input and updated the database record registry.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-center">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Imported</p>
                <p className="text-headline-medium text-green-950 font-bold tabular-nums">{summary.imported}</p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">Skipped</p>
                <p className="text-headline-medium text-amber-950 font-bold tabular-nums">{summary.skipped}</p>
              </div>
            </div>

            {summary.skippedDetails.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-title-small text-neutral-900 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Skipped Records Details ({summary.skippedDetails.length})
                </h4>

                <div className="border border-neutral-200 rounded-lg max-h-[200px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 text-label-medium text-neutral-500">
                      <tr>
                        <th className="px-4 py-2 bg-neutral-50 w-20">CSV Row</th>
                        <th className="px-4 py-2 bg-neutral-50">Reason for Skipping</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-body-small text-neutral-700">
                      {summary.skippedDetails.map((skip, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-2 font-mono text-neutral-400 tabular-nums">Row {skip.row}</td>
                          <td className="px-4 py-2 text-neutral-900">{skip.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-6 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="px-6 py-2.5 bg-neutral-950 text-white rounded-lg text-label-large font-bold hover:bg-neutral-800 transition"
              >
                Close & Refresh Registry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
