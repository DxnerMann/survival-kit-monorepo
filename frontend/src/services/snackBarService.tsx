import {createRoot, type Root} from "react-dom/client";
import { useEffect, useState } from "react";
import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type SnackbarType = "info" | "warning" | "success" | "error";

interface SnackbarOptions {
    type: SnackbarType;
    text: string;
    showIcon?: boolean;
}

const ICONS: Record<SnackbarType, React.ReactNode> = {
    info:    <Info    size={18} />,
    warning: <AlertTriangle size={18} />,
    success: <CheckCircle   size={18} />,
    error:   <XCircle       size={18} />,
};

const COLORS: Record<SnackbarType, { bg: string; border: string; icon: string }> = {
    info:    { bg: "#1e293b", border: "#334155", icon: "#60a5fa" },
    warning: { bg: "#1e293b", border: "#854d0e", icon: "#facc15" },
    success: { bg: "#1e293b", border: "#166534", icon: "#4ade80" },
    error:   { bg: "#1e293b", border: "#991b1b", icon: "#f87171" },
};

// eslint-disable-next-line react-refresh/only-export-components
function SnackbarToast({ type, text, showIcon = true, onDone }: SnackbarOptions & { onDone: () => void }) {
    const [visible, setVisible] = useState(false);
    const colors = COLORS[type];

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setVisible(true));

        const hideTimer = setTimeout(() => setVisible(false), 2700);
        const doneTimer = setTimeout(onDone, 3200);

        return () => {
            clearTimeout(hideTimer);
            clearTimeout(doneTimer);
        };
    }, []);

    return (
        <>
            <style>{`
                @keyframes snackbar-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .snackbar-toast {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%) translateY(20px);
                    opacity: 0;
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 18px;
                    border-radius: 10px;
                    border: 1px solid ${colors.border};
                    background: ${colors.bg};
                    color: #f1f5f9;
                    font-size: 14px;
                    font-weight: 500;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
                    max-width: min(420px, calc(100vw - 48px));
                    white-space: pre-wrap;
                    word-break: break-word;
                    pointer-events: none;
                }
                .snackbar-toast.snackbar-visible {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                .snackbar-icon {
                    flex-shrink: 0;
                    color: ${colors.icon};
                    display: flex;
                    align-items: center;
                }
            `}</style>
            <div className={`snackbar-toast${visible ? " snackbar-visible" : ""}`}>
                {showIcon && (
                    <span className="snackbar-icon">
                        {ICONS[type]}
                    </span>
                )}
                <span>{text}</span>
            </div>
        </>
    );
}

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function getRoot(): Root {
    if (!container) {
        container = document.createElement("div");
        container.id = "snackbar-root";
        document.body.appendChild(container);
    }
    if (!root) {
        root = createRoot(container);
    }
    return root;
}

function cleanup() {
    root?.render(null);
}

export const snackbarService = {
    showSnackbar({ type, text, showIcon = true }: SnackbarOptions) {
        const r = getRoot();
        r.render(
            <SnackbarToast
                type={type}
                text={text}
                showIcon={showIcon}
                onDone={cleanup}
            />
        );
    },
};