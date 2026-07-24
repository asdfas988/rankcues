import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { z } from "zod";

const evidenceSchema = z.object({
  state: z.enum(["detected", "correlated", "hypothesis"]),
  statement: z.string().min(1),
  source: z.string().min(1),
});

export const weeklySeoReportSchema = z.object({
  executiveSummary: z.string().min(1),
  healthScore: z.number().min(0).max(100),
  wins: z.array(z.string().min(1)).max(5),
  risks: z.array(z.string().min(1)).max(5),
  findings: z
    .array(
      z.object({
        title: z.string().min(1),
        impact: z.enum(["high", "medium", "low"]),
        confidence: z.number().min(0).max(1),
        affectedEntity: z.string().min(1),
        evidence: z.array(evidenceSchema).min(1),
        recommendedAction: z.string().min(1),
        verificationWindow: z.string().min(1),
      }),
    )
    .max(8),
});

export type WeeklySeoReport = z.infer<typeof weeklySeoReportSchema>;
export type ReportLocale = "en" | "zh" | "es";

type AiProviderConfig = {
  providerName: string;
  baseURL: string;
  apiKey: string;
  model: string;
  supportsStructuredOutputs: boolean;
  headers: Record<string, string>;
};

function parseCustomHeaders(value: string | undefined) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    throw new Error("AI_CUSTOM_HEADERS_JSON must be a valid JSON object.");
  }
}

function normalizeBaseURL(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("AI_BASE_URL must use http or https.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString().replace(/\/$/, "");
}

export function getAiProviderConfig(): AiProviderConfig | null {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  return {
    providerName: process.env.AI_PROVIDER_NAME || "openai-compatible",
    baseURL: normalizeBaseURL(
      process.env.AI_BASE_URL || "https://api.openai.com/v1",
    ),
    apiKey,
    model: process.env.AI_MODEL || "gpt-5-mini",
    supportsStructuredOutputs:
      process.env.AI_SUPPORTS_STRUCTURED_OUTPUTS === "true",
    headers: parseCustomHeaders(process.env.AI_CUSTOM_HEADERS_JSON),
  };
}

export function getAiProviderPublicStatus() {
  const config = getAiProviderConfig();
  if (!config) {
    return {
      configured: false,
      service: "managed" as const,
      status: "unavailable" as const,
    };
  }

  return {
    configured: true,
    service: "managed" as const,
    status: "ready" as const,
  };
}

function getLanguageModel() {
  const config = getAiProviderConfig();
  if (!config) {
    throw new Error(
      "The managed AI analysis service is temporarily unavailable.",
    );
  }

  const provider = createOpenAICompatible({
    name: "rankcuesRelay",
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    headers: config.headers,
    includeUsage: true,
    supportsStructuredOutputs: config.supportsStructuredOutputs,
  });

  return { config, model: provider(config.model) };
}

function extractJson(text: string) {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI provider did not return a JSON object.");
  }
  return withoutFences.slice(start, end + 1);
}

const systemPrompt = `You are RankCues, an evidence-first SEO investigator.
Never present correlation as proven causation. Every evidence item must be
labelled detected, correlated, or hypothesis. Prefer the smallest number of
high-impact findings. Every recommendation must include a verification window.`;

export function getReportLanguageInstruction(value: unknown) {
  const locale: ReportLocale = value === "zh" || value === "es" ? value : "en";
  const language = locale === "zh" ? "Simplified Chinese" : locale === "es" ? "Spanish" : "English";
  return {
    locale,
    language,
    instruction: `Write all human-readable report content in ${language}. This includes executiveSummary, wins, risks, finding titles, evidence statements, recommendedAction and verificationWindow. Preserve URLs, exact search queries, brand names, metric names, dates, numbers and source identifiers. Keep JSON property names and the detected/correlated/hypothesis and high/medium/low enum values in English so the response remains machine-readable.`,
  };
}

