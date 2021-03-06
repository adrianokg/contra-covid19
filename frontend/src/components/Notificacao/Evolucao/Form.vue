<template>
  <v-card class="mx-auto" width="350">
    <v-card-title>
      <h3 class="primary--text">Atualização</h3>
    </v-card-title>
    <v-container fluid>
      <v-form ref="form">
        <v-row align="center">
          <v-col>
            <v-text-field
              :value="evolucao.dataHoraAtualizacao"
              label="Data e hora da evolução *"
              v-mask="'##/##/#### ##:##'"
              validate-on-blur
              :disabled="disableFields"
              :rules="rules.dataHoraAtualizacao"
              @input="updateDataHoraAtualizacao"
              required
              append-icon="mdi-calendar-blank"
              autofocus
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col>
            <v-autocomplete
              :value="evolucao.situacao"
              :rules="rules.situacao"
              label="Condição atual do paciente *"
              :items="situacoes.items"
              item-text="value"
              item-value="key"
              :loading="situacoes.loading"
              :disabled="disableFields"
              no-data-text="Condição atual do paciente não encontrada"
              @input="updateSituacao"
            />
          </v-col>
        </v-row>
        <v-card-actions>
          <v-row align="center" justify="end">
            <v-col cols="auto">
              <v-btn
                color="primary"
                rounded
                :disabled="disableFields || disableButton"
                @click="cadastrarEvolucao"
              >Incluir</v-btn>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-form>
    </v-container>
  </v-card>
</template>
<script>
import { required, dateHourMinuteFormat, greaterThanMinimumDateWithMinutes } from '@/validations/CommonValidations';
import { mask } from 'vue-the-mask';
import NotificacaoEvolucao,
{
  situacoesPacienteSuspeitoList, situacoesPacienteConfirmadoList,
  situacoesList, situacoesQueEncerramFichaList,
}
  from '@/entities/NotificacaoEvolucao';
import EvolucaoService from '@/services/EvolucaoService';
import ErrorService from '@/services/ErrorService';

export default {
  directives: { mask },
  props: {
    notificacaoId: {
      type: String,
      required: true,
    },
    dataMaximaPermitida: {
      type: String,
    },
    ultimaSituacaoEvolucao: {
      type: String,
    },
  },
  data: () => ({
    evolucao: new NotificacaoEvolucao(),
    situacoes: {
      items: [],
      loading: true,
    },
    rules: {
      dataHoraAtualizacao: [dateHourMinuteFormat],
      situacao: [required],
    },
    disableFields: false,
    disableButton: false,
  }),
  methods: {
    loadSituacoes(ultimaSituacaoEvolucao) {
      this.situacoes.loading = true;
      this.situacoes.items = situacoesList;

      if (ultimaSituacaoEvolucao === 'Suspeito') {
        this.situacoes.items = situacoesPacienteSuspeitoList;
      } else if (ultimaSituacaoEvolucao === 'Confirmado') {
        this.situacoes.items = situacoesPacienteConfirmadoList;
      }
      this.disableFields = (situacoesQueEncerramFichaList
        .some((data) => data.value.toUpperCase()
        === ultimaSituacaoEvolucao.toUpperCase()));

      this.situacoes.loading = false;
    },
    updateDataHoraAtualizacao(dataHoraAtualizacao) {
      this.evolucao.dataHoraAtualizacao = dataHoraAtualizacao;
    },
    updateSituacao(situacao) {
      this.evolucao.situacao = situacao;
    },
    validatePastDate(value) {
      return greaterThanMinimumDateWithMinutes(value,
        this.dataMaximaPermitida, 'Informe uma data igual ou posterior a última notificação.');
    },
    obterMensagemDeSucesso() {
      if (situacoesQueEncerramFichaList.some((data) => data.value.toUpperCase()
        === this.evolucao.situacao.toUpperCase())) {
        return 'Notificação encerrada com sucesso.';
      }
      return 'Evolução cadastrada com sucesso.';
    },
    cadastrarEvolucao() {
      this.rules.dataHoraAtualizacao.push(required);
      if (this.$refs.form.validate()) {
        this.disableButton = true;
        const requestEvolucao = this.evolucao.toRequest();
        requestEvolucao.notificacaoId = this.notificacaoId;
        EvolucaoService.save(requestEvolucao).then(() => {
          this.disableButton = false;
          const msg = this.obterMensagemDeSucesso();
          this.$refs.form.reset();
          this.$emit('cadastro:evolucao', msg);
        }).catch((error) => {
          this.disableButton = false;
          this.$emit('error:cadastroEvolucao', ErrorService.getMessage(error));
        });
      }
      this.rules.dataHoraAtualizacao.pop();
    },
  },
  watch: {
    ultimaSituacaoEvolucao(ultimaSituacaoEvolucao) {
      this.loadSituacoes(ultimaSituacaoEvolucao);
    },
  },
  created() {
    this.rules.dataHoraAtualizacao.push(this.validatePastDate);
  },
};
</script>
