import {snackbarService} from "./snackBarService.tsx";
import type {ApiError} from "../models/ApiError.tsx";

const API_URL = import.meta.env.VITE_API_BASE_URL;

const API_VERSION = "v1"

export const api = {
    baseUrl: API_URL +  "/" + API_VERSION,
}

// #####################

type ErrorMapping = {
    text: string;
    type: "error" | "info" | "warning" | "success";
};

const GENERIC_ERROR_TEXT = "Etwas ist schiefgelaufen. Versuche es später erneut.";

const ERROR_CODE_MAP: Record<string, ErrorMapping> = {
    // AUTHENTICATION
    "01x00000000": { text: "Du bist nicht angemeldet.", type: "error" },
    "01x00000001": { text: "E-Mail oder Passwort ist falsch.", type: "error" },
    "01x00000002": { text: "Bitte bestätige zuerst deine E-Mail-Adresse.", type: "warning" },
    "01x00000003": { text: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.", type: "warning" },
    "01x00000005": { text: "Das alte Passwort ist nicht korrekt.", type: "error" },
    "01x00000006": { text: "Das Passwort erfüllt nicht die Anforderungen.", type: "error" },
    "01x00000007": { text: "Der letzte Administrator kann nicht gelöscht werden.", type: "warning" },
    "01x00000008": { text: "Bitte gib eine gültige E-Mail-Adresse ein.", type: "error" },
    "01x0000000A": { text: "Du hast nicht die erforderliche Berechtigung.", type: "error" },
    "01x0000000B": { text: "Diese E-Mail oder dieser Benutzername wird bereits verwendet.", type: "error" },

    // USER
    "03x00000001": { text: "Dieses Bildformat wird nicht unterstützt.", type: "error" },
    "03x00000004": { text: "Ungültige Farbe.", type: "error" },
    "03x00000005": { text: "Der Benutzername kann nur alle 30 Tage geändert werden.", type: "warning" },

    // EXTERNAL
    "04x00000000": { text: "Der Kurs konnte nicht aus der Rapla-URL geladen werden.", type: "error" },

    // QUICKLINK
    "05x00000000": { text: "Der Titel darf nicht leer sein.", type: "warning" },
    "05x00000001": { text: "Die Beschreibung darf nicht leer sein.", type: "warning" },
    "05x00000002": { text: "Die URL darf nicht leer sein.", type: "warning" },

    // LECTURE
    "06x00000000": { text: "Rapla-URL und Kurs dürfen nicht beide leer sein.", type: "warning" },
    "06x00000001": { text: "Kurs nicht gefunden.", type: "error" },
};

/*
TODO: Remove Individual Snackbars when Fetching an Api, since snackbar is now shown here
 */

export function resolveError(error: ApiError): void {
    const mapping = ERROR_CODE_MAP[error.errorCode];

    snackbarService.showSnackbar({
        type: mapping?.type ?? "error",
        text: mapping?.text ?? GENERIC_ERROR_TEXT,
        showIcon: true,
    });
    throw new Error(mapping?.text);
}

export async function checkResponse(response: Response): Promise<void> {
    if (!response.ok) {
        const apiError: ApiError = await response.json();
        resolveError(apiError);
    }
}