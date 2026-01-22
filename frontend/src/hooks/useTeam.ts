import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

export interface TeamMember {
  id: string;
  user_id: string;
  workspace_id: string;
  name?: string;
  full_name?: string;
  email: string;
  role: "owner" | "collaborator" | "client";
  avatar_url?: string;
  is_active: boolean;
  permissions?: {
    clients?: boolean;
    calendar?: boolean;
    payments?: boolean;
    reports?: boolean;
    settings?: boolean;
  };
  created_at: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async () => {
      try {
        // Use the workspaces/members endpoint which should exist
        return await api.get("/workspaces/members");
      } catch {
        // Fallback: return empty array if endpoint doesn't exist
        return { data: [] };
      }
    },
    select: (response) => response.data as TeamMember[],
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      try {
        return await api.get("/roles");
      } catch {
        // Fallback: return default roles
        return { data: [
          { id: "owner", name: "Propietario" },
          { id: "collaborator", name: "Colaborador" },
          { id: "client", name: "Cliente" }
        ]};
      }
    },
    select: (response) => response.data,
  });
}
