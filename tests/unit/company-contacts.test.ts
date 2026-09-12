import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { company, companyContactLinks } from '../../app/data/company';

const APP = join(process.cwd(), 'app');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe('the corporate email', () => {
  it('is office@rubikonbuild.com, linked with mailto', () => {
    expect(company.email).toBe('office@rubikonbuild.com');
    expect(companyContactLinks.email).toBe('mailto:office@rubikonbuild.com');
  });

  it('is written only in app/data/company.ts — every other file reads it from there', () => {
    const holders = sourceFiles(APP)
      .filter((file) => /@rubikonbuild\.com|mailto:/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(process.cwd(), file).split(sep).join('/'));
    expect(holders).toEqual(['app/data/company.ts']);
  });

  it('is the only public mailbox — role addresses are not public channels yet', () => {
    const addresses = sourceFiles(APP).flatMap((file) => readFileSync(file, 'utf8').match(/[\w.+-]+@rubikonbuild\.com/g) ?? []);
    expect(new Set(addresses)).toEqual(new Set(['office@rubikonbuild.com']));
  });
});
