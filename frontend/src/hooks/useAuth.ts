import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, workspacesApi } from "../services/api";
import { useAuthStore } from "../stores/auth";

export function useAuth() {
  const navigate = useNavigate();
  const {
    setUser,
    setTokens,
    setWorkspace,
    logout: clearStore,
  } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Login through backend API
      const loginResponse = await authApi.login(email, password);
      const { access_token, refresh_token } = loginResponse.data;

      // Save tokens
      setTokens(access_token, refresh_token);

      // Get user profile from backend
      const userResponse = await authApi.me();
      setUser(userResponse.data);

      // Get workspaces and set current workspace
      try {
        const workspacesResponse = await workspacesApi.list();
        if (workspacesResponse.data.length > 0) {
          setWorkspace(workspacesResponse.data[0]);
        }
      } catch {
        console.log("No workspaces found");
      }

      notifications.show({
        title: "¡Bienvenido!",
        message: "Has iniciado sesión correctamente",
        color: "green",
      });

      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const message =
        err.response?.data?.detail || err.message || "Error al iniciar sesión";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    workspaceName: string
  ) => {
    setLoading(true);
    try {
      // Register through backend API (creates user in Supabase Auth AND our DB)
      const registerResponse = await authApi.register({
        email,
        password,
        full_name: fullName,
        workspace_name: workspaceName,
      });

      const { access_token, refresh_token } = registerResponse.data;

      // Save tokens
      setTokens(access_token, refresh_token);

      // Get user profile from backend
      const userResponse = await authApi.me();
      setUser(userResponse.data);

      // Get workspaces and set current workspace
      try {
        const workspacesResponse = await workspacesApi.list();
        if (workspacesResponse.data.length > 0) {
          setWorkspace(workspacesResponse.data[0]);
        }
      } catch {
        console.log("No workspaces found");
      }

      notifications.show({
        title: "¡Cuenta creada!",
        message: "Tu cuenta ha sido creada correctamente",
        color: "green",
      });

      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const message =
        err.response?.data?.detail || err.message || "Error al registrar usuario";
      notifications.show({
        title: "Error",
        message,
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Call backend logout to invalidate session
      try {
        await authApi.logout();
      } catch {
        // Ignore errors - we'll clear local state anyway
      }

      clearStore();
      navigate("/login");

      notifications.show({
        title: "Sesión cerrada",
        message: "Has cerrado sesión correctamente",
        color: "blue",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      notifications.show({
        title: "Error",
        message: err.message || "Error al cerrar sesión",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    loading,
  };
}
