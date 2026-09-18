import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { POST } from '../../app/api/leads/route';
import { company } from '../../app/data/company';
import { inquiryDirectionOptions } from '../../app/data/directions';
import { toInquiryAttachmentPayload } from '../../app/lib/inquiry/attachment';
import { SITEVERIFY_URL } from '../../app/lib/inquiry/turnstileVerify';
import {
  GRAIN_PLANNER_STATE_SCHEMA,
  GRAIN_PLANNER_VERSION,
  createGrainAttachment,
  createGrainPlannerState,
} from '../../app/lib/planner/grain';
import { fixtures } from './planner/grain/fixtures';

type TestWorkerEnv = {
  DB: FakeD1Database;
  IP_HASH_SALT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TURNSTILE_SECRET: string;
};

type RunResult = {
  meta: {
    changes: number;
    last_row_id?: number;
  };
};

class FakeD1Statement {
  private bindings: unknown[] = [];

  constructor(
    private readonly database: FakeD1Database,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    this.bindings = values;
    return this;
  }

  async first<T>(): Promise<T | null> {
    if (!this.query.startsWith('SELECT id FROM leads')) {
      throw new Error(`Unsupported first() query: ${this.query}`);
    }

    const submissionId = String(this.bindings[0]);
    const id = this.database.leads.get(submissionId);
    return (id ? { id } : null) as T | null;
  }

  async run(): Promise<RunResult> {
    if (this.query.startsWith('INSERT INTO lead_submit_log')) {
      if (this.database.rateLimitAtCapacity) {
        return { meta: { changes: 0 } };
      }

      this.database.rateReservations += 1;
      this.database.lastRateRowId += 1;
      return {
        meta: {
          changes: 1,
          last_row_id: this.database.lastRateRowId,
        },
      };
    }

    if (this.query.startsWith('INSERT INTO leads')) {
      const submissionId = String(this.bindings[0]);
      if (this.database.leads.has(submissionId)) {
        throw new Error('UNIQUE constraint failed: leads.submission_id');
      }

      const id = this.database.nextLeadId;
      this.database.nextLeadId += 1;
      this.database.leads.set(submissionId, id);
      this.database.lastLeadDetails = String(this.bindings[5]);
      return { meta: { changes: 1, last_row_id: id } };
    }

    if (this.query.startsWith('DELETE FROM lead_submit_log')) {
      this.database.rateReservations = Math.max(0, this.database.rateReservations - 1);
      return { meta: { changes: 1 } };
    }

    if (this.query.startsWith('INSERT INTO lead_notify_failures')) {
      this.database.notificationFailures.push({
        leadId: Number(this.bindings[0]),
        channel: String(this.bindings[1]),
        error: String(this.bindings[2]),
      });
      return { meta: { changes: 1, last_row_id: this.database.notificationFailures.length } };
    }

    throw new Error(`Unsupported run() query: ${this.query}`);
  }
}

class FakeD1Database {
  readonly leads = new Map<string, number>();
  readonly notificationFailures: Array<{ leadId: number; channel: string; error: string }> = [];
  readonly preparedQueries: string[] = [];
  rateLimitAtCapacity = false;
  rateReservations = 0;
  lastRateRowId = 0;
  nextLeadId = 1;
  lastLeadDetails = '';

  prepare(query: string) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    this.preparedQueries.push(normalizedQuery);
    return new FakeD1Statement(this, normalizedQuery);
  }
}

const workerEnv = env as unknown as TestWorkerEnv;

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    submissionId: 'submission-new',
    name: 'Іван Петренко',
    phone: '+380671234567',
    contactMethod: 'Дзвінок',
    direction: inquiryDirectionOptions[0],
    details: {},
    sourcePage: '/',
    consentAt: '2026-08-30T12:00:00.000Z',
    privacyVersion: company.privacyVersion,
    companyWebsite: '',
    turnstileToken: 'turnstile-token-from-widget',
    ...overrides,
  };
}

