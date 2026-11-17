// Sample accounts. Lives next to the page so the existing "../../data" exports stay untouched.
// Replace with your API data later.

export type AccountRole = "admin" | "staff" | "intern";
export type AccountStatus = "active" | "pending" | "deactivated";

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  status: AccountStatus;
  lastActive: string;
  added: string;
}

export const accounts: AccountRow[] = [
  {
    id: "ACC-1001",
    name: "John Reyes",
    email: "john.reyes@example.com",
    role: "admin",
    status: "active",
    lastActive: "Just now",
    added: "Jan 12, 2026",
  },
  {
    id: "ACC-1002",
    name: "Maria Santos",
    email: "maria.santos@example.com",
    role: "admin",
    status: "active",
    lastActive: "2 hours ago",
    added: "Jan 12, 2026",
  },
  {
    id: "ACC-1003",
    name: "Paolo Cruz",
    email: "paolo.cruz@example.com",
    role: "staff",
    status: "active",
    lastActive: "Today, 9:14 AM",
    added: "Feb 03, 2026",
  },
  {
    id: "ACC-1004",
    name: "Ana Dizon",
    email: "ana.dizon@example.com",
    role: "staff",
    status: "active",
    lastActive: "Yesterday",
    added: "Feb 03, 2026",
  },
  {
    id: "ACC-1005",
    name: "Leo Garcia",
    email: "leo.garcia@example.com",
    role: "staff",
    status: "deactivated",
    lastActive: "Mar 18, 2026",
    added: "Feb 20, 2026",
  },
  {
    id: "ACC-1006",
    name: "Bea Lim",
    email: "bea.lim@example.com",
    role: "intern",
    status: "active",
    lastActive: "Today, 8:02 AM",
    added: "Jun 01, 2026",
  },
  {
    id: "ACC-1007",
    name: "Carlo Mendoza",
    email: "carlo.mendoza@example.com",
    role: "intern",
    status: "active",
    lastActive: "3 days ago",
    added: "Jun 01, 2026",
  },
  {
    id: "ACC-1008",
    name: "Isabel Tan",
    email: "isabel.tan@example.com",
    role: "intern",
    status: "pending",
    lastActive: "Never",
    added: "Oct 28, 2026",
  },
  {
    id: "ACC-1009",
    name: "Miguel Ramos",
    email: "miguel.ramos@example.com",
    role: "staff",
    status: "pending",
    lastActive: "Never",
    added: "Oct 30, 2026",
  },
  {
    id: "ACC-1010",
    name: "Rica Flores",
    email: "rica.flores@example.com",
    role: "staff",
    status: "active",
    lastActive: "5 hours ago",
    added: "Mar 14, 2026",
  },
  {
    id: "ACC-1011",
    name: "Dan Villanueva",
    email: "dan.villanueva@example.com",
    role: "intern",
    status: "deactivated",
    lastActive: "Sep 05, 2026",
    added: "Jun 01, 2026",
  },
  {
    id: "ACC-1012",
    name: "Trisha Aquino",
    email: "trisha.aquino@example.com",
    role: "staff",
    status: "active",
    lastActive: "Yesterday",
    added: "Apr 22, 2026",
  },
  {
    id: "ACC-1013",
    name: "Joel Navarro",
    email: "joel.navarro@example.com",
    role: "intern",
    status: "active",
    lastActive: "Today, 7:40 AM",
    added: "Aug 11, 2026",
  },
  {
    id: "ACC-1014",
    name: "Camille Ong",
    email: "camille.ong@example.com",
    role: "admin",
    status: "active",
    lastActive: "Today, 10:05 AM",
    added: "Mar 02, 2026",
  },
];
