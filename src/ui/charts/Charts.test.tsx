import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LineChart } from './Charts';

describe('LineChart', () => {
  it('renders negative values with a zero baseline', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 600 });
    const { container } = render(<LineChart ariaLabel="Profit" labels={['Jan', 'Feb', 'Mar']} series={[{ name: 'Profit', values: [-500, 200, 900] }]} />);
    expect(container.querySelector('svg[aria-label="Profit"]')).toBeTruthy();
    const ticks = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(ticks.some((x) => x?.startsWith('-'))).toBe(true);
  });
});
