import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import useStore from "../useStore";
import { _clearAllStoreCaches, refreshStore, primeStoreCache } from "../storeUtils";

const json = (result) => ({ ok: true, headers: { get: () => "application/json" }, json: () => Promise.resolve({ result }) });

function Show({ id }) {
    const store = useStore(id);
    return <div data-testid="name">{store ? store.name : "none"}</div>;
}

beforeEach(() => {
    localStorage.clear();
    _clearAllStoreCaches();
    global.fetch = jest.fn();
});

test("loads once and re-renders on a pushed change", async () => {
    fetch.mockResolvedValueOnce(json({ id: "s1", name: "First" }));
    render(<><Show id="s1" /><Show id="s1" /></>);
    await waitFor(() => expect(screen.getAllByTestId("name")[0].textContent).toBe("First"));
    expect(fetch).toHaveBeenCalledTimes(1);

    fetch.mockResolvedValueOnce(json({ id: "s1", name: "Second" }));
    await act(async () => { await refreshStore("s1"); });
    screen.getAllByTestId("name").forEach((el) => expect(el.textContent).toBe("Second"));
    expect(fetch).toHaveBeenCalledTimes(2);
});

test("starts from the cached copy without a request", async () => {
    primeStoreCache({ id: "s2", name: "Cached" });
    render(<Show id="s2" />);
    expect(screen.getByTestId("name").textContent).toBe("Cached");
    await act(async () => { });
    expect(fetch).not.toHaveBeenCalled();
});

test("ignores updates to other stores and handles no id", async () => {
    primeStoreCache({ id: "s3", name: "Mine" });
    const { rerender } = render(<Show id="s3" />);
    act(() => { primeStoreCache({ id: "s4", name: "Theirs" }); });
    expect(screen.getByTestId("name").textContent).toBe("Mine");
    rerender(<Show id={null} />);
    expect(screen.getByTestId("name").textContent).toBe("none");
});
