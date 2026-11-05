import { defineConfig } from 'orval';

const input = '../api/openapi.json';

export default defineConfig({
  client: {
    input,
    output: {
      target: 'src/api/generated/client.ts',
      schemas: 'src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      mode: 'single',
      clean: true,
      override: {
        mutator: { path: 'src/api/http.ts', name: 'http' },
      },
    },
  },
  zod: {
    input,
    output: {
      target: 'src/api/generated/zod.ts',
      client: 'zod',
      mode: 'single',
    },
  },
});
