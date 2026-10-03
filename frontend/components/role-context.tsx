"use client";
import { createContext, useContext } from "react";

export type Role = "ADMIN" | "STAFF";

export const RoleContext = createContext<Role | null>(null);

/** Role of the signed-in user; null only before the admin shell has verified the session. */
export function useRole() {
  return useContext(RoleContext);
}
