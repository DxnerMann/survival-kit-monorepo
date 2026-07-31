import type {UserRole} from "../services/tokenService.tsx";

export type LoginResponse = {
    username: string,
    firstName: string,
    lastName: string,
    role: UserRole
}
