import { api } from './client';

export function getAdminUsers() {
  return api.get('/admin/users');
}

export function setUserRole(userId, role) {
  return api.patch(`/admin/users/${userId}/role`, { role });
}

export function deleteUser(userId) {
  return api.del(`/admin/users/${userId}`);
}

export function updateUser(userId, { name, email }) {
  return api.patch(`/admin/users/${userId}`, { name, email });
}
