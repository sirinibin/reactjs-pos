import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OverflowTooltip from '../OverflowTooltip';

jest.mock('bootstrap', () => ({
    Tooltip: jest.fn().mockImplementation(() => ({
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    })),
}));

jest.mock('lucide-react', () => ({
    Copy: () => <span data-testid="copy-icon" />,
    Check: () => <span data-testid="check-icon" />,
}));

jest.mock('../OverflowTooltip.css', () => ({}));

const { Tooltip } = require('bootstrap');

beforeEach(() => {
    Tooltip.mockClear();
    // CRA's jest config sets resetMocks: true, which strips the
    // mockImplementation set inside the jest.mock() factory before every
    // test, so it must be re-established here.
    Tooltip.mockImplementation(() => ({
        show: jest.fn(),
        hide: jest.fn(),
        dispose: jest.fn(),
    }));
    navigator.clipboard = { writeText: jest.fn() };
});

afterEach(() => {
    jest.restoreAllMocks();
});

// 1. Renders the value text
test('renders the value text', () => {
    render(<OverflowTooltip value="Hello World" />);
    expect(screen.getByText(/Hello World/)).toBeInTheDocument();
});

// 2. Shows copy icon by default (not hideCopyIcon)
test('shows copy icon by default when hideCopyIcon is not set', () => {
    render(<OverflowTooltip value="test" />);
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
});

// 3. Does NOT show copy icon when hideCopyIcon=true
test('does not show copy icon when hideCopyIcon is true', () => {
    render(<OverflowTooltip value="test" hideCopyIcon={true} />);
    expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

// 4. Clicking copy button calls navigator.clipboard.writeText(value)
test('clicking copy button calls navigator.clipboard.writeText with the value', () => {
    render(<OverflowTooltip value="copy me" />);
    fireEvent.click(screen.getByRole('button'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy me');
});

// 5. "Copied!" text appears after clicking copy button
test('"Copied!" text appears after clicking the copy button', () => {
    render(<OverflowTooltip value="copy me" />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
});

// 6. After 2 seconds, "Copied!" text disappears and check icon reverts
test('"Copied!" text disappears and icon reverts to copy after 2 seconds', () => {
    jest.useFakeTimers();

    render(<OverflowTooltip value="copy me" />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Copied!')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();

    act(() => {
        jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();

    jest.useRealTimers();
});

// 7. maxWidth prop sets max-width style in pixels
test('maxWidth prop sets max-width style in pixels', () => {
    const { container } = render(<OverflowTooltip value="test" maxWidth={300} />);
    const containerDiv = container.querySelector('.overflow-tooltip-container');
    expect(containerDiv).toHaveStyle('max-width: 300px');
});

// 8. Default maxWidth is 250px
test('default maxWidth is 250px when prop is not provided', () => {
    const { container } = render(<OverflowTooltip value="test" />);
    const containerDiv = container.querySelector('.overflow-tooltip-container');
    expect(containerDiv).toHaveStyle('max-width: 250px');
});

// 9. Empty value: copy button is still rendered
test('copy button is still rendered when value is an empty string', () => {
    render(<OverflowTooltip value="" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
});

// 10. null value: bootstrap Tooltip is not instantiated
test('does not create a bootstrap Tooltip instance when value is null', () => {
    render(<OverflowTooltip value={null} />);
    expect(Tooltip).not.toHaveBeenCalled();
});

test('does not create a bootstrap Tooltip instance when value is an empty string', () => {
    render(<OverflowTooltip value="" />);
    expect(Tooltip).not.toHaveBeenCalled();
});

// 11. Tooltip show is called on mouseEnter
test('calls tooltip show on mouseEnter', () => {
    render(<OverflowTooltip value="hover me" />);
    const tooltipEl = document.querySelector('.overflow-tooltip');
    const instance = Tooltip.mock.results[0].value;
    fireEvent.mouseEnter(tooltipEl);
    expect(instance.show).toHaveBeenCalledTimes(1);
});

// 12. Tooltip hide is called on mouseLeave
test('calls tooltip hide on mouseLeave', () => {
    render(<OverflowTooltip value="hover me" />);
    const tooltipEl = document.querySelector('.overflow-tooltip');
    const instance = Tooltip.mock.results[0].value;
    fireEvent.mouseLeave(tooltipEl);
    expect(instance.hide).toHaveBeenCalledTimes(1);
});

// 13. Tooltip is disposed on unmount
test('disposes the tooltip instance on unmount', () => {
    const { unmount } = render(<OverflowTooltip value="test" />);
    const instance = Tooltip.mock.results[0].value;
    unmount();
    expect(instance.dispose).toHaveBeenCalledTimes(1);
});
