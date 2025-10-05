"use client";

interface ExportProps {
  departmentIds?: number[];
  projectIds?: number[];
  startDate?: string;
  endDate?: string;
}

export function ExportButtons({ departmentIds = [], projectIds = [], startDate, endDate }: ExportProps) {
  const handleExport = async (format: "pdf" | "xlsx") => {
    try {
      const params = new URLSearchParams({
        action: "export",
        departmentIds: departmentIds.join(","),
        projectIds: projectIds.join(","),
        startDate: startDate || "",
        endDate: endDate || "",
        format,
      });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to export report");
      const json = await res.json();

      if (!json?.buffer) return;

      const blob = new Blob([json.buffer], { type: json.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => handleExport("pdf")} className="btn btn-primary">
        Export PDF
      </button>
      <button onClick={() => handleExport("xlsx")} className="btn btn-secondary">
        Export Excel
      </button>
    </div>
  );
}
