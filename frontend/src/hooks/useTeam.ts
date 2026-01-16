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
    queryFn: async () => api.get("/roles/workspace-members"),
    select: (response) => response.data as TeamMember[],
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => api.get("/roles"),
    select: (response) => response.data,
  });
}