export async function testAiProvider() {
  const { model } = getLanguageModel();
  const result = await generateText({
    model,
    system: "You are a connection test. Follow the requested response exactly.",
    prompt: "Reply with exactly: RANKCUES_OK",
  });

  return {
    ok: result.text.includes("RANKCUES_OK"),
    finishReason: result.finishReason,
  };
}

export async function generateWeeklySeoReport(input: Record<string, unknown>) {
  const { config, model } = getLanguageModel();
  const output = getReportLanguageInstruction(input.outputLocale);
  const prompt = `Create a weekly SEO investigation report from this evidence.
${output.instruction}
Return no more than five findings. Input:\n${JSON.stringify(input, null, 2)}`;

  if (config.supportsStructuredOutputs) {
    const result = await generateText({
      model,
      system: `${systemPrompt}\n${output.instruction}`,
      prompt,
      output: Output.object({
        name: "WeeklySeoReport",
        description: "An evidence-labelled weekly SEO investigation report.",
        schema: weeklySeoReportSchema,
      }),
    });

    return {
      report: result.output,
      usage: result.totalUsage,
      provider: getAiProviderPublicStatus(),
    };
  }

  const result = await generateText({
    model,
    system: `${systemPrompt}\n${output.instruction}\nReturn only valid JSON matching this shape:\n${JSON.stringify(
      {
        executiveSummary: "string",
        healthScore: 72,
        wins: ["string"],
        risks: ["string"],
        findings: [
          {
            title: "string",
            impact: "high | medium | low",
            confidence: 0.82,
            affectedEntity: "URL, query group, or site segment",
            evidence: [
              {
                state: "detected | correlated | hypothesis",
                statement: "string",
                source: "string",
              },
            ],
            recommendedAction: "string",
            verificationWindow: "string",
          },
        ],
      },
      null,
      2,
    )}`,
    prompt,
  });

  const report = weeklySeoReportSchema.parse(
    JSON.parse(extractJson(result.text)) as unknown,
  );

  return {
    report,
    usage: result.totalUsage,
    provider: getAiProviderPublicStatus(),
  };
}

const executionChangeSchema = z.object({
  label: z.string().min(1),
  before: z.string(),
  after: z.string(),
  reason: z.string().min(1),
});

export const wordpressExecutionPlanSchema = z.object({
  summary: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(1),
  changes: z.array(executionChangeSchema).min(1).max(10),
  wordpress: z.object({
    sourceId: z.number().int().positive(),
    type: z.enum(["posts", "pages"]),
    title: z.string().min(1).max(500),
    content: z.string().min(1).max(200_000),
    excerpt: z.string().max(10_000),
  }),
});

export const githubExecutionPlanSchema = z.object({
  summary: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(1),
  changes: z.array(executionChangeSchema).min(1).max(12),
  github: z.object({
    prTitle: z.string().min(1).max(250),
    prBody: z.string().min(1).max(60_000),
    files: z.array(z.object({
      path: z.string().min(1).max(500),
      content: z.string().min(1).max(200_000),
      reason: z.string().min(1),
    })).min(1).max(5),
  }),
});

export type WordPressExecutionPlan = z.infer<typeof wordpressExecutionPlanSchema>;
export type GitHubExecutionPlan = z.infer<typeof githubExecutionPlanSchema>;

function executionLanguage(locale: unknown) {
  const output = getReportLanguageInstruction(locale);
  return `Write plan summaries, rationales, change labels and reasons in ${output.language}. Preserve the original language of the website or source code in all proposed titles, content, excerpts and files.`;
}

