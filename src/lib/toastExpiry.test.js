import { describe, expect, it } from "vitest";
import { attachToastExpiryReconciliation, withToastExpiry } from "./toastExpiry";

describe("toastExpiry", () => {
  it("descarta somente avisos vencidos quando o aplicativo volta ao foco", () => {
    let now = 1000;
    const windowTarget = new EventTarget();
    const documentTarget = new EventTarget();
    let toasts = [
      withToastExpiry({ id: "expired" }, 500, () => 0),
      withToastExpiry({ id: "active" }, 2500, () => 0),
    ];
    const dismissed = [];

    const cleanup = attachToastExpiryReconciliation({
      windowTarget,
      documentTarget,
      getToasts: () => toasts,
      dismiss: (id) => {
        dismissed.push(id);
        toasts = toasts.filter((toast) => toast.id !== id);
      },
      now: () => now,
    });

    windowTarget.dispatchEvent(new Event("focus"));
    expect(dismissed).toEqual(["expired"]);

    now = 3000;
    windowTarget.dispatchEvent(new Event("pageshow"));
    expect(dismissed).toEqual(["expired", "active"]);

    cleanup();
    documentTarget.dispatchEvent(new Event("visibilitychange"));
    expect(dismissed).toEqual(["expired", "active"]);
  });
});