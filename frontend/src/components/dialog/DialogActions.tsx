import type {ReactNode} from "react";
import Button from "@/components/ui/Button.tsx";

export interface DialogAction {
    text: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "transparent";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
}

interface DialogActionsProps {
    cancel?: DialogAction;
    confirm?: DialogAction;
    children?: ReactNode;
}

export default function DialogActions({cancel, confirm, children}: DialogActionsProps) {
    if (children != null) {
        return <div className="dialog-actions">{children}</div>;
    }

    return (
        <div className="dialog-actions">
            {cancel && (
                <Button
                    text={cancel.text}
                    onClick={cancel.onClick}
                    variant={cancel.variant ?? "secondary"}
                    type={cancel.type ?? "button"}
                    disabled={cancel.disabled}
                    fullWidth={true}
                />
            )}
            {confirm && (
                <Button
                    text={confirm.text}
                    onClick={confirm.onClick}
                    variant={confirm.variant ?? "primary"}
                    type={confirm.type ?? "button"}
                    disabled={confirm.disabled}
                    fullWidth={true}
                />
            )}
        </div>
    );
}
