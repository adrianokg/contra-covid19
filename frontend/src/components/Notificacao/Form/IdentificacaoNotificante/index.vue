<template>
  <div class="px-2">
    <h4 class="primary--text font-weight-medium title">1. IDENTIFICAÇÃO DO NOTIFICANTE</h4>
    <div>
      <v-row dense>
        <v-col cols="12" sm="12">
          <v-autocomplete
            :value="notificacao.unidadeSaudeId"
            :rules="rules.unidadeSaudeId"
            label="Unidade notificante *"
            :items="unidadesSaude.items"
            @update:search-input="searchUnidadeSaude"
            item-text="nome"
            item-value="id"
            :loading="unidadesSaude.loading"
            no-data-text="Unidade de saúde não encontrada"
            @input="updateUnidadeSaude"
            :disabled="!isPermiteEscolherUnidadeSaudade() || disabled"
          />
        </v-col>
      </v-row>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field
            :value="notificacao.nomeNotificador"
            :rules="rules.nomeNotificador"
            label="Nome do notificador *"
            @input="updateNomeNotificador"
            :disabled="disabled"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-autocomplete
            :value="notificacao.profissaoId"
            :rules="rules.profissaoId"
            label="Profissão do notificador *"
            :items="profissoes.items"
            @update:search-input="searchProfissoes"
            item-text="nome"
            item-value="id"
            :loading="profissoes.loading"
            no-data-text="Profissão não encontrada"
            @input="updateProfissaoId"
            :disabled="disabled"
          />
        </v-col>
      </v-row>
    </div>
  </div>
</template>
<script>
import {
  required, minLength, maxLength, onlyLetters,
} from '@/validations/CommonValidations';
import Notificacao from '@/entities/Notificacao';
import ProfissaoService from '@/services/ProfissaoService';
import UnidadeSaudeService from '@/services/UnidadeSaudeService';
import keycloak from '@/services/KeycloakService';

export default {
  props: {
    notificacao: {
      type: Notificacao,
      required: true,
    },
    disabled: {
      type: Boolean,
      defaultValue: false,
    },
  },
  data: () => ({
    unidadesSaude: {
      items: [],
      loading: false,
    },
    searchUnidade: null,
    unidadeSelected: null,
    profissoes: {
      items: [],
      loading: true,
    },
    searchProfissao: null,
    profissaoSelected: null,
    rules: {
      unidadeSaudeId: [required],
      profissaoId: [required],
      nomeNotificador: [required, onlyLetters, maxLength(80), minLength(3)],
    },
  }),
  watch: {
    notificacao(notificacao) {
      this.notificacao.unidadeSaudeId = notificacao.unidadeSaudeId;
      this.findUnidadesDeSaude(notificacao.unidadeSaudeNome);
    },
  },
  methods: {
    updateUnidadeSaude(unidadeSaudeId) {
      this.$emit('update:unidadeSaudeId', unidadeSaudeId);
    },
    updateNomeNotificador(nomeNotificador) {
      this.$emit('update:nomeNotificador', nomeNotificador);
    },
    updateProfissaoId(profissaoId) {
      this.$emit('update:profissaoId', profissaoId);
    },
    findProfissoes(searchProfissao = '') {
      this.profissoes.loading = true;
      ProfissaoService.findAll(searchProfissao)
        .then(({ data }) => {
          this.profissoes.items = data;
        })
        .finally(() => { this.profissoes.loading = false; });
    },
    searchProfissoes(search = '') {
      if (search === this.searchProfissao) return;
      this.searchProfissao = search ? search.trim().toUpperCase() : '';
      this.findProfissoes(this.searchProfissao);
    },
    findUnidadesDeSaude(searchUnidade = '') {
      if (this.unidadesSaude.loading) return;
      this.unidadesSaude.loading = true;
      UnidadeSaudeService.findAll(searchUnidade)
        .then(({ data }) => {
          this.unidadesSaude.items = data;
        })
        .finally(() => {
          this.unidadesSaude.loading = false;
        });
    },
    loadUnidadesDeSaudeUserLogged() {
      if (this.unidadesSaude.loading) return;
      this.unidadesSaude.loading = true;
      UnidadeSaudeService.findByUserEmail(keycloak.tokenParsed.email)
        .then(({ data }) => {
          this.notificacao.unidadeSaudeId = data[0].id;
          this.searchUnidade = data[0].nome;
          this.unidadesSaude.items = data;
        })
        .finally(() => {
          this.unidadesSaude.loading = false;
        });
    },
    searchUnidadeSaude(search = '') {
      if (search === this.searchUnidade) return;
      this.searchUnidade = search ? search.trim().toUpperCase() : '';
      this.findUnidadesDeSaude(this.searchUnidade);
    },
    isPermiteEscolherUnidadeSaudade() {
      return keycloak.realmAccess.roles.includes('SECRETARIA_SAUDE');
    },
  },
  created() {
    this.findProfissoes();
    this.loadUnidadesDeSaudeUserLogged();
  },
};
</script>
