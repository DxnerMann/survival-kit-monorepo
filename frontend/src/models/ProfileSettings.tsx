export type ProfileSettings = {
    firstname: string,
    lastname: string,
    course: string | null,
    role: string,
    email: string,
    username: string,
    color: string,
    accentColor?: string | null,
    userId: string
    isVerified: boolean,
}