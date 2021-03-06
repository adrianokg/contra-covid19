/* eslint-disable global-require */
const fs = require('fs');
const path = require('path');

const basename = path.basename(__filename);
const secure = require('../secure');

module.exports = (app) => {
  const keycloak = secure(app);
  fs.readdirSync(__dirname)
    .filter((file) => (
      file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js'
    ))
    .forEach((file) => {
      // eslint-disable-next-line import/no-dynamic-require
      const route = require(path.join(__dirname, file));
      app.use('/api', keycloak.protect(), route);
    });
  // Endpoint para o Docker/AWS
  app.use(require('./health'));
  // Public routes
  app.use('/public', require('./grafico-route'));

  return app;
};
