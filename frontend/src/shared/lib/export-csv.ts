type Column<T> = { key: keyof T & string; label: string };

const escape = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Downloads rows as CSV. The BOM keeps Excel from mangling non-ASCII names. */
export function exportCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: Column<T>[],
) {
  const header = columns.map((column) => escape(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escape(row[column.key])).join(","),
  );
  const csv = `\uFEFF${[header, ...body].join("\r\n")}`;

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
