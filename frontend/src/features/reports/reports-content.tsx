// features/reports/components/reports-content.tsx
import { useState } from "react";
import {
  Calendar,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  REPORT_CATEGORIES,
  mockBatches,
  mockGeneratedReports,
  mockShops,
  type ExportFormat,
  type ReportCategory,
  type ReportStatus,
} from "./data/reports-data.tsx";

export function ReportsContent() {
  const [activeCategory, setActiveCategory] =
    useState<ReportCategory>("collection");
  const [selectedShop, setSelectedShop] = useState("All Shops");
  const [selectedBatch, setSelectedBatch] = useState("All Batches");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logic
  const filteredReports = mockGeneratedReports.filter((report) => {
    const matchesCategory = report.category === activeCategory;
    const matchesShop =
      selectedShop === "All Shops" || report.shopName === selectedShop;
    const matchesBatch =
      selectedBatch === "All Batches" || report.batchId === selectedBatch;
    const matchesSearch = report.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesShop && matchesBatch && matchesSearch;
  });

  const handleExport = (format: ExportFormat) => {
    // Mock export function
    alert(`Exporting ${activeCategory} report as ${format}...`);
  };

  const StatusBadge = ({ status }: { status: ReportStatus }) => {
    const styles = {
      completed: "bg-success/10 text-success",
      processing: "bg-primary/10 text-primary",
      failed: "bg-destructive/10 text-destructive",
    };
    return (
      <span
        className={`inline-flex items-center rounded-xl px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-10 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Reporting Center</h1>
          <p className="text-lg text-muted-foreground">
            Generate, filter, and export operational data.
          </p>
        </div>

        {/* EXPORT BUTTON */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <FileDown className="size-4" /> Export Current View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleExport("CSV")}
              className="gap-2 cursor-pointer"
            >
              <FileText className="size-4" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("PDF")}
              className="gap-2 cursor-pointer"
            >
              <FileText className="size-4 text-red-500" /> Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("Excel")}
              className="gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="size-4 text-green-600" /> Export as
              Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* CATEGORY TABS */}
      <div className="flex overflow-x-auto border-b pb-px hide-scrollbar">
        <div className="flex gap-6">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeCategory === cat.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTERS ROW */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Date Range */}
          <Button variant="outline" className="h-9 gap-2 text-muted-foreground">
            <Calendar className="size-4" /> Last 30 Days
          </Button>

          {/* Shop Filter */}
          <select
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            {mockShops.map((shop) => (
              <option key={shop} value={shop}>
                {shop}
              </option>
            ))}
          </select>

          {/* Batch Filter */}
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            {mockBatches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Name</TableHead>
              <TableHead>Shop / Location</TableHead>
              <TableHead>Date Generated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No reports found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.name}
                    <p className="text-xs text-muted-foreground font-normal">
                      {report.id}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.shopName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.dateGenerated}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={report.status !== "completed"}
                    >
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
