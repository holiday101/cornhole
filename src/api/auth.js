import { api } from './client';

export function signup({ email, password, name }) {
  return api.post('/auth/signup', { email, password, name });
}

export function login({ email, password }) {
  return api.post('/auth/login', { email, password });
}

export function logout() {
  return api.post('/auth/logout');
}

export function getMe() {
  return api.get('/me');
}
