import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {Link} from "react-router-dom";
import Dialog from "@/components/dialog/Dialog";
import DialogActions from "@/components/dialog/DialogActions";

const COOKIE_CONSENT_KEY = "cookie_consent";

export type DialogOpenOptions = {
    id?: string;
    title: string;
    subtitle?: string;
    content?: ReactNode;
    footer?: ReactNode;
    closeOnOverlayClick?: boolean;
    onClose?: () => void;
};

type DialogContextValue = {
    open: (options: DialogOpenOptions) => void;
    close: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
    const ctx = useContext(DialogContext);
    if (!ctx) {
        throw new Error("useDialog must be used within DialogProvider");
    }
    return ctx;
}

type ActiveDialog = DialogOpenOptions & {id: string};

export default function DialogProvider({children}: {children: ReactNode}) {
    const [active, setActive] = useState<ActiveDialog | null>(null);

    const close = useCallback(() => {
        setActive((current) => {
            current?.onClose?.();
            return null;
        });
    }, []);

    const open = useCallback((options: DialogOpenOptions) => {
        setActive({
            ...options,
            id: options.id ?? `dialog-${Date.now()}`,
        });
    }, []);

    useEffect(() => {
        if (localStorage.getItem(COOKIE_CONSENT_KEY)) {
            return;
        }

        setActive({
            id: "cookie-consent",
            title: "Cookies & Datenschutz",
            closeOnOverlayClick: false,
            content: (
                <div className="dialog-cookie-body">
                    <p>
                        Diese Website verwendet technisch notwendige Cookies und vergleichbare
                        Technologien, die für die Anmeldung und die ordnungsgemäße Funktion der
                        Website erforderlich sind.
                    </p>
                    <p>
                        Ohne diese Cookies können wesentliche Funktionen der Website nicht
                        bereitgestellt werden. Details findest du in unserer{" "}
                        <Link to="/privacypolicy">Datenschutzerklärung</Link>.
                    </p>
                </div>
            ),
            footer: (
                <DialogActions
                    confirm={{
                        text: "Verstanden",
                        onClick: () => {
                            localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
                            setActive(null);
                        },
                    }}
                />
            ),
        });
    }, []);

    const value = useMemo(() => ({open, close}), [open, close]);

    return (
        <DialogContext.Provider value={value}>
            {children}
            {active && (
                <Dialog
                    key={active.id}
                    isOpen={true}
                    title={active.title}
                    subtitle={active.subtitle}
                    onClose={active.closeOnOverlayClick === false ? () => undefined : close}
                    closeOnOverlayClick={active.closeOnOverlayClick !== false}
                    footer={active.footer}
                >
                    {active.content}
                </Dialog>
            )}
        </DialogContext.Provider>
    );
}
