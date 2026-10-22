// @vitest-environment node
/**
 * Runs the real Supabase schema and security self-test (supabase/*.sql) against
 * an in-memory Postgres, so a change that weakens a security rule fails the build.
 */
import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import schemaSql from '../../supabase/schema.sql?raw';
import selfTestSql from '../../supabase/rls-selftest.sql?raw';

/** The parts of Supabase the schema relies on: roles, auth.users and auth.uid(). */
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
`;

async function freshDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(schemaSql);
  return db;
}

describe('database security rules', () => {
  it('can be applied twice without errors', async () => {
    const db = await freshDatabase();
    await expect(db.exec(schemaSql)).resolves.toBeDefined();
  });

  it('passes every check in the self-test', async () => {
    const db = await freshDatabase();
    const results = await db.exec(selfTestSql);
    const rows = results[results.length - 1]!.rows as Array<{ Check: string; Result: string }>;
    expect(rows.length).toBeGreaterThanOrEqual(24);
    expect(rows.filter((row) => row.Result !== 'PASS').map((row) => row.Check)).toEqual([]);
  });

  it('links sign-ins to coaches and clients by email, in either order', async () => {
    const db = await freshDatabase();
    const client = (email: string) =>
      `insert into public.clients (name, email, lead_source, stage, stage_history, program_tier, goal, targets)
       values ('Example', '${email}', 'gym', 'lead', '[]', 'tier_1', 'recomp', '{}')`;
    const linkedUser = async (table: string, email: string) =>
      (await db.query<{ user_id: string | null }>(`select user_id from public.${table} where email = $1`, [email])).rows[0]?.user_id;

    await db.exec(client('first@example.com'));
    await db.exec(`insert into auth.users values ('11111111-1111-4111-8111-111111111111', 'First@Example.com')`);
    expect(await linkedUser('clients', 'first@example.com')).toBe('11111111-1111-4111-8111-111111111111');

    await db.exec(`insert into auth.users values ('22222222-2222-4222-8222-222222222222', 'later@example.com')`);
    await db.exec(client('later@example.com'));
    expect(await linkedUser('clients', 'later@example.com')).toBe('22222222-2222-4222-8222-222222222222');

    await db.exec(`insert into auth.users values ('33333333-3333-4333-8333-333333333333', 'coach@example.com')`);
    await db.exec(`insert into public.coaches (email) values ('coach@example.com')`);
    expect(await linkedUser('coaches', 'coach@example.com')).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('cleans up after the self-test', async () => {
    const db = await freshDatabase();
    await db.exec(selfTestSql);
    const left = await db.query<{ n: number }>(`select count(*)::int as n from public.clients`);
    expect(left.rows[0]!.n).toBe(0);
  });
});
