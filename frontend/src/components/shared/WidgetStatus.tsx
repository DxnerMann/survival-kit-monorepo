import {AlertCircle} from "lucide-react";
import "./WidgetStatus.css";

type WidgetStatusProps = {
    status: "loading" | "error";
    message?: string;
};

const DEFAULT_LOADING = "Wird geladen…";
const DEFAULT_ERROR = "Etwas ist schiefgelaufen. Versuche es später erneut.";

const WidgetStatus = ({status, message}: WidgetStatusProps) => (
    <div className={`widget-status widget-status--${status}`} role="status">
        {status === "error" && (
            <AlertCircle className="widget-status__icon" size={22} aria-hidden="true" />
        )}
        <p className="widget-status__text">
            {message ?? (status === "loading" ? DEFAULT_LOADING : DEFAULT_ERROR)}
        </p>
    </div>
);

export default WidgetStatus;
