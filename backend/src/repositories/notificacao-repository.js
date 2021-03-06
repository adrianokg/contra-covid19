const Sequelize = require('sequelize');
const models = require('../models');
const tpTransmissaoApiSecretaria = require('../enums/tipo-transmissao-api-secretaria-enum');

const { Op } = Sequelize;

module.exports.cadastrarEvolucao = async (evolucao, transaction) => models.NotificacaoEvolucao
  .create(evolucao, { transaction });

module.exports.getEvolucoesPorNotificacaoId = async (id) => models.Notificacao.findOne({
  where: { id },
  attributes: ['id', 'status'],
  include: [{
    model: models.Pessoa,
    attributes: ['nome', 'tipoDocumento', 'numeroDocumento', 'telefoneResidencial', 'telefoneContato', 'telefoneCelular'],
  },
  { model: models.NotificacaoEvolucao },
  ],
});

module.exports.deletarEvolucaoPorId = async (id, transaction) => {
  models.NotificacaoEvolucao.destroy({
    where: {
      id,
    },
  },
  {
    transaction,
  });
};

module.exports.atualizarEvolucaoPorId = async (evolucao, transaction) => {
  models.NotificacaoEvolucao.update(
    { ...evolucao },
    {
      where: {
        id: evolucao.id,
      },
    },
    {
      transaction,
    },
  );
};

module.exports.getPorId = async (id) => models.Notificacao.findOne({
  where: { id },
  include: [
    {
      model: models.Pessoa,
      include: [
        { model: models.Bairro },
        { model: models.Municipio },
        { model: models.Ocupacao },
        { model: models.Pais, as: 'Pais' },
      ],
    },
    {
      model: models.NotificacaoCovid19,
      include: [
        { model: models.Exame },
        { model: models.ResultadoExame },
        {
          model: models.UnidadeSaude,
          as: 'Hospital',
          include: [{ model: models.Municipio }],
        },
        { model: models.UnidadeSaude, as: 'Laboratorio' },
        { model: models.UnidadeSaude, as: 'UnidadeFrequentada' },
      ],
    },
    { model: models.NotificacaoEvolucao },
    { model: models.Municipio },
    { model: models.UnidadeSaude },
    { model: models.User },
    { model: models.ProfissionalSaude },
    { model: models.Profissao },
  ],
});

module.exports.getFechamentosPorNotificacaoId = async (id) => models.NotificacaoEvolucao.findAll({
  where: { notificacaoId: id, dtfechamento: { [Op.ne]: null } },
});

module.exports.getPorPessoaDocumento = async (where) => {
  const { tipoDocumento, numeroDocumento, status = 'ABERTA' } = where;

  return models.Notificacao.findAll({
    where: {
      status,
    },
    include: {
      model: models.Pessoa,
      where: {
        [Op.and]: [{
          tipoDocumento,
        }, {
          numeroDocumento,
        }],
      },
      attributes: ['tipoDocumento', 'numeroDocumento'],
    },
  });
};

exports.atualizar = async (notificacao) => {
  const { id } = notificacao;
  models.Notificacao.update(
    { ...notificacao },
    { where: { id } },
  );
};

exports.getNotificacoesPendentesEnvioSecretariaPorIds = async (ids) => models.Notificacao.findAll({
  where: {
    id: ids,
  },
  include: [
    {
      model: models.Pessoa,
      include: [
        { model: models.Bairro },
        { model: models.Municipio },
        { model: models.Ocupacao },
        { model: models.Pais, as: 'Pais' },
      ],
    },
    {
      model: models.NotificacaoEvolucao,
    },
    {
      model: models.NotificacaoCovid19,
      include: [
        { model: models.Exame },
        { model: models.ResultadoExame },
        {
          model: models.UnidadeSaude,
          as: 'Hospital',
          include: [{ model: models.Municipio }],
        },
        { model: models.UnidadeSaude, as: 'Laboratorio' },
        { model: models.UnidadeSaude, as: 'UnidadeFrequentada' },
      ],
      where: {
        [Op.and]: [
          {
            [Op.or]:
                [
                  {
                    tpTransmissaoApiSecretaria:
                      tpTransmissaoApiSecretaria.values.PendenteEnvio,
                  },
                  {
                    tpTransmissaoApiSecretaria:
                      tpTransmissaoApiSecretaria.values.PendenteAtualizacao,
                  },
                  {
                    tpTransmissaoApiSecretaria: null,
                  },
                ],
          },
        ],
      },
    },
    { model: models.Municipio },
    {
      model: models.UnidadeSaude,
      include: [
        { model: models.Municipio },
      ],
    },
    { model: models.User },
    { model: models.ProfissionalSaude },
    { model: models.Profissao },
  ],
});

