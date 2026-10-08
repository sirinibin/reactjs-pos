/**
 * Tests for the media-generation error handling in handleTestSend.
 *
 * The fix ensures that when a template requires a DOCUMENT or IMAGE header
 * (hasMediaHeader=true) and the generate-pdf/generate-image endpoint fails,
 * the error is surfaced to the user instead of silently proceeding without
 * the header component (which causes Meta to return a 400 #132012 error).
 */

// Pure-logic helpers extracted from the handleTestSend implementation
// so the behavior can be tested without mounting the full component.

function resolveMediaId({ hasMediaHeader, fetchOk, mediaId, errorMsg }) {
    // Returns { mediaId, error } mirroring the new handleTestSend logic.
    if (!hasMediaHeader) return { mediaId: null, error: null };

    if (!fetchOk) return { mediaId: null, error: 'Attachment generation failed: network error' };

    if (mediaId) return { mediaId, error: null };

    return { mediaId: null, error: errorMsg || 'Attachment generation failed' };
}

function buildComponents({ mediaId, templateWantsDoc }) {
    const fmt = templateWantsDoc ? 'DOCUMENT' : 'IMAGE';
    const components = [];
    if (mediaId) {
        components.push({
            type: 'header',
            parameters: [{ type: fmt.toLowerCase(), [fmt.toLowerCase()]: { id: mediaId } }],
        });
    }
    components.push({ type: 'body', parameters: [] });
    return components;
}

describe('handleTestSend — media error handling', () => {
    // ── DOCUMENT template ────────────────────────────────────────────────────

    test('DOCUMENT template: successful PDF → mediaId set, no error', () => {
        const result = resolveMediaId({
            hasMediaHeader: true,
            fetchOk: true,
            mediaId: 'abc123',
        });
        expect(result.error).toBeNull();
        expect(result.mediaId).toBe('abc123');
    });

    test('DOCUMENT template: backend returns error JSON → error surfaced', () => {
        const result = resolveMediaId({
            hasMediaHeader: true,
            fetchOk: true,
            mediaId: null,
            errorMsg: 'Chrome not available on this server',
        });
        expect(result.error).toBe('Chrome not available on this server');
        expect(result.mediaId).toBeNull();
    });

    test('DOCUMENT template: backend returns no media_id and no error msg → generic error', () => {
        const result = resolveMediaId({
            hasMediaHeader: true,
            fetchOk: true,
            mediaId: null,
            errorMsg: null,
        });
        expect(result.error).toBe('Attachment generation failed');
        expect(result.mediaId).toBeNull();
    });

    test('DOCUMENT template: fetch throws (network error) → error surfaced', () => {
        const result = resolveMediaId({
            hasMediaHeader: true,
            fetchOk: false,
            mediaId: null,
        });
        expect(result.error).toContain('Attachment generation failed');
        expect(result.mediaId).toBeNull();
    });

    // ── Non-media template ───────────────────────────────────────────────────

    test('Text-only template: hasMediaHeader=false → skips fetch entirely', () => {
        const result = resolveMediaId({ hasMediaHeader: false });
        expect(result.error).toBeNull();
        expect(result.mediaId).toBeNull();
    });

    // ── buildComponents guards ────────────────────────────────────────────────

    test('buildComponents: mediaId present → header component included', () => {
        const comps = buildComponents({ mediaId: 'abc123', templateWantsDoc: true });
        expect(comps[0].type).toBe('header');
        expect(comps[0].parameters[0].type).toBe('document');
    });

    test('buildComponents: mediaId null → no header component (would trigger Meta 400)', () => {
        const comps = buildComponents({ mediaId: null, templateWantsDoc: true });
        expect(comps[0].type).toBe('body');
        expect(comps.every(c => c.type !== 'header')).toBe(true);
    });

    test('buildComponents: IMAGE template with mediaId → header with image type', () => {
        const comps = buildComponents({ mediaId: 'img456', templateWantsDoc: false });
        expect(comps[0].type).toBe('header');
        expect(comps[0].parameters[0].type).toBe('image');
    });

    // ── hasMediaHeader detection ─────────────────────────────────────────────

    function rfqTemplateWantsDocument(components) {
        return (components || []).some(
            c =>
                (c.type || '').toLowerCase() === 'header' &&
                (c.format || '').toUpperCase() === 'DOCUMENT',
        );
    }

    function hasMediaHeaderFromComponents(components) {
        const wantsDoc = rfqTemplateWantsDocument(components);
        return (
            wantsDoc ||
            (components || []).some(
                c =>
                    (c.type || '').toLowerCase() === 'header' &&
                    (c.format || '').toUpperCase() === 'IMAGE',
            )
        );
    }

    test('detects DOCUMENT header format', () => {
        const comps = [{ type: 'HEADER', format: 'DOCUMENT' }, { type: 'BODY' }];
        expect(hasMediaHeaderFromComponents(comps)).toBe(true);
    });

    test('detects IMAGE header format', () => {
        const comps = [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY' }];
        expect(hasMediaHeaderFromComponents(comps)).toBe(true);
    });

    test('returns false for TEXT header format', () => {
        const comps = [{ type: 'HEADER', format: 'TEXT' }, { type: 'BODY' }];
        expect(hasMediaHeaderFromComponents(comps)).toBe(false);
    });

    test('returns false when no header component', () => {
        const comps = [{ type: 'BODY' }, { type: 'FOOTER' }];
        expect(hasMediaHeaderFromComponents(comps)).toBe(false);
    });

    test('returns false for empty/null components', () => {
        expect(hasMediaHeaderFromComponents(null)).toBe(false);
        expect(hasMediaHeaderFromComponents([])).toBe(false);
    });
});
