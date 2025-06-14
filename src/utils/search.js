export function highlightWords(text, words) {
    if (!text) return null;
    if (!words || words.length === 0) return text;

    const lowerText = text.toLowerCase();
    let parts = [];
    let remainingText = text;
    let currentIndex = 0;

    while (remainingText) {
        let nextMatchIndex = -1;
        let matchWord = "";

        for (let word of words) {
            const idx = lowerText.indexOf(word.toLowerCase(), currentIndex);
            if (idx !== -1 && (nextMatchIndex === -1 || idx < nextMatchIndex)) {
                nextMatchIndex = idx;
                matchWord = word;
            }
        }

        if (nextMatchIndex === -1) {
            parts.push(remainingText);
            break;
        }

        const matchStart = nextMatchIndex;
        const matchEnd = matchStart + matchWord.length;

        const beforeMatch = text.slice(currentIndex, matchStart);
        const matchedText = text.slice(matchStart, matchEnd);

        if (beforeMatch) {
            parts.push(beforeMatch);
        }

        parts.push(
            <strong style={{ backgroundColor: "yellow" }} key={matchStart}>
                {matchedText}
            </strong>
        );

        currentIndex = matchEnd;
        remainingText = text.slice(currentIndex);
    }

    return parts;
}
