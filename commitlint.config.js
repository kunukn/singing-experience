export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    /* Body line length gates nothing in our tooling and generated bodies don't hard-wrap. */
    'body-max-line-length': [0, 'always', 100],
  },
}
