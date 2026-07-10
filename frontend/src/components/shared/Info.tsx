import React from "react";
import { Info as InfoIcon, AlertTriangle, AlertCircle } from "lucide-react";
import "./Info.css";

export type InfoType = "WARNING" | "INFO" | "ERROR" | "SUCCESS";

export interface InfoProps {
    text: string;
    type: InfoType;
}

const ICONS: Record<InfoType, React.ComponentType<{ className?: string }>> = {
    INFO: InfoIcon,
    WARNING: AlertTriangle,
    ERROR: AlertCircle,
    SUCCESS: InfoIcon
};

const Info: React.FC<InfoProps> = ({ text, type }) => {
    const Icon = ICONS[type];

    return (
        <div className={`info-banner info-banner--${type.toLowerCase()}`} role="status">
            <Icon className="info-banner__icon" aria-hidden="true" />
            <span className="info-banner__text">{text}</span>
        </div>
    );
};

export default Info;