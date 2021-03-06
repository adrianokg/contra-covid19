const Sequelize = require('sequelize');
const models = require('../models');

const AuthAPI = require('../services-api/keycloak/auth');
const UserApi = require('../services-api/keycloak/users');

exports.index = async (req, res) => {
  const users = await models.User.findAll();
  return res.json({ data: users });
};

const montarSelectConsultaBase = (search) => {
  const where = search.trim() !== ''
    ? ` AND (UPPER(u.nome) like UPPER('%${search}%') or LOWER(u.email) LIKE LOWER('%${search}%')
    or UPPER(us.nome) like UPPER('%${search}%'))`
    : '';
  return `select * from  "User" u
  left outer join "UserUnidadeSaude" uus on uus."userId" = u.id
  left outer join "UnidadeSaude" us on us.id = uus."unidadeSaudeId"
  where u."deletedAt" is null ${where} `;
};

const montarSelectConsulta = (page, limit, search) => {
  const offset = (page - 1) * limit;
  const sql = montarSelectConsultaBase(search);
  return `${sql} order by us.nome, u.nome limit ${limit} offset ${offset}`;
};

exports.consultarUsuarios = async (req, res, next) => {
  try {
    const {
      page = 1, itemsPerPage: limit = 10, search = '',
    } = req.query;
    const sqlCountUsuarios = montarSelectConsultaBase(search).replace('*', 'count(1)');
    const sqlUsuarios = montarSelectConsulta(page, limit, search)
      .replace('*', 'u.*, us.id as "unidadeSaudeId", us.nome as "unidadeSaudeNome"');
    const [{ count: totalUsuarios }] = await models.sequelize.query(sqlCountUsuarios,
      { type: Sequelize.QueryTypes.SELECT });
    const usuarios = await models.sequelize.query(sqlUsuarios,
      { type: Sequelize.QueryTypes.SELECT });

    return res.json({ count: parseInt(totalUsuarios, 10), data: usuarios });
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      nome, email, unidadeSaudeId, permissoes,
    } = req.body;
    const token = await AuthAPI.login().then((t) => t.access_token);

    await UserApi.create(nome.toUpperCase(), email.toLowerCase(), token);
    const [userKeycloak] = await UserApi.listarUsuarios(email, token);
    if (!userKeycloak) return res.status(404).json({ error: 'Ocorreu um erro na criação do usuário.' });
    const keycloakUserId = userKeycloak.id;
    await UserApi.joinRoles(keycloakUserId, permissoes, token);
    const user = await models.User.create({ nome, email, keycloakUserId });
    await models.UserUnidadeSaude.create({ userId: user.id, unidadeSaudeId });
    return res.status(201).send();
  } catch (err) {
    return next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [user] = await models.sequelize.query(
      `select u.*, us.id as "unidadeSaudeId", us.nome as "unidadeSaudeNome", '' as permissoes from  "User" u
    left outer join "UserUnidadeSaude" uus on uus."userId" = u.id
    left outer join "UnidadeSaude" us on us.id = uus."unidadeSaudeId"
    where u."deletedAt" is null and u.id = '${id}'`,
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const userRoles = await UserApi.listarUserRoles(user.keycloakUserId);
    user.permissoes = userRoles.map((r) => r.name);
    return res.json({ data: user });
  } catch (err) {
    return next(err);
  }
};

const atualizaVinculoUnidade = async (userId, unidadeSaudeId) => {
  const userUnidade = await models.UserUnidadeSaude.findOne({ where: { userId } });
  if (userUnidade) {
    if (userUnidade.unidadeSaudeId === unidadeSaudeId) return;
    await userUnidade.destroy();
  }
  await models.UserUnidadeSaude.create({ userId, unidadeSaudeId });
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      nome, email, unidadeSaudeId, permissoes,
    } = req.body;
    const token = await AuthAPI.login().then((t) => t.access_token);
    const [userKeycloak] = await UserApi.listarUsuarios(email, token);
    if (!userKeycloak) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const keycloakUserId = userKeycloak.id;
    await UserApi.update(keycloakUserId, nome, token);
    await UserApi.joinRoles(keycloakUserId, permissoes, token, true);
    await models.User.update({ nome }, {
      where: { id },
      individualHooks: true,
    });
    await atualizaVinculoUnidade(id, unidadeSaudeId);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await models.User.findOne({
      where: { id },
    });
    if (user === null) return res.status(404).json({ error: 'User not found!' });
    await UserApi.delete(user.keycloakUserId);
    await models.User.update({ deletedAt: Sequelize.literal('CURRENT_TIMESTAMP') }, {
      where: { id },
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
};

exports.findByEmail = async (req, res) => {
  const { email } = req.params;
  const user = await models.User.findOne({
    where: { email },
  });
  if (user === null) return res.status(404).json({ error: 'User not found!' });
  return res.json({ data: user });
};

exports.getAllKeycloakUsers = async (_req, res, next) => {
  try {
    const users = await UserApi.listarUsuarios();
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateKeyckoakUsers = async (_req, res, next) => {
  try {
    const users = await UserApi.listarUsuarios();
    users.map(async (u) => {
      const { email } = u;
      const userParams = {
        keycloakUserId: u.id,
        nome: `${u.firstName.toUpperCase()} ${u.lastName.toUpperCase()}`.trim(),
      };
      await models.User.update(userParams, {
        where: { email },
      });
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getRoles = async (_req, res, next) => {
  try {
    const roles = await UserApi.listarRoles();
    res.json({ data: roles });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getUserRoles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roles = await UserApi.listarUserRoles(id);
    res.json({ data: roles });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
