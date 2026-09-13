import { api } from './client';

export function getCourses() {
  return api.get('/courses');
}

export function getCourse(id) {
  return api.get(`/courses/${id}`);
}

export function createCourse({ name, holesCount, holes }) {
  return api.post('/courses', { name, holesCount, holes });
}

export function updateCourse(id, { name, holesCount, holes }) {
  return api.put(`/courses/${id}`, { name, holesCount, holes });
}

export function deleteCourse(id) {
  return api.del(`/courses/${id}`);
}
