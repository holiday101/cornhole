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

export function getUserContacts(userId) {
  return api.get(`/admin/users/${userId}/contacts`);
}

export function addUserContact(userId, email) {
  return api.post(`/admin/users/${userId}/contacts`, { email });
}

export function removeUserContact(userId, friendId) {
  return api.del(`/admin/users/${userId}/contacts/${friendId}`);
}
