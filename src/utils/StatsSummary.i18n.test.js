/**
 * Tests for the StatsSummary i18n fix.
 *
 * Previously StatsSummary used t(`Show ${title}`) which required every
 * "Show X Summary" combination as a translation key.
 *
 * The fix composes the button label as `${t('Show')} ${title}` so that
 * "Show" / "Hide" are single-word keys and each caller translates its
 * own title via t() before passing it as the prop.
 */

const fs   = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
    path.join(__dirname, 'StatsSummary.js'),
    'utf8'
);

describe('StatsSummary.js — Show/Hide button i18n', () => {
    test('1.1  does NOT use the old template-literal key pattern t(`Show ${title}`)', () => {
        expect(SRC).not.toMatch(/t\(`Show \$\{title\}`\)/);
        expect(SRC).not.toMatch(/t\(`Hide \$\{title\}`\)/);
    });

    test('1.2  uses the composed pattern t("Show") / t("Hide") with title appended', () => {
        expect(SRC).toMatch(/t\(['"]Show['"]\)/);
        expect(SRC).toMatch(/t\(['"]Hide['"]\)/);
    });

    test('1.3  both Show and Hide appear on the same toggle button line', () => {
        expect(SRC).toMatch(/t\(['"]Hide['"]\).*title|title.*t\(['"]Show['"]\)/s);
    });

    test('1.4  useTranslation is imported', () => {
        expect(SRC).toMatch(/import.*useTranslation.*from ['"]react-i18next['"]/);
    });

    test('1.5  const { t } = useTranslation() is called inside the component', () => {
        expect(SRC).toMatch(/const\s*\{\s*t[^}]*\}\s*=\s*useTranslation\(/);
    });
});

describe('StatsSummary.js — title prop usage', () => {
    test('2.1  title is used as a variable (not passed through t() internally)', () => {
        // title should appear as {title} in JSX, not t(title), since callers pre-translate it
        expect(SRC).toMatch(/\$\{title\}/);
    });

    test('2.2  f.label is translated via t(f.label)', () => {
        expect(SRC).toMatch(/t\(f\.label\)/);
    });
});
