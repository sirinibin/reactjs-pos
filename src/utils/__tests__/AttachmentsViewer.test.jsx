/**
 * Tests for AttachmentsViewer
 *
 * Component prop: `images` (string[])  — NOT `attachments`.
 * The component returns null for empty / null / undefined images, so there is
 * no visible DOM to query in those cases.
 *
 * Navigation strategy: the lightbox renders the current image with
 *   alt="Attachment N" (1-based).  The grid thumbnails also render with
 *   alt="Attachment N", so when the lightbox is open at index N the alt text
 *   "Attachment N+1" appears TWICE (grid + lightbox main image).  The
 *   thumbnail strip in the lightbox uses alt="" so it never interferes.
 * This gives a reliable count-based signal for navigation assertions without
 * needing data-testid attributes.
 *
 * No CSS is imported by AttachmentsViewer.js, so no CSS mocks are required.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AttachmentsViewer from '../AttachmentsViewer';

const IMAGES = [
  'http://example.com/img1.jpg',
  'http://example.com/img2.jpg',
  'http://example.com/img3.jpg',
];

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. Renders without crashing when images is an empty array
// ---------------------------------------------------------------------------
test('renders nothing when images is an empty array', () => {
  const { container } = render(<AttachmentsViewer images={[]} />);
  expect(container.firstChild).toBeNull();
});

// ---------------------------------------------------------------------------
// 2. Renders without crashing when images is null / undefined
// ---------------------------------------------------------------------------
test('renders nothing when images is undefined', () => {
  const { container } = render(<AttachmentsViewer />);
  expect(container.firstChild).toBeNull();
});

test('renders nothing when images is null', () => {
  // Destructuring default (= []) only applies to undefined, not null.
  // The guard `!images || images.length === 0` covers the null case.
  const { container } = render(<AttachmentsViewer images={null} />);
  expect(container.firstChild).toBeNull();
});

// ---------------------------------------------------------------------------
// 3. Renders thumbnail for each attachment
// ---------------------------------------------------------------------------
test('renders one thumbnail image per entry in the images array', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Before the lightbox opens, exactly one <img> exists per entry.
  expect(screen.getAllByRole('img')).toHaveLength(IMAGES.length);
});

test('each thumbnail has descriptive alt text', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  IMAGES.forEach((_, i) => {
    expect(screen.getByAltText(`Attachment ${i + 1}`)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Clicking a thumbnail opens the lightbox
// ---------------------------------------------------------------------------
test('clicking a thumbnail opens the lightbox', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // The close button (×) is only rendered inside the lightbox.
  expect(screen.queryByText('×')).toBeNull();
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getByText('×')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// 5. Lightbox shows the correct image
// ---------------------------------------------------------------------------
test('lightbox displays the image that was clicked', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Open lightbox at index 1 (second image).
  fireEvent.click(screen.getByAltText('Attachment 2'));
  // "Attachment 2" appears twice: grid thumbnail + lightbox main image.
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(2);
  // Other images appear only once (grid only, not in the lightbox main slot).
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(1);
  expect(screen.getAllByAltText('Attachment 3')).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 6. Lightbox has a close button
// ---------------------------------------------------------------------------
test('lightbox renders a close button', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getByText('×')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// 7. Clicking close hides the lightbox
// ---------------------------------------------------------------------------
test('clicking the close button hides the lightbox', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getByText('×')).toBeInTheDocument();
  fireEvent.click(screen.getByText('×'));
  expect(screen.queryByText('×')).toBeNull();
});

// ---------------------------------------------------------------------------
// 8. Keyboard: Escape key closes the lightbox
// ---------------------------------------------------------------------------
test('pressing Escape closes the lightbox', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getByText('×')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByText('×')).toBeNull();
});

// ---------------------------------------------------------------------------
// 9. Keyboard: ArrowRight navigates to next image
// ---------------------------------------------------------------------------
test('pressing ArrowRight navigates to the next image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Open at index 0 — "Attachment 1" appears in grid + lightbox = 2.
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);

  fireEvent.keyDown(document, { key: 'ArrowRight' });

  // Now at index 1 — "Attachment 2" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(2);
  // "Attachment 1" reverts to grid-only = 1.
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 10. Keyboard: ArrowLeft navigates to previous image
// ---------------------------------------------------------------------------
test('pressing ArrowLeft navigates to the previous image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Open at index 1 — "Attachment 2" in grid + lightbox = 2.
  fireEvent.click(screen.getByAltText('Attachment 2'));
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(2);

  fireEvent.keyDown(document, { key: 'ArrowLeft' });

  // Now at index 0 — "Attachment 1" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);
  // "Attachment 2" reverts to grid-only = 1.
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 11. Previous / Next buttons navigate the lightbox
// ---------------------------------------------------------------------------
test('next button (›) advances to the next image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  // "Attachment 1" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);

  fireEvent.click(screen.getByText('›'));

  // Now at index 1 — "Attachment 2" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(2);
});

test('prev button (‹) goes back to the previous image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 2'));
  // "Attachment 2" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 2')).toHaveLength(2);

  fireEvent.click(screen.getByText('‹'));

  // Now at index 0 — "Attachment 1" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// 12. At first image, previous wraps to last (index never goes below 0)
// ---------------------------------------------------------------------------
test('pressing prev at the first image wraps to the last image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Open at index 0.
  fireEvent.click(screen.getByAltText('Attachment 1'));
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);

  // The component uses modulo: (0 - 1 + 3) % 3 = 2 (last index).
  fireEvent.click(screen.getByText('‹'));

  // Wrapped to index 2 — "Attachment 3" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 3')).toHaveLength(2);
  // "Attachment 1" reverts to grid-only = 1 (no negative index).
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 13. At last image, next wraps to first (index never exceeds the end)
// ---------------------------------------------------------------------------
test('pressing next at the last image wraps to the first image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  // Open at index 2 (last image).
  fireEvent.click(screen.getByAltText('Attachment 3'));
  expect(screen.getAllByAltText('Attachment 3')).toHaveLength(2);

  // The component uses modulo: (2 + 1) % 3 = 0 (first index).
  fireEvent.click(screen.getByText('›'));

  // Wrapped to index 0 — "Attachment 1" in grid + lightbox = 2.
  expect(screen.getAllByAltText('Attachment 1')).toHaveLength(2);
  // "Attachment 3" reverts to grid-only = 1 (no out-of-bounds index).
  expect(screen.getAllByAltText('Attachment 3')).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// 14. Lightbox shows index counter (e.g. "1 / 3")
// ---------------------------------------------------------------------------
test('lightbox shows the current position as "N / total"', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  // "1 / 3" appears in the lightbox counter AND in the first thumbnail overlay.
  // With 3 images the text "1 / 3" should appear at least twice.
  const counterElements = screen.getAllByText('1 / 3');
  expect(counterElements.length).toBeGreaterThanOrEqual(2);
});

test('lightbox counter updates after navigating to the next image', () => {
  render(<AttachmentsViewer images={IMAGES} />);
  fireEvent.click(screen.getByAltText('Attachment 1'));
  // Initially "1 / 3" is shown in both grid overlay and lightbox counter.
  expect(screen.getAllByText('1 / 3').length).toBeGreaterThanOrEqual(2);

  fireEvent.click(screen.getByText('›'));

  // After advancing, "2 / 3" appears in both grid overlay and lightbox counter.
  expect(screen.getAllByText('2 / 3').length).toBeGreaterThanOrEqual(2);
});