exports.getNotificacoesPendentesEnvioSecretaria = async (page = 1, limit = 50, search = '', unidadeId) => {
  const offset = (page - 1) * limit;
  const filtroPadrao = {
    [Op.or]: [
      {
        tpTransmissaoApiSecretaria: tpTransmissaoApiSecretaria.values.PendenteEnvio,
      },
      {
        tpTransmissaoApiSecretaria: tpTransmissaoApiSecretaria.values.PendenteAtualizacao,
      },
      {
        tpTransmissaoApiSecretaria: null,
      },
    ],
  };
  const filtros = [filtroPadrao];

  if (unidadeId) {
    const filtroUnidade = Sequelize.where(Sequelize.col('Notificacao.UnidadeSaude.id'), unidadeId);
    filtros.push(filtroUnidade);
  }

  if (search !== '') {
    const filtroSearch = {
      [Op.or]: [
        Sequelize.where(
          Sequelize.fn('upper', Sequelize.col('Notificacao.Pessoa.nome')),
          {
            [Op.like]: `%${search.toUpperCase()}%`,
          },
        ),
        Sequelize.where(
          Sequelize.fn('upper', Sequelize.col('Notificacao.Pessoa.numeroDocumento')),
          {
            [Op.like]: `%${search.toUpperCase()}%`,
          },
        ),
      ],
    };
    filtros.push(filtroSearch);
  }

  const filtroConsulta = {
    where: { [Op.and]: [...filtros] },
  };

  return models.NotificacaoCovid19.findAndCountAll({
    where: filtroConsulta.where,
    attributes: ['id', 'notificacaoId', 'tpTransmissaoApiSecretaria'],
    include: [
      {
        model: models.Notificacao,
        attributes: ['id', 'unidadeSaudeId', 'pessoaId'],
        include: [
          {
            model: models.Pessoa,
            attributes: ['nome', 'numeroDocumento', 'tipoDocumento'],
          },
          {
            model: models.UnidadeSaude,
            attributes: ['nome'],
          },
        ],
      },
    ],
    limit,
    offset,
    order: [['createdAt', 'ASC']],
  });
};

module.exports.getNotificacoesPorPeriodo = async (periodo, page = 1, limit = 500) => {
  const offset = (page - 1) * limit;
  const where = periodo ? { createdAt: { [Op.gte]: periodo } } : {};
  where.status = { [Op.ne]: 'EXCLUIDA' };
  return models.Notificacao.findAndCountAll({
    where,
    include: [
      {
        model: models.Pessoa,
        where: { tipoDocumento: { [Op.eq]: 'CPF' } },
        include: [
          { model: models.Bairro },
          { model: models.Municipio },
          { model: models.Ocupacao },
          { model: models.Pais, as: 'Pais' },
        ],
      },
      { model: models.NotificacaoEvolucao },
      {
        model: models.NotificacaoCovid19,
        where: { apiSecretariaId: { [Op.eq]: null } },
      },
      { model: models.Municipio },
      { model: models.UnidadeSaude },
      { model: models.User },
      { model: models.ProfissionalSaude },
      { model: models.Profissao },
    ],
    limit,
    offset,
  });
};
