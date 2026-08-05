import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StoreIndex from '../index';

// ---------------------------------------------------------------------------
// CSS / static assets
// ---------------------------------------------------------------------------
jest.mock('react-datepicker/dist/react-datepicker.css', () => ({}));

// ---------------------------------------------------------------------------
// react-bootstrap: Button, Spinner, Dropdown (+ sub-components)
// ---------------------------------------------------------------------------
jest.mock('react-bootstrap', () => {
  const MockButton = ({ children, onClick, disabled, style, className, title, variant, size, hide }) => (
    <button onClick={onClick} disabled={disabled} style={style} className={className} title={title}>
      {children}
    </button>
  );
  const MockSpinner = () => null;

  const MockDropdownToggle = ({ children, id, variant, size }) => (
    <button id={id}>{children}</button>
  );
  const MockDropdownMenu = ({ children }) => <div>{children}</div>;
  const MockDropdownItem = ({ children, onClick, disabled, className }) => (
    <div onClick={onClick} className={className}>{children}</div>
  );
  const MockDropdownDivider = () => <hr />;

  const MockDropdown = ({ children, className }) => <div className={className}>{children}</div>;
  MockDropdown.Toggle = MockDropdownToggle;
  MockDropdown.Menu = MockDropdownMenu;
  MockDropdown.Item = MockDropdownItem;
  MockDropdown.Divider = MockDropdownDivider;

  return {
    Button: MockButton,
    Spinner: MockSpinner,
    Dropdown: MockDropdown,
  };
});

// ---------------------------------------------------------------------------
// Child domain components (all used with refs → must be forwardRef +
// useImperativeHandle so calls like CreateFormRef.current.open() don't throw)
// Use require() inside factory to avoid Jest's out-of-scope variable error.
// ---------------------------------------------------------------------------
jest.mock('../create.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../zatca_connect.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../view.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../WhatsAppConnect.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../WhatsAppContactsModal.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../StoreBackup.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../StoreDuplicate.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../StoreDuplicateProducts.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../StoreDuplicateProductsNoImages.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);
jest.mock('../StoreDuplicateWithoutData.js', () =>
  require('react').forwardRef((_props, ref) => {
    require('react').useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return null;
  })
);

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
jest.mock('../../utils/OverflowTooltip.js', () => () => null);
jest.mock('../../utils/dateUtils.js', () => ({ TimeAgo: () => null }));
jest.mock('../../utils/queryUtils.js', () => ({
  ObjectToSearchQueryParams: jest.fn(() => ''),
}));
jest.mock('../../utils/PaginationControls.js', () => () => null);

// ---------------------------------------------------------------------------
// Timer / fetch setup
// ---------------------------------------------------------------------------
jest.useFakeTimers();

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () =>
      Promise.resolve({
        result: [],
        data: [],
        total_count: 0,
        store: {},
        settings: {},
        status: true,
      }),
  });
  localStorage.clear();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ---------------------------------------------------------------------------
// Smoke test
// ---------------------------------------------------------------------------
describe('StoreIndex smoke test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <StoreIndex />
        </MemoryRouter>
      );
    });
  });
});
