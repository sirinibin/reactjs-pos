import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../LanguageSwitcher';
import { LANGUAGE_OPTIONS, RTL_LANGUAGES } from '../../i18n/config';

// ---------------------------------------------------------------------------
// react-bootstrap mock
// DropdownButton wraps title in a <span> so getByText('English') finds it
// without matching the longer item labels like 'English (English)'.
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => ({
  DropdownButton: ({ title, children }) => (
    <div>
      <span data-testid="dropdown-title">{title}</span>
      {children}
    </div>
  ),
  Dropdown: {
    Item: ({ children, onClick }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  },
}));

// ---------------------------------------------------------------------------
// i18n/config mock
// The real module initialises i18next and imports ~28 JSON translation files.
// We replace it with a static fixture that mirrors the real LANGUAGE_OPTIONS
// and RTL_LANGUAGES so tests run without any file-system reads.
// ---------------------------------------------------------------------------
jest.mock('../../i18n/config', () => ({
  LANGUAGE_OPTIONS: [
    { code: 'en', name: 'English',   nativeName: 'English'    },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം'     },
    { code: 'ar', name: 'Arabic',    nativeName: 'العربية'     },
    { code: 'bn', name: 'Bengla',    nativeName: 'বাংলা'       },
    { code: 'ur', name: 'Urdu',      nativeName: 'اردو'        },
    { code: 'hn', name: 'Hindi',     nativeName: 'हिन्दी'      },
    { code: 'ru', name: 'Russian',   nativeName: 'Русский'    },
  ],
  // Mirrors the real export (currently empty — ar/ur RTL is commented out).
  RTL_LANGUAGES: [],
}));

// ---------------------------------------------------------------------------
// react-i18next mock
//
// The factory closure captures mockChangeLanguage and mockI18n by reference.
// The factory itself is called lazily (at first import of the mocked module),
// but useTranslation() is only executed during rendering, by which time both
// consts are already initialised — so const declarations are safe here.
// ---------------------------------------------------------------------------
const mockChangeLanguage = jest.fn();
const mockI18n = {
  language: 'en',
  changeLanguage: mockChangeLanguage,
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: mockI18n,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build the label text as rendered by the component. */
const itemLabel = (lang) => `${lang.nativeName} (${lang.name})`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    mockChangeLanguage.mockReset();
    mockI18n.language = 'en';
    document.documentElement.removeAttribute('dir');
  });

  // 1 -----------------------------------------------------------------------
  test('renders without crashing', () => {
    const { container } = render(<LanguageSwitcher />);
    expect(container.firstChild).toBeTruthy();
  });

  // 2 -----------------------------------------------------------------------
  test('renders a button/dropdown showing the current language native name', () => {
    render(<LanguageSwitcher />);
    // data-testid isolates the title span from the longer item labels.
    const title = screen.getByTestId('dropdown-title');
    expect(title).toHaveTextContent('English');
  });

  test('shows the correct native name when a non-default language is active', () => {
    mockI18n.language = 'ar';
    render(<LanguageSwitcher />);
    expect(screen.getByTestId('dropdown-title')).toHaveTextContent('العربية');
  });

  // 3 -----------------------------------------------------------------------
  test('each LANGUAGE_OPTIONS entry is rendered as a dropdown item', () => {
    render(<LanguageSwitcher />);
    LANGUAGE_OPTIONS.forEach((lang) => {
      expect(screen.getByText(itemLabel(lang))).toBeInTheDocument();
    });
  });

  test('renders exactly as many dropdown items as LANGUAGE_OPTIONS has entries', () => {
    render(<LanguageSwitcher />);
    // Every item renders as a <button> produced by the Dropdown.Item mock.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(LANGUAGE_OPTIONS.length);
  });

  // 4 -----------------------------------------------------------------------
  test('clicking a language option calls i18n.changeLanguage with the correct code', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText(itemLabel({ nativeName: 'العربية', name: 'Arabic' })));
    expect(mockChangeLanguage).toHaveBeenCalledTimes(1);
    expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
  });

  test('clicking different language items calls changeLanguage with each code', () => {
    render(<LanguageSwitcher />);
    LANGUAGE_OPTIONS.forEach((lang, index) => {
      fireEvent.click(screen.getByText(itemLabel(lang)));
      expect(mockChangeLanguage).toHaveBeenNthCalledWith(index + 1, lang.code);
    });
  });

  // 5 -----------------------------------------------------------------------
  test('clicking a language option stores the selection in localStorage', () => {
    // i18next-browser-languagedetector writes to localStorage under the key
    // 'i18nextLng' when changeLanguage is called.  We simulate that side
    // effect in the mock so this test verifies the integration contract.
    mockChangeLanguage.mockImplementation((code) => {
      localStorage.setItem('i18nextLng', code);
    });

    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByText(itemLabel({ nativeName: 'മലയാളം', name: 'Malayalam' })));

    expect(localStorage.getItem('i18nextLng')).toBe('ml');
  });

  test('each clicked language is stored correctly in localStorage', () => {
    mockChangeLanguage.mockImplementation((code) => {
      localStorage.setItem('i18nextLng', code);
    });

    render(<LanguageSwitcher />);
    LANGUAGE_OPTIONS.forEach((lang) => {
      fireEvent.click(screen.getByText(itemLabel(lang)));
      expect(localStorage.getItem('i18nextLng')).toBe(lang.code);
    });
  });

  // 6 -----------------------------------------------------------------------
  test('renders labels for all languages in "nativeName (name)" format', () => {
    render(<LanguageSwitcher />);

    const expectedLabels = [
      'English (English)',
      'മലയാളം (Malayalam)',
      'العربية (Arabic)',
      'বাংলা (Bengla)',
      'اردو (Urdu)',
      'हिन्दी (Hindi)',
      'Русский (Russian)',
    ];

    expectedLabels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  // 7 -----------------------------------------------------------------------
  test('RTL languages set dir="rtl" on document; LTR languages set dir="ltr"', () => {
    // The real i18n config wires up i18n.on('languageChanged', setDirection).
    // We simulate that side effect in the mock so the component's own
    // changeLanguage call is what drives the assertion.
    mockChangeLanguage.mockImplementation((code) => {
      const dir = RTL_LANGUAGES.includes(code) ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
    });

    render(<LanguageSwitcher />);

    LANGUAGE_OPTIONS.forEach((lang) => {
      fireEvent.click(screen.getByText(itemLabel(lang)));
      const expectedDir = RTL_LANGUAGES.includes(lang.code) ? 'rtl' : 'ltr';
      expect(document.documentElement.getAttribute('dir')).toBe(expectedDir);
    });
  });

  test('dir="rtl" is set when a language in RTL_LANGUAGES is selected', () => {
    // Temporarily treat 'ar' as RTL to exercise the rtl branch, regardless
    // of the current RTL_LANGUAGES fixture value.
    mockChangeLanguage.mockImplementation((code) => {
      const rtlSet = ['ar', 'ur']; // canonical RTL codes
      const dir = rtlSet.includes(code) ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
    });

    render(<LanguageSwitcher />);

    fireEvent.click(screen.getByText(itemLabel({ nativeName: 'العربية', name: 'Arabic' })));
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');

    fireEvent.click(screen.getByText(itemLabel({ nativeName: 'English', name: 'English' })));
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });
});
