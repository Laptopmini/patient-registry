# Patient Registry

A patient management dashboard for a medical practice, built with FastAPI, PostgreSQL and React (TypeScript).

> 🚧 Work in progress. The setup, architecture and API documentation will be added as the stages are completed. See [`docs/PLAN.md`](docs/PLAN.md).

- Requirements: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- Architecture decisions: [`docs/decisions/`](docs/decisions/README.md)

All patient data in this repository is synthetic, generated with Faker.

## Patient summary

The summary narrative uses a deterministic template by default. To use the Anthropic provider (`ANTHROPIC_MODEL`, default `claude-haiku-5-5`), set `ANTHROPIC_API_KEY` and turn on `summary-provider-anthropic` in `flags/flags.json`; any provider failure or refusal falls back to the template. Sending patient data to a third-party model requires a business associate agreement (BAA) in production.

## Testing

`make check` runs lint, typecheck and tests. `make eval` runs the summary narrative eval (`apps/api/evals/summary/`): code graders plus an optional LLM judge over about 25 synthetic cases. Without `ANTHROPIC_API_KEY` it is a dry run that makes no API calls and prints the estimated cost of a paid run; results of paid runs go to the git-ignored `apps/api/evals/results/`.
