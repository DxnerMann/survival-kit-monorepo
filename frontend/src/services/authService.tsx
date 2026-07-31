import type {LoginRequest} from '../models/LoginRequest.tsx'
import type {LoginResponse} from '../models/LoginResponse.tsx'
import type {RegisterRequest} from '../models/RegisterRequest.tsx'
import {api, apiFetch, checkResponse} from "./api.tsx";
import {setUserContext} from "./userService.tsx";
import {clearSessionMeta, hasSessionMeta, setSessionMeta} from "./tokenService.tsx";

const API_URL = api.baseUrl;

export const validatePassword = (pw: string) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/.test(pw)
}

const clearSession = () => {
    clearSessionMeta();
}

const login = async (
    request: LoginRequest
): Promise<LoginResponse> => {
    const response = await apiFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    await checkResponse(response);

    const data: LoginResponse = await response.json();
    setSessionMeta(data.role, data.username);
    setUserContext(data);
    localStorage.removeItem('guest');

    return data
}

const register = async (
    request: RegisterRequest
): Promise<void> => {
    const response = await apiFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    await checkResponse(response);
}

const validate = async (): Promise<boolean> => {
    const response = await apiFetch(`${API_URL}/auth/validate`, {
        method: 'POST',
    })

    if (!response.ok) {
        clearSession();
        return false;
    }

    const data: LoginResponse = await response.json();
    setSessionMeta(data.role, data.username);
    setUserContext(data);
    return true;
}

const changePassword = async (
    oldPassword: string,
    newPassword: string,
): Promise<void> => {
    const response = await apiFetch(`${API_URL}/auth/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
    });

    await checkResponse(response);

    const data: LoginResponse = await response.json();
    setSessionMeta(data.role, data.username);
    setUserContext(data);
}

const logout = async (callback: () => void) => {
    const response = await apiFetch(`${API_URL}/auth/logout`, {
        method: 'POST',
    });

    await checkResponse(response);

    clearSession();
    callback();
};

const deleteAccount = async (callback: () => void) => {
    const response = await apiFetch(`${API_URL}/auth`, {
        method: 'DELETE',
    });

    await checkResponse(response);

    clearSession();
    callback();
};

const changeEmail = async (newEmail: string, callback: () => void) => {
    const response = await apiFetch(`${API_URL}/auth/email`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
    });

    await checkResponse(response);

    clearSession();
    callback();
};

const resendVerification = async () => {
    const response = await apiFetch(`${API_URL}/auth/resend`, {
        method: 'POST',
    });

    await checkResponse(response);
};

const hasSession = (): boolean => hasSessionMeta();

export const authService = {
    login,
    register,
    validate,
    clearSession,
    removeToken: clearSession,
    changePassword,
    logout,
    deleteAccount,
    changeEmail,
    resendVerification,
    hasSession,
}
