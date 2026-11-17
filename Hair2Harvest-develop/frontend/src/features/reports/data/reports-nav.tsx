// Sidebar links for the Reports section. Built from REPORT_CATEGORIES so adding a category
// in reports-data.ts adds it to the sidebar dropdown automatically.
import { REPORT_CATEGORIES, type ReportCategory } from "./reports-data";

export const REPORTS_HREF = "/reports";
export const DEFAULT_REPORT_CATEGORY: ReportCategory = "collection";

export const reportsHref = (category: ReportCategory) =>
  `${REPORTS_HREF}/${category}`;

export const reportLinks = REPORT_CATEGORIES.map((category) => ({
  value: category.id,
  label: category.label,
  href: reportsHref(category.id),
}));

export const isReportCategory = (
  value: string | null | undefined,
): value is ReportCategory =>
  REPORT_CATEGORIES.some((category) => category.id === value);

/** True on /reports and everything under it. */
export const isReportsSection = (pathname: string) =>
  pathname === REPORTS_HREF || pathname.startsWith(`${REPORTS_HREF}/`);

/** The category the path points at. A bare /reports shows the default category. */
export function getActiveReportCategory(
  pathname: string,
): ReportCategory | null {
  if (!isReportsSection(pathname)) return null;
  const segment = pathname.split("/")[2];
  return isReportCategory(segment) ? segment : DEFAULT_REPORT_CATEGORY;
}
