import { api } from './client';

export function getPeople(query) {
  const q = query && query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
  return api.get(`/people${q}`);
}

export function addPerson(name, email) {
  return api.post('/people', { name, email });
}

export function setFavorite(personId, isFavorite) {
  return isFavorite ? api.post(`/people/${personId}/favorite`) : api.del(`/people/${personId}/favorite`);
}
