import { api } from './client';

export function getContacts() {
  return api.get('/contacts');
}

export function addContact(email) {
  return api.post('/contacts', { email });
}
