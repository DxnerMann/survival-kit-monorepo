import type {ComponentType} from "react";

export interface Action {
    icon: ComponentType<{ size?: number; className?: string }>;
    text: string;
    link: string | (() => void);
}
