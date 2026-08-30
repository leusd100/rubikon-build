import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../../app/api/leads/route';
import { company } from '../../app/data/company';
import { inquiryDirectionOptions } from '../../app/data/directions';

type TestWorkerEnv = {
  DB: FakeD1Database;
  IP_HASH_SALT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
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

  prepare(query: string) {
    const normalizedQuery = query.replace(/\s+/g, ' ').trim();
    this.preparedQueries.push(normalizedQuery);
    return new FakeD1Statement(this, normalizedQuery);
  }
}

const workerEnv = env as unknown as TestWorkerEnv;

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
  let telegramFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T12:00:00.000Z'));

    database = new FakeD1Database();
    Object.assign(workerEnv, {
      DB: database,
      IP_HASH_SALT: 'test-only-salt',
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_ID: 'test-chat',
    });

    telegramFetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', telegramFetch);
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
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('silently accepts the honeypot without storing or notifying', async () => {
    const response = await POST(leadRequest(validPayload({ companyWebsite: 'spam.example' })));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 0, isNew: false });
    expect(database.preparedQueries).toEqual([]);
    expect(telegramFetch).not.toHaveBeenCalled();
  });

  it('stores a valid new lead and returns an idempotency-aware success', async () => {
    const response = await POST(leadRequest(validPayload()));

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({ ok: true, id: 1, isNew: true });
    expect(database.leads.get('submission-new')).toBe(1);
    expect(database.rateReservations).toBe(1);
    expect(telegramFetch).toHaveBeenCalledTimes(1);
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
});
