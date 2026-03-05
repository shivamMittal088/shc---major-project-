import { api } from "@/lib/api";
import { User } from "@/types/user.type";

export async function getMe() {
  return (await api.get("api/users/me", "no-store")) as User;
}
