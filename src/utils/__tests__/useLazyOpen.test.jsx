import React, { forwardRef, useImperativeHandle } from 'react';
import { render, act } from '@testing-library/react';
import { useLazyOpen } from '../useLazyOpen.js';

const mounts = jest.fn();
const opens = jest.fn();
const Form = forwardRef((_p, ref) => {
    React.useEffect(() => { mounts(); }, []);
    useImperativeHandle(ref, () => ({ open: (...a) => opens(...a) }));
    return null;
});

let api;
function Screen() {
    const form = useLazyOpen();
    api = form;
    return form.mounted ? <Form ref={form.ref} /> : null;
}

beforeEach(() => { mounts.mockClear(); opens.mockClear(); });

test('the form is not mounted until opened, then opened with the given arguments', () => {
    render(<Screen />);
    expect(mounts).not.toHaveBeenCalled();
    act(() => api.open('id1', 'x'));
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(opens).toHaveBeenCalledWith('id1', 'x');
});

test('opening again reuses the mounted form', () => {
    render(<Screen />);
    act(() => api.open('id1'));
    act(() => api.open('id2'));
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(opens.mock.calls).toEqual([['id1'], ['id2']]);
});

test('two opens before it mounts open it once, with the latest arguments', () => {
    render(<Screen />);
    act(() => { api.open('a'); api.open('b'); });
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(opens.mock.calls).toEqual([['b']]);
});
