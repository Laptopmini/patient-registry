"""Summary narrative eval runner.

    uv run python -m evals.summary.run [--dry-run] [--judge]

Dry run (the default when ANTHROPIC_API_KEY is unset) validates the cases, grades the template
provider's output with the code graders and prints the estimated cost of a paid run. A paid run
calls the real AnthropicProvider (production client, model and prompt) and writes results under
`evals/results/` (git-ignored). Case bodies are synthetic; nothing is logged.
"""

import argparse
import asyncio
import json
import os
import sys
import time
import uuid
from collections.abc import Sequence
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import anthropic

from app.config import Settings
from app.summary.anthropic_provider import SYSTEM_PROMPT, AnthropicProvider, build_notes_block
from app.summary.base import NoteForSummary, SummaryUnavailableError
from app.summary.template import TemplateProvider
from evals.summary import graders
from evals.summary.cases import Case, load_cases
from evals.summary.judge import JUDGE_MODEL, RUBRIC, Verdict, judge, judge_prompt

RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
MAX_CONCURRENCY = 4
CHARS_PER_TOKEN = 4

# Assumed list prices in USD per million tokens (input, output); check the pricing page.
PRICES_PER_MTOK = {"haiku": (1.0, 5.0), JUDGE_MODEL: (5.0, 25.0)}
ASSUMED_NARRATIVE_TOKENS = 300
ASSUMED_VERDICT_TOKENS = 120


def default_model() -> str:
    return os.environ.get("ANTHROPIC_MODEL") or str(
        Settings.model_fields["anthropic_model"].default
    )


def to_summary_notes(case: Case) -> list[NoteForSummary]:
    return [
        NoteForSummary(uuid.uuid5(uuid.NAMESPACE_OID, f"{case.id}/{i}"), n.recorded_at, n.body)
        for i, n in enumerate(case.notes)
    ]


def to_grader_notes(case: Case) -> list[graders.Note]:
    return [graders.Note(n.recorded_at, n.body) for n in case.notes]


@dataclass
class Recorded:
    """What the SDK call looked like, captured by the recording client."""

    request_text: str = ""
    model: str = ""
    stop_reason: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0


class _RecordingMessages:
    def __init__(self, inner: anthropic.AsyncAnthropic, record: Recorded) -> None:
        self._inner = inner
        self._record = record

    async def parse(self, **kwargs: Any) -> Any:
        messages = kwargs.get("messages", [])
        self._record.request_text = "\n".join(str(m["content"]) for m in messages)
        response = await self._inner.messages.parse(**kwargs)
        self._record.model = response.model
        self._record.stop_reason = response.stop_reason
        self._record.input_tokens = response.usage.input_tokens
        self._record.output_tokens = response.usage.output_tokens
        return response


class RecordingClient:
    """Delegates `messages.parse` to the real client and records model, stop reason and usage."""

    def __init__(self, inner: anthropic.AsyncAnthropic) -> None:
        self.recorded = Recorded()
        self.messages = _RecordingMessages(inner, self.recorded)


@dataclass
class CaseResult:
    id: str
    tags: list[str]
    narrative: str | None = None
    error: str | None = None
    model: str = ""
    stop_reason: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    latency_s: float = 0.0
    graders: list[graders.GradeResult] = field(default_factory=lambda: [])
    verdict: Verdict | None = None
    judge_error: str | None = None
    judge_input_tokens: int = 0
    judge_output_tokens: int = 0


def _grade(case: Case, narrative: str, request_text: str) -> list[graders.GradeResult]:
    return graders.run_code_graders(narrative, to_grader_notes(case), case.tags, request_text)


async def run_dry(cases: Sequence[Case]) -> list[CaseResult]:
    provider = TemplateProvider()
    results: list[CaseResult] = []
    for case in cases:
        notes = to_summary_notes(case)
        narrative = await provider.generate(notes)
        result = CaseResult(case.id, case.tags, narrative=narrative, model=provider.name)
        result.graders = _grade(case, narrative, build_notes_block(notes))
        results.append(result)
    return results


async def _run_case(
    case: Case,
    client: anthropic.AsyncAnthropic,
    model: str,
    with_judge: bool,
    sem: asyncio.Semaphore,
) -> CaseResult:
    result = CaseResult(case.id, case.tags)
    notes = to_summary_notes(case)
    recording = RecordingClient(client)
    provider = AnthropicProvider(cast(anthropic.AsyncAnthropic, recording), model)
    async with sem:
        started = time.perf_counter()
        try:
            result.narrative = await provider.generate(notes)
        except SummaryUnavailableError:
            result.error = "SummaryUnavailableError"
        result.latency_s = round(time.perf_counter() - started, 3)
        rec = recording.recorded
        result.model, result.stop_reason = rec.model, rec.stop_reason
        result.input_tokens, result.output_tokens = rec.input_tokens, rec.output_tokens
        if result.narrative is None:
            return result
        result.graders = _grade(
            case, result.narrative, rec.request_text or build_notes_block(notes)
        )
        if with_judge:
            try:
                verdict, usage = await judge(client, build_notes_block(notes), result.narrative)
            except anthropic.APIError as exc:
                result.judge_error = type(exc).__name__
            else:
                result.verdict = verdict
                result.judge_input_tokens = usage.input_tokens
                result.judge_output_tokens = usage.output_tokens
                if verdict is None:
                    result.judge_error = "no verdict"
    return result


