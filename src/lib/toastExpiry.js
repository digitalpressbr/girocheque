export function withToastExpiry(toast, duration, now = Date.now) {
  return { ...toast, expiresAt: now() + duration };
}

export function attachToastExpiryReconciliation({
  windowTarget,
  documentTarget,
  getToasts,
  dismiss,
  now = Date.now,
}) {
  const reconcile = () => {
    const currentTime = now();
    for (const toast of getToasts()) {
      if (Number.isFinite(toast.expiresAt) && toast.expiresAt <= currentTime) {
        dismiss(toast.id);
      }
    }
  };

  windowTarget.addEventListener("focus", reconcile);
  windowTarget.addEventListener("pageshow", reconcile);
  documentTarget.addEventListener("visibilitychange", reconcile);

  return () => {
    windowTarget.removeEventListener("focus", reconcile);
    windowTarget.removeEventListener("pageshow", reconcile);
    documentTarget.removeEventListener("visibilitychange", reconcile);
  };
}