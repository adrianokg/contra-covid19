<template>
  <section style="margin-top: 45px;">
    <header-title
      title="Unidades de Saúde"
      :showIcon="false"
      :showCadButton="true"
      cadRoute="unidades-saude-form"
    />
    <unidade-saude-table
      @erro:consultaUnidadeSaude="mostrarMensagemErro"
      @delete:unidadeSaude="mostrarMensagemSucesso"
      @erro:deleteUnidadeSaude="mostrarMensagemErro"
    />
    <v-snackbar v-model="showError" color="error" bottom>{{ this.mensagemErro }}</v-snackbar>
    <v-snackbar
      v-model="showSuccess"
      class="unidade-cons__snack-success"
      color="success"
      bottom
    >{{ this.mensagemSucesso }}</v-snackbar>
  </section>
</template>

<script>
import HeaderTitle from '@/components/commons/HeaderTitle.vue';
import UnidadeSaudeTable from '@/components/UnidadeSaude/UnidadeSaudeTable.vue';

export default {
  components: {
    HeaderTitle,
    UnidadeSaudeTable,
  },
  data: () => ({
    showError: false,
    showSuccess: false,
    mensagemSucesso: '',
    mensagemErro: '',
  }),
  methods: {
    mostrarMensagemErro(msg) {
      this.showError = true;
      this.mensagemErro = msg;
    },
    mostrarMensagemSucesso(msg) {
      this.showSuccess = true;
      this.mensagemSucesso = msg;
    },
  },
  beforeRouteEnter(to, from, next) {
    const { msg } = to.params;
    let enter = true;
    if (msg) {
      enter = (vm) => vm.mostrarMensagemSucesso(msg);
    }
    next(enter);
  },
};
</script>
<style lang="sass" scoped>
.unidade-cons
  &__snack-success
    &::v-deep .v-snack__content
      justify-content: center
</style>
