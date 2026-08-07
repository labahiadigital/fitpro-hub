import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture the event globally so it isn't lost if no component is mounted yet
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(() => {
    if (isStandalone()) return false;
    if (deferredPrompt) return true;
    if (isIOS()) return true;
    return false;
  });

  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setCanInstall(false);
      return;
    }

    if (deferredPrompt) {
      setCanInstall(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setCanInstall(false);
      deferredPrompt = null;
    };
    window.addEventListener("appinstalled", installedHandler);

    if (!deferredPrompt && isIOS()) {
      setCanInstall(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      setCanInstall(false);
      return outcome === "accepted";
    }

    if (isIOS()) {
      setShowIOSGuide(true);
      return false;
    }

    return false;
  }, []);

  const dismissIOSGuide = useCallback(() => {
    setShowIOSGuide(false);
  }, []);

  return { canInstall, install, showIOSGuide, dismissIOSGuide, isIOSDevice: isIOS() };
}
