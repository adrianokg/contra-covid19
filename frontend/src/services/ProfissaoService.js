import http from './Http';

export default {
  findAll() {
    return http.get('/profissoes?nome=').then(({ data }) => data);
  },
};