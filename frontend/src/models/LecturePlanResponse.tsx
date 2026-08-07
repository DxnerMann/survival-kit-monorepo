export interface LecturePlanResponse {
    lectures: import("@/models/Lecture.tsx").Lecture[];
    notice: string | null;
}
