import { apiClient } from './client';

export const login = async (email: string, password: string) => {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const register = async (email: string, password: string, name: string, salonName: string) => {
  return apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, salonName }),
  });
};
