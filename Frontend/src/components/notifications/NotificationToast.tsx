import { type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { Toast } from "../ui/Toast";
import type { Notification } from "../../types";

const TOAST_AUTO_DISMISS_MS = 6000;

const resolveCaseId = (value: Notification["caseId"]): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id;
};

export const NotificationToast = (): JSX.Element | null => {
  const navigate = useNavigate();
  const { toasts, dismissToast, markNotificationRead } = useNotifications();

  if (toasts.length === 0) return null;

  const handleOpen = async (notification: Notification) => {
    if (notification.isRead !== true) {
      await markNotificationRead(notification._id);
    }

    const caseId = resolveCaseId(notification.caseId);
    if (caseId) {
      navigate(`/case/${caseId}`);
    }

    dismissToast(notification._id);
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => {
        const caseId = resolveCaseId(toast.caseId);

        return (
          <Toast
            key={toast._id}
            title={toast.title}
            description={toast.body}
            autoDismissMs={TOAST_AUTO_DISMISS_MS}
            onClose={() => dismissToast(toast._id)}
            action={
              caseId
                ? {
                    label: "Open case",
                    onClick: () => void handleOpen(toast),
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
};
