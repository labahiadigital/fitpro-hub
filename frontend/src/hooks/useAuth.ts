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
        response?: { data?: { detail?: string }; status?: number };
        message?: string;
      };
      const message =
        err.response?.data?.detail || err.message || "Error al iniciar sesión";
      
      // Check if it's an email verification error
      if (err.response?.status === 403 && message.includes("verificar")) {
        notifications.show({
          title: "Email no verificado",
          message: "Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.",
          color: "orange",
          autoClose: 10000,
        });
      } else {
        notifications.show({
          title: "Error",
          message,
          color: "red",
        });
      }
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
      // Register through backend API
      const registerResponse = await authApi.register({
        email,
        password,
        full_name: fullName,
        workspace_name: workspaceName,
      });

      const { access_token, refresh_token, requires_email_verification } = registerResponse.data;

      // Check if email confirmation is required
      if (access_token === "pending_email_confirmation" || requires_email_verification) {
        notifications.show({
          title: "¡Cuenta creada!",
          message: "Por favor, revisa tu email para confirmar tu cuenta antes de iniciar sesión.",
          color: "blue",
          autoClose: 10000,
        });
        navigate("/login");
        return;
      }

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

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      notifications.show({
        title: "Email enviado",
        message: "Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.",
        color: "green",
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al procesar la solicitud",
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword);
      notifications.show({
        title: "¡Contraseña actualizada!",
        message: "Ya puedes iniciar sesión con tu nueva contraseña.",
        color: "green",
      });
      navigate("/login");
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al restablecer la contraseña",
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      notifications.show({
        title: "¡Contraseña actualizada!",
        message: "Tu contraseña ha sido actualizada correctamente.",
        color: "green",
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al cambiar la contraseña",
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async (email: string) => {
    setLoading(true);
    try {
      await authApi.resendVerification(email);
      notifications.show({
        title: "Email enviado",
        message: "Si el email está registrado, recibirás un enlace de verificación.",
        color: "green",
      });
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      notifications.show({
        title: "Error",
        message: err.response?.data?.detail || "Error al enviar el email",
        color: "red",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    resendVerificationEmail,
    loading,
  };
}
