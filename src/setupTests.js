// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// The page-wide store copy (src/utils/storeUtils.js) lives in module state;
// start every test without one, as a fresh page load does.
beforeEach(() => {
    const storeUtils = jest.requireActual('./utils/storeUtils');
    if (typeof storeUtils._clearAllStoreCaches === 'function') storeUtils._clearAllStoreCaches();
});
