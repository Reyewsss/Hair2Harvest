import { api } from "@/shared/lib/api";
import { createResourceStore } from "@/shared/lib/resource";

type SessionUser = {
  name: string;
  email: string;
  role?: string;
};

const store = createResourceStore(async () => {
  const data = await api.get<{ user: SessionUser }>("/api/auth/check-auth");
  return data.user;
}, { name: "", email: "", role: "" } as SessionUser);

/** The signed-in user, as returned by the API session. */
export function useCurrentUser() {
  const { data } = store.useResource();

  const initials = data.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    name: data.name || "Signed in",
    email: data.email,
    role: data.role,
    initials: initials || "—",
  };
}
