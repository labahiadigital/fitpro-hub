import { notifications } from "@mantine/notifications";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { signIn, signOut, signUp, supabase } from "../services/supabase";
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

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setTokens(session.access_token, session.refresh_token || undefined);
      } else if (event === "SIGNED_OUT") {
        clearStore();
      } else if (event === "TOKEN_REFRESHED" && session) {
        setTokens(session.access_token, session.refresh_token || undefined);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setTokens, clearStore]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);

      if (error) throw error;

      if (data.session) {
        setTokens(
          data.session.access_token,
          data.session.refresh_token || undefined
        );

        // Get user profile from our API
        try {
          const userResponse = await api.get("/auth/me");
          setUser(userResponse.data);

          // Get workspaces
          const workspacesResponse = await api.get("/workspaces");
          if (workspacesResponse.data.length > 0) {
            setWorkspace(workspacesResponse.data[0]);
          }
        } catch {
          // User might not exist in our DB yet, create them
          console.log(
            "User not found in DB, will be created on first workspace access"
          );
        }

        notifications.show({
          title: "¡Bienvenido!",
          message: "Has iniciado sesión correctamente",
          color: "green",
        });

        navigate("/dashboard");
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      notifications.show({
        title: "Error",
        message: err.message || "Error al iniciar sesión",
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
      const { data, error } = await signUp(email, password, {
        full_name: fullName,
      });

      if (error) throw error;

      if (data.session) {
        setTokens(
          data.session.access_token,
          data.session.refresh_token || undefined
        );

        // Create user and workspace in our API
        try {
          const response = await api.post("/auth/register", {
            email,
            password,
            full_name: fullName,
            workspace_name: workspaceName,
          });

          if (response.data) {
            // Get user profile
            const userResponse = await api.get("/auth/me");
            setUser(userResponse.data);

            // Get workspaces
            const workspacesResponse = await api.get("/workspaces");
            if (workspacesResponse.data.length > 0) {
              setWorkspace(workspacesResponse.data[0]);
            }
          }
        } catch {
          console.log("Backend registration handled separately");
        }

        notifications.show({
          title: "¡Cuenta creada!",
          message: "Tu cuenta ha sido creada correctamente",
          color: "green",
        });

        navigate("/dashboard");
      } else if (data.user && !data.session) {
        // Email confirmation required
        notifications.show({
          title: "Verifica tu email",
          message: "Te hemos enviado un email de confirmación",
          color: "blue",
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      notifications.show({
        title: "Error",
        message: err.message || "Error al registrar usuario",
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
      await signOut();
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