function leadRequest(payload: unknown) {
  return new Request('https://rubikonbuild.test/api/leads', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'CF-Connecting-IP': '203.0.113.10',
    },
    body: JSON.stringify(payload),
  });
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe('POST /api/leads', () => {
  let database: FakeD1Database;
  let telegramFetch: Mock<FetchLike>;
  // Siteverify is never reached for real: every test answers it here.
  let siteverifyFetch: Mock<FetchLike>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));

    database = new FakeD1Database();
    Object.assign(workerEnv, {
      DB: database,
      IP_HASH_SALT: 'test-only-salt',
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_ID: 'test-chat',
      TURNSTILE_SECRET: 'test-only-turnstile-secret',
    });

    telegramFetch = vi.fn<FetchLike>(async () => new Response(null, { status: 200 }));
    siteverifyFetch = vi.fn<FetchLike>(async () => Response.json({
      success: true, 'error-codes': [], hostname: 'rubikonbuild.com', action: 'lead_submit',
    }));
    vi.stubGlobal('fetch', vi.fn((url: string | URL, init?: RequestInit) => (
      String(url) === SITEVERIFY_URL ? siteverifyFetch(url, init) : telegramFetch(url, init)
    )));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('rejects invalid required fields before touching D1', async () => {
    const response = await POST(leadRequest(validPayload({
      name: 'І',
      phone: '123',
      contactMethod: 'Email',
      direction: 'Невідомий напрям',
      consentAt: 'not-a-date',
      privacyVersion: 'old-version',
    })));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      ok: false,
      error: 'validation',
      fields: [
        'name',
        'phone',
        'contactMethod',
        'direction',
        'consentAt',
        'privacyVersion',
      ],
    });
    expect(database.preparedQueries).toEqual([]);
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('silently accepts the honeypot without verifying, storing or notifying', async () => {
    const response = await POST(leadRequest(validPayload({ companyWebsite: 'spam.example', turnstileToken: undefined })));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 0, isNew: false });
    expect(database.preparedQueries).toEqual([]);
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('stores a valid new lead and returns an idempotency-aware success', async () => {
    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 1, isNew: true });
    expect(database.leads.get('submission-new')).toBe(1);
    expect(database.rateReservations).toBe(1);
    expect(siteverifyFetch).toHaveBeenCalledTimes(1);
    expect(telegramFetch).toHaveBeenCalledTimes(1);
  });

  // ── Turnstile (Sprint 2) ───────────────────────────────────────────────────────────────────────

  function expectNothingStored() {
    expect(database.preparedQueries).toEqual([]);
    expect(database.leads.size).toBe(0);
    expect(database.rateReservations).toBe(0);
    expect(telegramFetch).not.toHaveBeenCalled();
  }

  function siteverifyAnswers(body: Record<string, unknown>) {
    siteverifyFetch.mockResolvedValueOnce(Response.json(body));
  }

  it('sends the secret, the token and the visitor IP to Siteverify', async () => {
    await POST(leadRequest(validPayload()));

    const form = (siteverifyFetch.mock.calls[0]?.[1] as RequestInit).body as FormData;
    expect(form.get('secret')).toBe('test-only-turnstile-secret');
    expect(form.get('response')).toBe('turnstile-token-from-widget');
    expect(form.get('remoteip')).toBe('203.0.113.10');
  });

  it('rejects a missing token without calling Siteverify or touching D1', async () => {
    const response = await POST(leadRequest(validPayload({ turnstileToken: undefined })));

    expect(response.status).toBe(403);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'verification' });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it('rejects an invalid token before any D1 read or write', async () => {
    siteverifyAnswers({ success: false, 'error-codes': ['invalid-input-response'] });

    const response = await POST(leadRequest(validPayload({ turnstileToken: 'forged' })));

    expect(response.status).toBe(403);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'verification' });
    expectNothingStored();
  });

  it('rejects an expired or already-used token, then accepts the retry with a fresh token and the same submissionId', async () => {
    siteverifyAnswers({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    const first = await POST(leadRequest(validPayload({ turnstileToken: 'used-token' })));
    expect(first.status).toBe(403);
    expectNothingStored();

    const retry = await POST(leadRequest(validPayload({ turnstileToken: 'fresh-token' })));
    expect(retry.status).toBe(200);
    expect(await responseBody(retry)).toEqual({ ok: true, id: 1, isNew: true });
    expect(database.rateReservations).toBe(1);
    expect(telegramFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Siteverify is unreachable', () => siteverifyFetch.mockRejectedValueOnce(new TypeError('fetch failed'))],
    ['Siteverify times out', () => siteverifyFetch.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))],
    ['Siteverify answers 5xx', () => siteverifyFetch.mockResolvedValueOnce(new Response('upstream', { status: 502 }))],
    ['Siteverify answers non-JSON', () => siteverifyFetch.mockResolvedValueOnce(new Response('<html>', { status: 200 }))],
    ['Siteverify reports an internal error', () => siteverifyAnswers({ success: false, 'error-codes': ['internal-error'] })],
  ])('fails closed with a generic 503 when %s', async (_case, arrange) => {
    arrange();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'verification_unavailable' });
    expectNothingStored();
  });

  it('fails closed with a 500 when TURNSTILE_SECRET is not configured', async () => {
    workerEnv.TURNSTILE_SECRET = '';

    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(500);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'server' });
    expect(siteverifyFetch).not.toHaveBeenCalled();
    expectNothingStored();
  });

  it('never puts the secret, the token or Cloudflare details into a response or a log line', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const outcomes = [
      { success: false, 'error-codes': ['invalid-input-secret'] },
      { success: true, hostname: 'evil.example', action: 'lead_submit' },
      { success: true, hostname: 'rubikonbuild.com', action: 'other' },
      { success: false, 'error-codes': ['invalid-input-response'] },
    ];
    for (const [index, outcome] of outcomes.entries()) {
      siteverifyAnswers(outcome);
      const response = await POST(leadRequest(validPayload({ submissionId: `leak-${index}`, turnstileToken: 'SENSITIVE-TOKEN-VALUE' })));
      const text = await response.text();
      expect(text).not.toMatch(/SENSITIVE-TOKEN-VALUE|test-only-turnstile-secret|evil\.example|invalid-input|error-codes/);
    }
    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).not.toMatch(/SENSITIVE-TOKEN-VALUE|test-only-turnstile-secret|evil\.example/);
    expect(database.leads.size).toBe(0);
  });

  it('closes the idempotency bypass: a known submissionId without a valid token gets no 200', async () => {
    database.leads.set('submission-existing', 27);

    const noToken = await POST(leadRequest(validPayload({ submissionId: 'submission-existing', turnstileToken: '' })));
    expect(noToken.status).toBe(403);

    siteverifyAnswers({ success: false, 'error-codes': ['invalid-input-response'] });
    const badToken = await POST(leadRequest(validPayload({ submissionId: 'submission-existing' })));
    expect(badToken.status).toBe(403);
    expect(database.preparedQueries).toEqual([]);
  });

  it('keeps idempotency: a verified retry of an accepted submissionId returns the same lead without a second notification', async () => {
    const first = await POST(leadRequest(validPayload()));
    expect(await responseBody(first)).toEqual({ ok: true, id: 1, isNew: true });

    const retry = await POST(leadRequest(validPayload({ turnstileToken: 'second-fresh-token' })));
    expect(await responseBody(retry)).toEqual({ ok: true, id: 1, isNew: false });
    expect(database.leads.size).toBe(1);
    expect(database.rateReservations).toBe(1);
    expect(telegramFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps rate limiting for verified requests', async () => {
    database.rateLimitAtCapacity = true;

    const response = await POST(leadRequest(validPayload()));

    expect(siteverifyFetch).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(429);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'rate_limited' });
    expect(database.leads.size).toBe(0);
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('never spends a rate-limit slot on a failed verification', async () => {
    siteverifyAnswers({ success: false, 'error-codes': ['invalid-input-response'] });
    await POST(leadRequest(validPayload()));

    expect(database.rateReservations).toBe(0);
  });

  // ── «Ще не визначено» ────────────────────────────────────────────────────────────────────────

  it('accepts «Ще не визначено» as a direction, stores it and names it in Telegram', async () => {
    const response = await POST(leadRequest(validPayload({ direction: 'Ще не визначено' })));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 1, isNew: true });
    const telegramRequest = telegramFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    const text = (JSON.parse(String(telegramRequest?.body)) as { text: string }).text;
    expect(text.split('\n')).toContain('Напрям: Ще не визначено');
  });

  it('still requires a direction: an empty one is a validation error, not «Ще не визначено»', async () => {
    const response = await POST(leadRequest(validPayload({ direction: '' })));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toMatchObject({ error: 'validation', fields: ['direction'] });
  });

  it('stores configurator details and includes them in the Telegram handoff', async () => {
    const configuration = [
      'Габарити: 30 × 50 × 8 м',
      'Площа забудови: ≈ 1 500 м²',
      'Контур: Утеплений',
    ].join('\n');
    const response = await POST(leadRequest(validPayload({
      direction: 'Ангари та склади',
      details: {
        dimensions: '30 × 50 × 8 м',
        configuration,
      },
    })));

    expect(response.status).toBe(200);
    expect(JSON.parse(database.lastLeadDetails)).toMatchObject({
      dimensions: '30 × 50 × 8 м',
      configuration,
    });

    const telegramRequest = telegramFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    const telegramBody = JSON.parse(String(telegramRequest?.body)) as { text: string };
    expect(telegramBody.text).toContain('Конфігурація ангара:');
    expect(telegramBody.text).toContain(configuration);
  });

  it('returns the existing lead before a full rate-limit bucket is touched', async () => {
    database.leads.set('submission-existing', 27);
    database.rateLimitAtCapacity = true;

    const response = await POST(leadRequest(validPayload({
      submissionId: 'submission-existing',
    })));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 27, isNew: false });
    expect(database.rateReservations).toBe(0);
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('returns 429 for a new submission when the rate-limit bucket is full', async () => {
    database.rateLimitAtCapacity = true;

    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(429);
    expect(await responseBody(response)).toEqual({ ok: false, error: 'rate_limited' });
    expect(database.leads.size).toBe(0);
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('keeps a stored lead successful when Telegram is unavailable', async () => {
    telegramFetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 1, isNew: true });
    expect(database.notificationFailures).toEqual([
      {
        leadId: 1,
        channel: 'telegram',
        error: 'Error: telegram responded 503',
      },
    ]);
  });

  // ── Inquiry attachments (Phase 3) ──────────────────────────────────────────────────────────────

  const hangarConfiguration = [
    'Вибрана конфігурація:',
    'Габарити: 30 × 50 × 8 м',
    'Контур: Утеплений',
    'Системні попередні дані:',
    'Площа забудови: ≈ 1 500 м²',
  ].join('\n');

  function telegramText() {
    const telegramRequest = telegramFetch.mock.calls[0]?.[1] as RequestInit | undefined;
    return (JSON.parse(String(telegramRequest?.body)) as { text: string }).text;
  }

  function storedDetails() {
    return JSON.parse(database.lastLeadDetails) as Record<string, unknown>;
  }

  const expectedHangarTelegram = [
    '🆕 Нова заявка з сайту',
    'Ім\'я: Іван Петренко',
    'Телефон: +380671234567',
    'Напрям: Ангари та склади',
    'Зв\'язок: Дзвінок',
    'Сторінка: /angary',
    'Габарити: 30 × 50 × 8 м',
    `Конфігурація ангара:\n${hangarConfiguration}`,
  ].join('\n');

  it('keeps the hangar Telegram message byte-for-byte for a legacy payload without attachment metadata', async () => {
    const response = await POST(leadRequest(validPayload({
      direction: 'Ангари та склади',
      sourcePage: '/angary',
      details: { dimensions: '30 × 50 × 8 м', configuration: hangarConfiguration },
    })));

    expect(response.status).toBe(200);
    expect(telegramText()).toBe(expectedHangarTelegram);
    expect(storedDetails().configuration).toBe(hangarConfiguration);
  });

  it('sends the same hangar Telegram message when the client names the attachment kind', async () => {
    const response = await POST(leadRequest(validPayload({
      direction: 'Ангари та склади',
      sourcePage: '/angary',
      details: {
        dimensions: '30 × 50 × 8 м',
        configuration: hangarConfiguration,
        attachment: { kind: 'hangar-configuration', version: 'hangar-configurator@1.0.0' },
      },
    })));

    expect(response.status).toBe(200);
    expect(telegramText()).toBe(expectedHangarTelegram);
  });

  it('stores a grain brief with its kind, version and validated state, and labels it in Telegram', async () => {
    const grain = createGrainAttachment(fixtures.B);
    const response = await POST(leadRequest(validPayload({
      sourcePage: '/planner-preview',
      details: { configuration: grain.text, attachment: toInquiryAttachmentPayload(grain) },
    })));

    expect(response.status).toBe(200);
    expect(storedDetails()).toMatchObject({
      configuration: grain.text,
      attachmentKind: 'grain-brief',
      attachmentVersion: GRAIN_PLANNER_VERSION,
      attachmentData: createGrainPlannerState(fixtures.B),
    });
    expect(storedDetails()).not.toHaveProperty('attachmentDataDropped');
    const text = telegramText();
    expect(text).toContain(`Опис задачі — зерносховище:\n${grain.text}`);
    expect(text).not.toContain('Конфігурація ангара');
    // Structured data is stored, never sent to Telegram.
    expect(text).not.toContain(GRAIN_PLANNER_STATE_SCHEMA);
    expect(text).not.toContain('"answers"');
  });

  it('reads configuration without an attachment kind as a hangar configuration', async () => {
    await POST(leadRequest(validPayload({ details: { configuration: hangarConfiguration } })));

    expect(storedDetails()).toMatchObject({ configuration: hangarConfiguration, attachmentKind: 'hangar-configuration' });
    expect(storedDetails()).not.toHaveProperty('attachmentVersion');
    expect(telegramText()).toContain(`Конфігурація ангара:\n${hangarConfiguration}`);
  });

  it('keeps the text of an unknown attachment kind under a generic label and drops its metadata', async () => {
    const response = await POST(leadRequest(validPayload({
      details: { configuration: 'Параметри покрівлі', attachment: { kind: 'roof-brief', version: 'roof@1', data: { area: 1200 } } },
    })));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 1, isNew: true });
    const details = storedDetails();
    expect(details.configuration).toBe('Параметри покрівлі');
    expect(details).not.toHaveProperty('attachmentKind');
    expect(details).not.toHaveProperty('attachmentVersion');
    expect(details).not.toHaveProperty('attachmentData');
    expect(details.attachmentDataDropped).toBe('unknown-kind');
    expect(telegramText()).toContain('Додані параметри:\nПараметри покрівлі');
  });

  it('drops structured data over 6 000 characters but keeps the lead and its text', async () => {
    const grain = createGrainAttachment(fixtures.B);
    const oversized = { ...createGrainPlannerState(fixtures.B), padding: 'x'.repeat(6000) };
    const response = await POST(leadRequest(validPayload({
      details: { configuration: grain.text, attachment: { kind: 'grain-brief', version: GRAIN_PLANNER_VERSION, data: oversized } },
    })));

    expect(response.status).toBe(200);
    expect(database.leads.get('submission-new')).toBe(1);
    expect(storedDetails()).toMatchObject({ configuration: grain.text, attachmentKind: 'grain-brief', attachmentDataDropped: 'too-large' });
    expect(storedDetails()).not.toHaveProperty('attachmentData');
    expect(telegramText()).toContain(`Опис задачі — зерносховище:\n${grain.text}`);
  });

  it('drops an invalid grain state but keeps the lead and its text', async () => {
    const grain = createGrainAttachment(fixtures.C1);
    const response = await POST(leadRequest(validPayload({
      details: { configuration: grain.text, attachment: { kind: 'grain-brief', version: GRAIN_PLANNER_VERSION, data: { ...createGrainPlannerState(fixtures.C1), version: 2 } } },
    })));

    expect(response.status).toBe(200);
    expect(storedDetails()).toMatchObject({ configuration: grain.text, attachmentKind: 'grain-brief', attachmentDataDropped: 'invalid' });
    expect(storedDetails()).not.toHaveProperty('attachmentData');
  });

  it('never rejects a lead for a malformed attachment', async () => {
    const malformed = ['text', 42, [], { kind: {} }, { kind: 'grain-brief', data: 'x' }, { kind: 'grain-brief', version: 7 }];
    for (const [index, attachment] of malformed.entries()) {
      const response = await POST(leadRequest(validPayload({
        submissionId: `submission-malformed-${index}`,
        details: { configuration: 'Параметри', attachment },
      })));
      expect(response.status).toBe(200);
    }
    expect(database.leads.size).toBe(malformed.length);
  });

  it('clips the configuration to 1 600 characters', async () => {
    await POST(leadRequest(validPayload({
      details: { configuration: 'ж'.repeat(2000), attachment: { kind: 'grain-brief', version: GRAIN_PLANNER_VERSION } },
    })));

    expect(storedDetails().configuration).toBe('ж'.repeat(1600));
  });

  it('stores exactly the pre-attachment detail keys when nothing is attached', async () => {
    await POST(leadRequest(validPayload({ details: { comment: 'Потрібен склад' } })));

    expect(Object.keys(storedDetails())).toEqual(['location', 'dimensions', 'cooperation', 'startDate', 'comment', 'configuration']);
  });
});
