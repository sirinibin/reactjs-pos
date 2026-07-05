import React from "react";
import { render, screen } from "@testing-library/react";
import { highlightWords } from "../search";

describe("highlightWords", () => {
    test("null text returns null", () => {
        expect(highlightWords(null, ["hello"])).toBeNull();
    });

    test("undefined text returns null", () => {
        expect(highlightWords(undefined, ["hello"])).toBeNull();
    });

    test("empty words array returns original string unchanged", () => {
        const result = highlightWords("hello world", []);
        expect(result).toBe("hello world");
    });

    test("null words returns original string unchanged", () => {
        const result = highlightWords("hello world", null);
        // null words length check: returns text
        expect(result).toBe("hello world");
    });

    test("matching word renders a <strong> with yellow background", () => {
        const result = highlightWords("hello world", ["hello"]);
        const { container } = render(<>{result}</>);
        const strong = container.querySelector("strong");
        expect(strong).not.toBeNull();
        expect(strong.textContent).toBe("hello");
        expect(strong.style.backgroundColor).toBe("yellow");
    });

    test("string input for words splits on whitespace and still works", () => {
        const result = highlightWords("hello world", "hello world");
        const { container } = render(<>{result}</>);
        const strongs = container.querySelectorAll("strong");
        expect(strongs.length).toBe(2);
    });

    test("case-insensitive match", () => {
        const result = highlightWords("Hello World", ["hello"]);
        const { container } = render(<>{result}</>);
        const strong = container.querySelector("strong");
        expect(strong).not.toBeNull();
        expect(strong.textContent).toBe("Hello");
    });

    test("special regex chars in words are escaped, no regex error", () => {
        expect(() => {
            const result = highlightWords("some text with .*", [".*"]);
            render(<>{result}</>);
        }).not.toThrow();
    });

    test("special regex chars match literally", () => {
        const result = highlightWords("price is $10.00 today", ["$10.00"]);
        const { container } = render(<>{result}</>);
        const strong = container.querySelector("strong");
        expect(strong).not.toBeNull();
        expect(strong.textContent).toBe("$10.00");
    });

    test("multiple words matched", () => {
        const result = highlightWords("the quick brown fox", ["quick", "fox"]);
        const { container } = render(<>{result}</>);
        const strongs = container.querySelectorAll("strong");
        expect(strongs.length).toBe(2);
        expect(strongs[0].textContent).toBe("quick");
        expect(strongs[1].textContent).toBe("fox");
    });

    test("isActive=true sets color #000 on the strong element", () => {
        const result = highlightWords("hello world", ["hello"], true);
        const { container } = render(<>{result}</>);
        const strong = container.querySelector("strong");
        expect(strong).not.toBeNull();
        expect(strong.style.color).toBe("rgb(0, 0, 0)");
    });

    test("isActive=false (default) does not set color on strong element", () => {
        const result = highlightWords("hello world", ["hello"], false);
        const { container } = render(<>{result}</>);
        const strong = container.querySelector("strong");
        expect(strong).not.toBeNull();
        expect(strong.style.color).toBe("");
    });
});
