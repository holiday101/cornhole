import { api } from './client';

export function getGames() {
  return api.get('/games');
}

export function getGame(id) {
  return api.get(`/games/${id}`);
}

export function createGame({ courseId, variant, playerUserIds }) {
  return api.post('/games', { courseId: courseId ?? null, variant, playerUserIds });
}

export function adjustScore(gameId, holeNumber, userId, delta) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/scores`, { userId, delta });
}

export function setBean(gameId, holeNumber, field, userId) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/beans`, { field, userId });
}

export function setCompleted(gameId, completed) {
  return api.patch(`/games/${gameId}`, { completed });
}

export function deleteGame(gameId) {
  return api.del(`/games/${gameId}`);
}