export async function generateWordPressExecutionPlan(input: {
  locale: ReportLocale;
  task: {
    title: string;
    description: string;
    recommendation: string;
    evidence: Record<string, unknown>;
  };
  current: {
    id: number;
    type: "posts" | "pages";
    link: string;
    title: string;
    content: string;
    excerpt: string;
  };
}) {
  const { config, model } = getLanguageModel();
  const instruction = `${executionLanguage(input.locale)}
Create a conservative WordPress revision for an approved SEO task.
Return the complete revised title, content and excerpt, not a patch.
Preserve valid HTML, Gutenberg block comments, shortcodes, links, embeds, brand claims and facts.
Do not invent testimonials, statistics, authorship, credentials, products or business claims.
Do not add scripts, iframes, tracking code, remote forms or hidden text.
The output will be saved as a separate WordPress draft; it will not overwrite the live page.`;
  const payload = {
    task: input.task,
    source: {
      ...input.current,
      content: input.current.content.slice(0, 80_000),
      excerpt: input.current.excerpt.slice(0, 10_000),
    },
  };
  if (config.supportsStructuredOutputs) {
    const result = await generateText({
      model,
      system: instruction,
      prompt: `Prepare the execution preview from this approved task and current WordPress content:\n${JSON.stringify(payload, null, 2)}`,
      output: Output.object({
        name: "WordPressExecutionPlan",
        description: "A safe, reviewable WordPress draft plan.",
        schema: wordpressExecutionPlanSchema,
      }),
    });
    return { plan: result.output, usage: result.totalUsage };
  }
  const result = await generateText({
    model,
    system: `${instruction}\nReturn only valid JSON matching the requested structure.`,
    prompt: `Return a WordPress execution plan with keys summary, risk, rationale, changes, and wordpress. The wordpress object must contain sourceId, type, title, content and excerpt.\nInput:\n${JSON.stringify(payload, null, 2)}`,
  });
  return {
    plan: wordpressExecutionPlanSchema.parse(JSON.parse(extractJson(result.text))),
    usage: result.totalUsage,
  };
}

export async function generateGitHubExecutionPlan(input: {
  locale: ReportLocale;
  task: {
    title: string;
    description: string;
    recommendation: string;
    evidence: Record<string, unknown>;
  };
  repository: {
    fullName: string;
    defaultBranch: string;
    files: Array<{ path: string; sha: string; content: string }>;
  };
}) {
  const { config, model } = getLanguageModel();
  const allowedPaths = input.repository.files.map((file) => file.path);
  const instruction = `${executionLanguage(input.locale)}
Create the smallest safe code change for an approved SEO task.
Only edit files listed in allowedPaths. Return complete replacement file contents, not diffs.
Do not edit dependency lockfiles, workflow files, authentication, billing, secrets, analytics IDs or deployment credentials.
Preserve framework conventions, formatting, accessibility and existing business logic.
The result will be committed to an isolated branch and opened as a Draft Pull Request. Never claim that it has been deployed.`;
  const payload = {
    task: input.task,
    repository: {
      fullName: input.repository.fullName,
      defaultBranch: input.repository.defaultBranch,
      allowedPaths,
      files: input.repository.files,
    },
  };
  let plan: GitHubExecutionPlan;
  let usage: unknown;
  if (config.supportsStructuredOutputs) {
    const result = await generateText({
      model,
      system: instruction,
      prompt: `Prepare the Draft Pull Request preview from this task and repository context:\n${JSON.stringify(payload, null, 2)}`,
      output: Output.object({
        name: "GitHubExecutionPlan",
        description: "A reviewable code change and Draft Pull Request plan.",
        schema: githubExecutionPlanSchema,
      }),
    });
    plan = result.output;
    usage = result.totalUsage;
  } else {
    const result = await generateText({
      model,
      system: `${instruction}\nReturn only valid JSON matching the requested structure.`,
      prompt: `Return a GitHub execution plan with keys summary, risk, rationale, changes, and github. The github object must contain prTitle, prBody, and files with path, content and reason.\nInput:\n${JSON.stringify(payload, null, 2)}`,
    });
    plan = githubExecutionPlanSchema.parse(JSON.parse(extractJson(result.text)));
    usage = result.totalUsage;
  }
  const allowed = new Set(allowedPaths);
  if (plan.github.files.some((file) => !allowed.has(file.path))) {
    throw new Error("The AI plan attempted to edit a file outside the reviewed repository context.");
  }
  return { plan, usage };
}
