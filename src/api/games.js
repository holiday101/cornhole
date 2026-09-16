import { api } from './client';

export function getGames() {
  return api.get('/games');
}

export function getGame(id) {
  return api.get(`/games/${id}`);
}

export function createGame({ courseId, variant, playerUserIds, llrrPointValue, enabledCoins, beansValue }) {
  return api.post('/games', {
    courseId: courseId ?? null,
    variant,
    playerUserIds,
    llrrPointValue: llrrPointValue ?? null,
    enabledCoins: enabledCoins ?? null,
    beansValue: beansValue ?? null,
  });
}

export function adjustScore(gameId, holeNumber, userId, delta) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/scores`, { userId, delta });
}

export function setBean(gameId, holeNumber, field, userId) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/beans`, { field, userId });
}

export function setCoin(gameId, holeNumber, coinKey, userId) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/coins`, { coinKey, userId });
}

export function setPosition(gameId, holeNumber, position, userId) {
  return api.patch(`/games/${gameId}/holes/${holeNumber}/positions`, { position, userId });
}

export function setCompleted(gameId, completed) {
  return api.patch(`/games/${gameId}`, { completed });
}

export function deleteGame(gameId) {
  return api.del(`/games/${gameId}`);
}
