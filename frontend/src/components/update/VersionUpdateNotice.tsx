import {useEffect, useState} from "react";
import pkg from "../../../package.json";
import "@/components/update/VersionUpdateNotice.css";

const CHECK_MS = 60_000;

const isNewer = (server: string, current: string) => {
    const serverParts = server.split(".").map(Number);
    const currentParts = current.split(".").map(Number);
    const length = Math.max(serverParts.length, currentParts.length);
    for (let index = 0; index < length; index++) {
        const diff = (serverParts[index] ?? 0) - (currentParts[index] ?? 0);
        if (diff !== 0) {
            return diff > 0;
        }
    }
    return false;
};

type AvailableUpdate = {
    version: string;
    versionChanged: boolean;
};

const VersionUpdateNotice = () => {
    const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);

    useEffect(() => {
        let stopped = false;
        let timer = 0;

        const check = async () => {
            if (stopped) {
                return;
            }
            try {
                const response = await fetch(`/version.json?t=${Date.now()}`, {cache: "no-store"});
                if (!response.ok) {
                    return;
                }
                const body = await response.json() as {version?: unknown; build?: unknown};
                const version = typeof body.version === "string" ? body.version : null;
                const build = typeof body.build === "string" ? body.build : null;
                if (!version || isNewer(pkg.version, version)) {
                    return;
                }
                const versionChanged = isNewer(version, pkg.version);
                const contentChanged = build !== null && build !== __APP_BUILD_ID__;
                if (versionChanged || contentChanged) {
                    stopped = true;
                    window.clearTimeout(timer);
                    setAvailableUpdate({version, versionChanged});
                }
            } catch {
                // Offline tabs keep the version they already have.
            }
        };

        const tick = () => {
            void check();
            timer = window.setTimeout(tick, CHECK_MS);
        };

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void check();
            }
        };

        tick();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            stopped = true;
            window.clearTimeout(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);

    if (!availableUpdate) {
        return null;
    }

    const reload = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("v", Date.now().toString());
        window.location.replace(url.toString());
    };

    return (
        <div className="version-update" role="status">
            <span>
                {availableUpdate.versionChanged
                    ? `Neue Version ${availableUpdate.version} verfügbar`
                    : "Bitte lade die Seite neu."}
            </span>
            <button type="button" onClick={reload}>Neu laden</button>
        </div>
    );
};

export default VersionUpdateNotice;
