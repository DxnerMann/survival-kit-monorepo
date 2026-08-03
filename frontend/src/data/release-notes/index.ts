import v300 from "./3.0.0.json";
import v301 from "./3.0.1.json";
import v302 from "./3.0.2.json";
import v310 from "./3.1.0.json";

export type ReleaseNoteSection = {
    title: string;
    items: string[];
};

export type ReleaseNote = {
    version: string;
    date: string;
    sections: ReleaseNoteSection[];
};

const compareVersions = (a: string, b: string): number => {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const diff = (partsB[i] ?? 0) - (partsA[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    return 0;
};

const allNotes: ReleaseNote[] = [v300, v301, v302, v310];

export const releaseNotes: ReleaseNote[] = [...allNotes].sort((a, b) =>
    compareVersions(a.version, b.version),
);
