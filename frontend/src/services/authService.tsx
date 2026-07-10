import Cookies from 'js-cookie'

import type {ApiError} from '../models/ApiError.tsx'
import type {LoginRequest} from '../models/LoginRequest.tsx'
import type {LoginResponse} from '../models/LoginResponse.tsx'
import type {RegisterRequest} from '../models/RegisterRequest.tsx'
import {api, checkResponse, resolveError} from "./api.tsx";
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

export const validatePassword = (pw: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/.test(pw)
}

const removeToken = () => {
    Cookies.remove(TOKEN_KEY)
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

    await checkResponse(response);

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

    await checkResponse(response);
}

const validate = async (): Promise<boolean> => {
    const token = getToken()

    if (!token) {
        return false
    }

    const response = await fetch(`${API_URL}/auth/validate`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    if (!response.ok) {
        removeToken();
        const apiError: ApiError = await response.json();
        resolveError(apiError);
    }

    const data: LoginResponse = await response.json();
    saveToken(data.token);
    setUserContext(data);
    return true;
}

const changePassword = async (
    oldPassword: string,
    newPassword: string,
): Promise<void> => {
    const token = authService.getToken();
    const params = new URLSearchParams({ oldPassword, newPassword });
    const response = await fetch(`${API_URL}/auth/password?${params.toString()}`, {
        method: 'PUT',
        headers: {
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    await checkResponse(response);
}

const logout = async (callback: () => void) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    await checkResponse(response);

    Cookies.remove(TOKEN_KEY);
    callback();
};

const deleteAccount = async (callback: () => void) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/auth`, {
        method: 'DELETE',
        headers: {
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    await checkResponse(response);

    Cookies.remove(TOKEN_KEY);
    callback();
};

const changeEmail = async (newEmail: string, callback: () => void) => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/auth/email?email=${newEmail}`, {
        method: 'PUT',
        headers: {
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    await checkResponse(response);

    Cookies.remove(TOKEN_KEY);
    callback();
};

const resendVerification = async () => {
    const token = authService.getToken();

    const response = await fetch(`${API_URL}/auth/resend`, {
        method: 'POST',
        headers: {
            ...(token !== undefined && { Authorization: `Bearer ${token}` }),
        },
    });

    await checkResponse(response);
};

export const authService = {
    login,
    register,
    validate,
    saveToken,
    getToken,
    removeToken,
    changePassword,
    logout,
    deleteAccount,
    changeEmail,
    resendVerification
}