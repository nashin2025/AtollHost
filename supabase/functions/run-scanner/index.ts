import { Caller, verifyCaller } from '../_shared/auth.ts';
import {
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from '../_shared/cors.ts';
import { errorResponse, rpcErrorResponse } from '../_shared/errors.ts';
import { serviceClient } from '../_shared/service.ts';

const FETCH_TIMEOUT_MS = 10_000;
const ROBOTS_TIMEOUT_MS = 5_000;

interface ScanBody {
  organization_id?: unknown;
  property_id?: unknown;
  target_name?: unknown;
  target_url?: unknown;
}

interface CheckResult {
  category: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  passed: boolean;
  finding: string;
  recommendation: string;
}

function withTimeout(signal: AbortSignal, ms: number): void {
  const timer = setTimeout(() => signal.dispatchEvent(new Event('abort')), ms);
  signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
}

async function timedFetch(
  url: string,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  withTimeout(controller.signal, ms);
  return fetch(url, {
    signal: controller.signal,
    redirect: 'follow',
    headers: {
      'User-Agent': 'AtollHostScanner/1.0 (guesthouse site audit; contact the property for details)',
    },
  });
}

function originOf(url: string): string {
  const match = url.match(/^https:\/\/[^/]+/);
  return match ? match[0] : '';
}

function pathOf(url: string): string {
  const withoutOrigin = url.replace(/^https:\/\/[^/]+/, '');
  return withoutOrigin === '' ? '/' : withoutOrigin;
}

function robotsDisallows(robotsText: string, targetPath: string): boolean {
  const lines = robotsText.split(/\r?\n/);
  let inWildcardSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^user-agent\s*:/i.test(line)) {
      inWildcardSection = line.split(':')[1]?.trim() === '*';
      continue;
    }
    if (inWildcardSection && /^disallow\s*:/i.test(line)) {
      const disallowed = line.split(':').slice(1).join(':').trim();
      if (disallowed.length > 0 && targetPath.startsWith(disallowed)) {
        return true;
      }
    }
  }
  return false;
}

