const { Readable, Transform } = require('stream');
const ExportaNotificacaoRepository = require('../repositories/exporta-notificacao-repository');
const Stopwatch = require('../lib/stopwatch');

const transformCSV = () => {
  let headerSeted = false;
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    transform(chunk, _encoding, callback) {
      let data = '';
      if (!headerSeted) {
        const cabecalhos = ExportaNotificacaoRepository
          .cabecalhosExportacao
          .map((n) => n.header).join(',');
        data += `${cabecalhos}\n`;
        headerSeted = true;
      }
      const dataCSV = Object.values(chunk).join(',');
      data += `${dataCSV}\n`;
      callback(null, data);
    },
  });
};

const createReadableStream = (notificacoes) => new Readable({
  objectMode: true,
  read() {
    [...notificacoes, null].map((n) => this.push(n));
  },
});

exports.exportarNotificacoes = async (req, res, next) => {
  try {
    const sw = new Stopwatch();
    sw.start();
    const [
      dataInicialFiltro, dataFinalFiltro, dataEvolucaoInicialFiltro, dataEvolucaoFinalFiltro,
    ] = ExportaNotificacaoRepository.retornarFiltrosData(req.query);
    const [notificacoes] = await ExportaNotificacaoRepository.consultarNotificacoes(
      dataInicialFiltro, dataFinalFiltro, dataEvolucaoInicialFiltro, dataEvolucaoFinalFiltro,
    );

    const rows = ExportaNotificacaoRepository.retornarRowsNotificacaoExcel(notificacoes);
    const notificacoesStream = createReadableStream(rows);
    res.on('finish', () => {
      sw.stop();
      sw.summary();
    });
    notificacoesStream.pipe(transformCSV()).pipe(res);
  } catch (err) {
    console.error(err);
    next(err);
  }
};
