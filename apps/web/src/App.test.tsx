import { test, expect } from 'vitest';

test('basic command center sanity test', () => {
  const appName = 'Smart Logistics Intelligence Command Center';
  expect(appName).toContain('Command Center');
});