async def run_paid(
    cases: Sequence[Case], client: anthropic.AsyncAnthropic, model: str, with_judge: bool
) -> list[CaseResult]:
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    return list(
        await asyncio.gather(*(_run_case(c, client, model, with_judge, sem) for c in cases))
    )


def _tokens(text: str) -> int:
    return -(-len(text) // CHARS_PER_TOKEN)


def _price(model: str) -> tuple[float, float]:
    return PRICES_PER_MTOK["haiku"] if "haiku" in model else PRICES_PER_MTOK[JUDGE_MODEL]


def estimate_cost(cases: Sequence[Case], model: str, with_judge: bool) -> dict[str, float]:
    """Rough USD cost of one paid run, from characters/4 and assumed prices and output sizes."""
    gen_in = gen_out = judge_in = judge_out = 0
    for case in cases:
        block = build_notes_block(to_summary_notes(case))
        gen_in += _tokens(SYSTEM_PROMPT) + _tokens(block)
        gen_out += ASSUMED_NARRATIVE_TOKENS
        if with_judge:
            judge_in += _tokens(RUBRIC) + _tokens(
                judge_prompt(block, "x" * ASSUMED_NARRATIVE_TOKENS * 4)
            )
            judge_out += ASSUMED_VERDICT_TOKENS
    gp, jp = _price(model), _price(JUDGE_MODEL)
    generation = (gen_in * gp[0] + gen_out * gp[1]) / 1e6
    judging = (judge_in * jp[0] + judge_out * jp[1]) / 1e6
    return {
        "generation_input_tokens": gen_in,
        "generation_output_tokens": gen_out,
        "judge_input_tokens": judge_in,
        "judge_output_tokens": judge_out,
        "generation_usd": round(generation, 4),
        "judge_usd": round(judging, 4),
        "total_usd": round(generation + judging, 4),
    }


def grader_pass_rates(results: Sequence[CaseResult]) -> dict[str, tuple[int, int]]:
    rates: dict[str, list[int]] = {}
    for r in results:
        for g in r.graders:
            counts = rates.setdefault(g.name, [0, 0])
            counts[0] += g.passed
            counts[1] += 1
    return {k: (v[0], v[1]) for k, v in rates.items()}


def judge_pass_rates(results: Sequence[CaseResult]) -> dict[str, tuple[int, int]]:
    judged = [r.verdict for r in results if r.verdict is not None]
    return {
        name: (sum(getattr(v, name) for v in judged), len(judged))
        for name in ("faithful", "covers_latest", "neutral")
    }


def render_markdown(
    results: Sequence[CaseResult], mode: str, model: str, cost: dict[str, float]
) -> str:
    lines = [f"# Summary eval ({mode})", "", f"- model: `{model}`", f"- cases: {len(results)}", ""]
    lines += ["## Code graders", "", "| grader | passed |", "|---|---|"]
    lines += [f"| {k} | {p}/{n} |" for k, (p, n) in grader_pass_rates(results).items()]
    judge_rates = judge_pass_rates(results)
    if any(n for _, n in judge_rates.values()):
        lines += ["", "## Judge", "", "| criterion | passed |", "|---|---|"]
        lines += [f"| {k} | {p}/{n} |" for k, (p, n) in judge_rates.items()]
    failures = [(r.id, g.name, g.detail) for r in results for g in r.graders if not g.passed]
    failures += [(r.id, "provider", r.error) for r in results if r.error]
    if failures:
        lines += ["", "## Failures", ""]
        lines += [f"- `{cid}` {name}: {detail}" for cid, name, detail in failures]
    lines += ["", "## Cost", ""]
    lines += [f"- estimated paid run: ${cost['total_usd']:.4f}"]
    return "\n".join(lines) + "\n"


def write_results(
    results: Sequence[CaseResult], markdown: str, mode: str, model: str, directory: Path
) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = directory / f"{stamp}.json"
    payload = {"mode": mode, "model": model, "results": [asdict(r) for r in results]}
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    path.with_suffix(".md").write_text(markdown, encoding="utf-8")
    return path


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument("--dry-run", action="store_true", help="no API calls (default without key)")
    parser.add_argument("--judge", action="store_true", help="grade with the LLM judge")
    args = parser.parse_args(argv)

    cases = load_cases()
    key = os.environ.get("ANTHROPIC_API_KEY")
    dry = args.dry_run or not key
    model = default_model()
    cost = estimate_cost(cases, model, args.judge)

    if dry:
        if not args.dry_run:
            print("ANTHROPIC_API_KEY is not set: running the dry run (no API calls).")
        results = asyncio.run(run_dry(cases))
        mode = "dry-run"
        print(f"Validated {len(cases)} cases. Graders on template provider output:")
        for name, (passed, total) in grader_pass_rates(results).items():
            print(f"  {name}: {passed}/{total}")
        print(
            f"Estimated paid run ({model}{' + ' + JUDGE_MODEL if args.judge else ''}): "
            f"${cost['total_usd']:.4f} (generation ${cost['generation_usd']:.4f}, "
            f"judge ${cost['judge_usd']:.4f}; assumed prices, rough token counts)"
        )
        failed = any(not g.passed for r in results for g in r.graders)
        return 1 if failed else 0

    client = anthropic.AsyncAnthropic(api_key=key, timeout=20.0, max_retries=2)
    results = asyncio.run(run_paid(cases, client, model, args.judge))
    mode = "paid"
    markdown = render_markdown(results, mode, model, cost)
    path = write_results(results, markdown, mode, model, RESULTS_DIR)
    print(markdown)
    print(f"Results written to {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
