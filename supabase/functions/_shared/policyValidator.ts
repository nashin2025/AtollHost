export interface AiDraftStructuredOutput {
  draft_body: string;
  confidence: number;
  source_references: AiDraftSource[];
  unknown_answers: AiDraftUnknownAnswer[];
}

export interface AiDraftSource {
  fact_id: string;
  fact_key: string | null;
  title: string;
  version: number;
}

export interface AiDraftUnknownAnswer {
  question: string;
}

export interface PolicyValidationResult {
  allowed: boolean;
  flags: {
    unsupported_facts: string[];
    sensitive_topics: string[];
    prompt_injection: boolean;
    action_boundaries: string[];
  };
  reason: string | null;
}

const SENSITIVE_TOPIC_KEYWORDS = [
  'legal advice',
  'medical advice',
  'financial advice',
  'investment advice',
  'tax advice',
  'insurance',
  'contract',
  'lawsuit',
  'litigation',
  'personal data',
  'passport',
  'credit card',
  'bank account',
  'social security',
  'password',
  'ssn',
  'medical record',
  'health record',
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+instructions?/i,
  /system\s*:/i,
  /you\s+are\s+now\s+a/i,
  /reveal\s+(your|the)\s+(instructions|prompt|system)/i,
  /repeat\s+(the\s+)?(above|previous)/i,
  /prompt\s+injection/i,
];

const ACTION_BOUNDARY_VERBS = [
  'booked',
  'confirmed',
  'paid',
  'cancelled',
  'sent',
  'shipped',
  'delivered',
  'refunded',
  'updated',
  'modified',
  'changed',
  'created',
  'deleted',
  'removed',
  'added',
  'registered',
  'submitted',
  'processed',
  'approved',
  'denied',
  'authorized',
];

function checkUnsupportedFacts(
  output: AiDraftStructuredOutput,
  knownFactKeys: Set<string>,
): string[] {
  const flags: string[] = [];

  // If there are source references, check they reference known fact keys.
  for (const ref of output.source_references) {
    if (ref.fact_key && !knownFactKeys.has(ref.fact_key)) {
      flags.push(`source_reference cites unknown fact_key: ${ref.fact_key}`);
    }
  }

  // If unknown_answers is empty but draft_body makes specific factual claims
  // without source references, flag it. Heuristic: numbers, prices, specific data.
  if (output.source_references.length === 0 && output.unknown_answers.length === 0) {
    const hasSpecificClaims = /\d/.test(output.draft_body) ||
      /\b(price|cost|rate|fee|time|date|address|phone|email)\b/i.test(output.draft_body);
    if (hasSpecificClaims) {
      flags.push('draft makes specific claims without source references');
    }
  }

  return flags;
}

function checkSensitiveTopics(output: AiDraftStructuredOutput): string[] {
  const flags: string[] = [];
  const text = output.draft_body.toLowerCase();

  for (const keyword of SENSITIVE_TOPIC_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      flags.push(`sensitive topic detected: ${keyword}`);
    }
  }

  return flags;
}

function checkPromptInjection(inputText: string): boolean {
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(inputText)) {
      return true;
    }
  }
  return false;
}

function checkActionBoundaries(output: AiDraftStructuredOutput): string[] {
  const flags: string[] = [];
  const text = output.draft_body.toLowerCase();

  for (const verb of ACTION_BOUNDARY_VERBS) {
    // Match "I have/had <verb>" or "we have/had <verb>" or "<verb> your"
    const patterns = [
      new RegExp(`\\b(i\\s+(have|had|ve)\\s+${verb})\\b`, 'i'),
      new RegExp(`\\b(we\\s+(have|had|ve)\\s+${verb})\\b`, 'i'),
      new RegExp(`\\b(${verb})\\s+(your|the\\s+guest)['\\s]?s?\\b`, 'i'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        flags.push(`action boundary violation: claims to have ${verb}`);
        break;
      }
    }
  }

  return flags;
}

export function validateDraftPolicy(
  output: AiDraftStructuredOutput,
  context: {
    knownFactKeys: Set<string>;
    guestMessage: string;
    conversationHistory: string;
  },
): PolicyValidationResult {
  const unsupportedFacts = checkUnsupportedFacts(output, context.knownFactKeys);
  const sensitiveTopics = checkSensitiveTopics(output);
  const promptInjection = checkPromptInjection(context.guestMessage) || checkPromptInjection(context.conversationHistory);
  const actionBoundaries = checkActionBoundaries(output);

  const allowed = unsupportedFacts.length === 0 &&
    sensitiveTopics.length === 0 &&
    !promptInjection &&
    actionBoundaries.length === 0;

  let reason: string | null = null;
  if (!allowed) {
    const parts: string[] = [];
    if (unsupportedFacts.length > 0) parts.push(`unsupported facts: ${unsupportedFacts.join(', ')}`);
    if (sensitiveTopics.length > 0) parts.push(`sensitive topics: ${sensitiveTopics.join(', ')}`);
    if (promptInjection) parts.push('prompt injection detected in guest input');
    if (actionBoundaries.length > 0) parts.push(`action boundaries: ${actionBoundaries.join(', ')}`);
    reason = parts.join('; ');
  }

  return {
    allowed,
    flags: {
      unsupported_facts: unsupportedFacts,
      sensitive_topics: sensitiveTopics,
      prompt_injection: promptInjection,
      action_boundaries: actionBoundaries,
    },
    reason,
  };
}