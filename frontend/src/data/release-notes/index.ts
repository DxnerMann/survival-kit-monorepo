import v300 from "./3.0.0.json";
import v301 from "./3.0.1.json";
import v302 from "./3.0.2.json";
import v310 from "./3.1.0.json";
import v320 from "./3.2.0.json";
import v330 from "./3.3.0.json";
import v331 from "./3.3.1.json";
import v332 from "./3.3.2.json";
import v340 from "./3.4.0.json";
import v341 from "./3.4.1.json";
import v342 from "./3.4.2.json";
import v350 from "./3.5.0.json";
import v351 from "./3.5.1.json";
import v352 from "./3.5.2.json";
import v353 from "./3.5.3.json";

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

const allNotes: ReleaseNote[] = [v300, v301, v302, v310, v320, v330, v331, v332, v340, v341, v342, v350, v351, v352, v353];

export const releaseNotes: ReleaseNote[] = [...allNotes].sort((a, b) =>
    compareVersions(a.version, b.version),
);
