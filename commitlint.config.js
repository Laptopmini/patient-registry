export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['api', 'web', 'adr', 'design', 'ci', 'docker', 'deps', 'agents']],
  },
};