function runChecks(
  targetUrl: string,
  finalUrl: string,
  status: number,
  html: string,
): CheckResult[] {
  const checks: CheckResult[] = [];
  checks.push({
    category: 'availability',
    title: 'Website reachable',
    severity: 'critical',
    confidence: 1,
    passed: status >= 200 && status < 400,
    finding:
      status >= 200 && status < 400
        ? `The site responded with HTTP ${status}.`
        : `The site responded with HTTP ${status}.`,
    recommendation:
      status >= 200 && status < 400
        ? 'No action needed.'
        : 'Check that the website is published and not blocking automated requests.',
  });
  checks.push({
    category: 'security',
    title: 'HTTPS preserved through redirects',
    severity: 'high',
    confidence: 1,
    passed: finalUrl.startsWith('https://'),
    finding: finalUrl.startsWith('https://')
      ? 'The final page is served over HTTPS.'
      : `The redirect chain ended at ${finalUrl}, which is not HTTPS.`,
    recommendation: finalUrl.startsWith('https://')
      ? 'No action needed.'
      : 'Force HTTPS so guest connections stay encrypted.',
  });
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : '';
  checks.push({
    category: 'discoverability',
    title: 'Page title present',
    severity: 'medium',
    confidence: 1,
    passed: titleText.length > 0,
    finding: titleText.length > 0
      ? `The page title is "${titleText}".`
      : 'The page has no <title> element.',
    recommendation: titleText.length > 0
      ? 'No action needed.'
      : 'Add a descriptive page title so guests and search engines can identify the property.',
  });
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i,
  );
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  checks.push({
    category: 'discoverability',
    title: 'Meta description present',
    severity: 'medium',
    confidence: 1,
    passed: description.length > 0,
    finding: description.length > 0
      ? `The meta description is "${description}".`
      : 'The page has no meta description.',
    recommendation: description.length > 0
      ? 'No action needed.'
      : 'Add a meta description so search results show what the property offers.',
  });
  const emailMatch = html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  checks.push({
    category: 'contact',
    title: 'Contact email visible',
    severity: 'low',
    confidence: 0.9,
    passed: emailMatch !== null,
    finding: emailMatch
      ? `A contact email (${emailMatch[0]}) appears on the page.`
      : 'No email address was found on the page.',
    recommendation: emailMatch
      ? 'No action needed.'
      : 'Publish a contact email so guests can reach the property.',
  });
  const phoneMatch = html.match(
    /\+?\d[\d\s().-]{6,}\d/,
  );
  checks.push({
    category: 'contact',
    title: 'Contact phone visible',
    severity: 'low',
    confidence: 0.9,
    passed: phoneMatch !== null,
    finding: phoneMatch
      ? 'A phone number appears on the page.'
      : 'No phone number was found on the page.',
    recommendation: phoneMatch
      ? 'No action needed.'
      : 'Publish a phone number so guests can call the property.',
  });
  return checks;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return optionsResponse();
  }
  if (req.method !== 'POST') {
    return methodNotAllowed();
  }
  const caller: Caller | null = await verifyCaller(req);
  if (!caller) {
    return errorResponse('UNAUTHENTICATED', 'Sign in is required.', 401);
  }
  let body: ScanBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request body must be valid JSON.',
      400,
    );
  }
  if (typeof body.organization_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'organization_id is required.',
      400,
    );
  }
  if (typeof body.property_id !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'property_id is required.',
      400,
    );
  }
  if (typeof body.target_name !== 'string' || body.target_name.trim().length === 0) {
    return errorResponse(
      'VALIDATION_ERROR',
      'target_name is required.',
      400,
    );
  }
  if (typeof body.target_url !== 'string') {
    return errorResponse(
      'VALIDATION_ERROR',
      'target_url is required.',
      400,
    );
  }
  try {
    const client = serviceClient();
    const { data: auditId, error: startError } = await client.rpc(
      'start_scanner_run',
      {
        p_organization_id: body.organization_id,
        p_property_id: body.property_id,
        p_target_name: body.target_name,
        p_target_url: body.target_url,
        p_actor_id: caller.uid,
      },
    );
    if (startError) {
      return rpcErrorResponse(startError);
    }
    if (typeof auditId !== 'string') {
      return errorResponse(
        'INTERNAL_ERROR',
        'The request could not be processed.',
        500,
      );
    }

    // Controlled fetch: robots.txt first. If the site disallows the
    // target path, the scan stops and the run records why.
    const origin = originOf(body.target_url);
    const targetPath = pathOf(body.target_url);
    let robotsBlocked = false;
    let robotsError: string | null = null;
    try {
      const robotsResponse = await timedFetch(`${origin}/robots.txt`, ROBOTS_TIMEOUT_MS);
      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        robotsBlocked = robotsDisallows(robotsText, targetPath);
      }
    } catch {
      robotsError = 'robots.txt could not be fetched';
    }

    let findings: Array<Record<string, unknown>> = [];
    let score: number | null = null;
    let summary = '';
    const metadata: Record<string, unknown> = {};

    if (robotsBlocked) {
      summary = 'Scan stopped: robots.txt disallows this path.';
      metadata.robots_blocked = true;
      findings = [
        {
          scanner_audit_id: auditId,
          source: 'scanner',
          category: 'policy',
          title: 'robots.txt disallows scanning',
          severity: 'info',
          confidence: 1,
          finding: `The site robots.txt disallows ${targetPath}. The scan was stopped before fetching the page.`,
          recommendation: 'Review the site robots.txt or request permission before scanning this target.',
        },
      ];
    } else {
      if (robotsError) {
        metadata.robots_note = robotsError;
      }
      try {
        const response = await timedFetch(body.target_url, FETCH_TIMEOUT_MS);
        const finalUrl = response.url || body.target_url;
        const html = await response.text();
        const checks = runChecks(body.target_url, finalUrl, response.status, html);
        const passed = checks.filter((check) => check.passed).length;
        score = Math.round((passed / checks.length) * 100);
        summary = `${passed} of ${checks.length} checks passed.`;
        metadata.final_url = finalUrl;
        metadata.http_status = response.status;
        findings = checks.map((check) => ({
          scanner_audit_id: auditId,
          source: 'scanner',
          category: check.category,
          title: check.title,
          severity: check.severity,
          confidence: check.confidence,
          finding: check.finding,
          recommendation: check.recommendation,
        }));
      } catch (fetchError) {
        summary = `Scan failed: ${fetchError instanceof Error ? fetchError.message : 'the target could not be reached'}`;
        metadata.error = summary;
        findings = [
          {
            scanner_audit_id: auditId,
            source: 'scanner',
            category: 'availability',
            title: 'Website unreachable',
            severity: 'critical',
            confidence: 1,
            finding: summary,
            recommendation: 'Check that the website is published, not rate limiting, and reachable from the internet.',
          },
        ];
      }
    }

    await client.from('scanner_findings').insert(findings);
    await client.from('scanner_audits').update({
      status: 'completed',
      score,
      summary,
      completed_at: new Date().toISOString(),
      metadata,
    }).eq('id', auditId);

    return jsonResponse(
      {
        audit_id: auditId,
        status: 'completed',
        score,
        summary,
        findings_count: findings.length,
        robots_blocked: robotsBlocked,
      },
      200,
    );
  } catch {
    return errorResponse(
      'INTERNAL_ERROR',
      'The request could not be processed.',
      500,
    );
  }
});
