import { describe, it, expect } from 'vitest';
import { isOriginPermitted } from './cors.util';

describe('isOriginPermitted', () => {
  const explicitOrigins = ['https://custom.elawal-staging.com'];

  it('permits production platform domains and subdomains', () => {
    expect(isOriginPermitted('https://al-awal.online', explicitOrigins, false)).toBe(true);
    expect(isOriginPermitted('https://app.al-awal.online', explicitOrigins, false)).toBe(true);
    expect(isOriginPermitted('https://api.al-awal.online', explicitOrigins, false)).toBe(true);
  });

  it('permits explicitly configured CORS origins', () => {
    expect(isOriginPermitted('https://custom.elawal-staging.com', explicitOrigins, false)).toBe(true);
  });

  it('permits valid El Awal Vercel deployments', () => {
    expect(isOriginPermitted('https://el-awal.vercel.app', explicitOrigins, false)).toBe(true);
    expect(isOriginPermitted('https://el-awal-preview-123.vercel.app', explicitOrigins, false)).toBe(true);
    expect(isOriginPermitted('https://nexly-el-awal.vercel.app', explicitOrigins, false)).toBe(true);
  });

  it('permits valid El Awal Heroku deployments', () => {
    expect(isOriginPermitted('https://al-awal.herokuapp.com', explicitOrigins, false)).toBe(true);
    expect(isOriginPermitted('https://el-awal-api.herokuapp.com', explicitOrigins, false)).toBe(true);
  });

  it('BLOCKS arbitrary third-party Vercel or Heroku deployments', () => {
    // Attackers hosting an app on vercel or heroku
    expect(isOriginPermitted('https://evil-attacker.vercel.app', explicitOrigins, false)).toBe(false);
    expect(isOriginPermitted('https://random-app.vercel.app', explicitOrigins, false)).toBe(false);
    expect(isOriginPermitted('https://evil-hacker.herokuapp.com', explicitOrigins, false)).toBe(false);
    expect(isOriginPermitted('https://malicious-site.com', explicitOrigins, false)).toBe(false);
  });

  it('controls localhost access based on environment', () => {
    expect(isOriginPermitted('http://localhost:3000', explicitOrigins, true)).toBe(true);
    expect(isOriginPermitted('http://127.0.0.1:4000', explicitOrigins, true)).toBe(true);
    expect(isOriginPermitted('http://localhost:3000', explicitOrigins, false)).toBe(false);
  });
});
