export type Design = "modern" | "classic";

const DESIGN_KEY = "design";
const DESIGN_CHOICE_KEY = "design_choice";

export function getDesign(): Design {
    return localStorage.getItem(DESIGN_KEY) === "classic" ? "classic" : "modern";
}

export function applyDesign(design: Design) {
    localStorage.setItem(DESIGN_KEY, design);
    document.documentElement.dataset.design = design;
}

export function hasChosenDesign(): boolean {
    return localStorage.getItem(DESIGN_CHOICE_KEY) !== null;
}

export function chooseDesign(design: Design) {
    applyDesign(design);
    localStorage.setItem(DESIGN_CHOICE_KEY, design);
}
