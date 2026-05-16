import Cookies from 'js-cookie'

import type {ApiError} from '../models/ApiError.tsx'
import type {LoginRequest} from '../models/LoginRequest.tsx'
import type {LoginResponse} from '../models/LoginResponse.tsx'
import type {RegisterRequest} from '../models/RegisterRequest.tsx'
import {api} from "./api.tsx";
import {setUserContext} from "./userService.tsx";

const API_URL = api.baseUrl;

const TOKEN_KEY = 'session'

const saveToken = (token: string) => {
    Cookies.set(TOKEN_KEY, token, {
        expires: 7,
        sameSite: 'strict',
    })
}

const getToken = (): string | undefined => {
    return Cookies.get(TOKEN_KEY)
}

const removeToken = () => {
    Cookies.remove(TOKEN_KEY)
}

const handleApiError = async (response: Response): Promise<never> => {
    console.log(response.status);
    if (response.status === 500) {
        throw new Error(
            'Ein unerwarteter Fehler ist aufgetreten, bitte versuche es später erneut.'
        )
    }
    let message = 'Ein unerwarteter Fehler ist aufgetreten, bitte versuche es später erneut.';

    try {
        const error = (await response.json()) as Partial<ApiError>;

        if (typeof error.message === 'string') {
            message = error.message;
        }
    } catch {
        // parsing failed -> keep fallback message
    }
    throw new Error(message);


}

const login = async (
    request: LoginRequest
): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        await handleApiError(response)
    }

    const data: LoginResponse = await response.json();
    saveToken(data.token)
    setUserContext(data);

    return data
}

const register = async (
    request: RegisterRequest
): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        await handleApiError(response)
    }
}

const validate = async (): Promise<boolean> => {
    const token = getToken()

    if (!token) {
        return false
    }

    try {
        const response = await fetch(`${API_URL}/auth/validate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            removeToken()
            return false
        }

        return true
    } catch {
        removeToken()
        return false
    }
}

export const authService = {
    login,
    register,
    validate,
    saveToken,
    getToken,
    removeToken,
}