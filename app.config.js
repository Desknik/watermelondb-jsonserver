// app.config.js
// Configuração dinâmica do Expo usando variáveis de ambiente

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      API_URL: process.env.API_URL || 'http://localhost:3000',
    },
  };
};
