export type Page<T> = {
    data: T[],
    continuation: string | null
}