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

const VersionUpdateNotice = () => {
    const [availableVersion, setAvailableVersion] = useState<string | null>(null);

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
                    setAvailableVersion(version);
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

    if (!availableVersion) {
        return null;
    }

    const reload = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("v", Date.now().toString());
        window.location.replace(url.toString());
    };

    return (
        <div className="version-update" role="status">
            <span>Neue Version {availableVersion} verfügbar</span>
            <button type="button" onClick={reload}>Neu laden</button>
        </div>
    );
};

export default VersionUpdateNotice;
