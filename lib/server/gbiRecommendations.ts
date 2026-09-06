import "server-only";

import OpenAI from "openai";

export type GbiRecommendation = {
  title: string;
  description: string;
};

export type GbiRecommendationResponse = {
  recommendations: GbiRecommendation[];
};

/**
 * Current GBI certification scale, ordered low-to-high. These bands match the
 * real Malaysian GBI scoring tiers surfaced across the app (the dashboard and
 * assessment results pages). Scores are out of 100.
 */
export const GBI_SCALE = [
  { name: "Not Certified", minAverage: 0, maxAverage: 49 },
  { name: "Certified", minAverage: 50, maxAverage: 65 },
  { name: "Silver", minAverage: 66, maxAverage: 75 },
  { name: "Gold", minAverage: 76, maxAverage: 85 },
  { name: "Platinum", minAverage: 86, maxAverage: 100 },
] as const;

export const GBI_SYSTEM_CONTEXT = {
  currentMethod: {
    calculation: "overall_average",
    description:
      "Certification level is currently determined primarily from the overall average mark on the GBI assessment.",
  },
  certificationLevels: GBI_SCALE,
  objective:
    "Improve the certification scale and its average-mark rules so that certification better reflects actual performance and provides a meaningful, fair, transparent progression from lower to higher certification levels.",
} as const;

/**
 * Strict structured-output schema. OpenAI guarantees the returned JSON
 * conforms to this shape: exactly five recommendations, each with a
 * non-empty title and description.
 */
export const GBI_RECOMMENDATIONS_SCHEMA = {
  type: "object",
  properties: {
    recommendations: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendations"],
  additionalProperties: false,
} as const;

export function buildGbiRecommendationInstructions(): string {
  return [
    "You are an expert consultant helping improve a green-building certification scoring system.",
    "Analyze the current GBI certification scale and its average-mark rules provided by the application.",
    "The current system primarily determines certification level using the overall average mark on a 100-point assessment.",
    "Recommend improvements that could make the certification system more meaningful, fair, transparent, and useful.",
    "Consider issues such as:",
    "- limitations of relying only on a single overall average mark",
    "- certification progression between levels",
    "- weighting of different assessment areas",
    "- minimum requirements per assessment area",
    "- consistency and transparency of thresholds",
    "- opportunities for improvement",
    "Return exactly 5 recommendations.",
    "Do not invent facts about the organization. Base your recommendations only on the supplied information.",
    "Clearly distinguish recommendations from existing rules.",
    "Never claim that any proposed change is officially GBI-compliant. Recommendations are advisory proposals for human review.",
  ].join("\n");
}

// A minimal shape of the OpenAI Responses `create` call so tests/DI can stub
// it without constructing a real client.
type ResponseCreator = (input: {
  model: string;
  instructions: string;
  input: string;
  store: false;
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: typeof GBI_RECOMMENDATIONS_SCHEMA;
    };
  };
}) => Promise<{ output_text?: string | null }>;

export async function generateGbiRecommendations(
  input: {
    apiKey: string;
    model: string;
  },
  dependencies: { createResponse?: ResponseCreator } = {},
): Promise<GbiRecommendationResponse> {
  const createResponse =
    dependencies.createResponse ??
    ((request) => {
      const client = new OpenAI({
        apiKey: input.apiKey,
        timeout: 30_000,
        maxRetries: 1,
      });

      return client.responses.create(request);
    });

  const response = await createResponse({
    model: input.model,
    instructions: buildGbiRecommendationInstructions(),
    input: `
      Current GBI certification scale:

      ${JSON.stringify(GBI_SYSTEM_CONTEXT)}
    `,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "gbi_recommendations",
        strict: true,
        schema: GBI_RECOMMENDATIONS_SCHEMA,
      },
    },
  });

  const output = response.output_text?.trim();
  if (!output) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = JSON.parse(output) as unknown;
  return parseGbiRecommendations(parsed);
}

export function parseGbiRecommendations(value: unknown): GbiRecommendationResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("OpenAI response is not a valid object.");
  }

  const candidate = value as { recommendations?: unknown };
  if (!Array.isArray(candidate.recommendations)) {
    throw new Error("OpenAI response is missing a recommendations array.");
  }

  const recommendations = candidate.recommendations.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("Recommendation is not a valid object.");
    }
    const rec = item as { title?: unknown; description?: unknown };
    if (typeof rec.title !== "string" || typeof rec.description !== "string") {
      throw new Error("Recommendation is missing title or description.");
    }
    return { title: rec.title, description: rec.description };
  });

  if (recommendations.length !== 5) {
    throw new Error("OpenAI did not return exactly 5 recommendations.");
  }

  return { recommendations };
}
