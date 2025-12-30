function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightWords(text, words, isActive = false) {
    if (!text) return null;
    if (!words || words.length === 0) return text;

    // FIX: Ensure words is always an array of strings
    let wordArr = Array.isArray(words)
        ? words
        : String(words).split(/\s+/).filter(Boolean);

    if (wordArr.length === 0) return text;

    const safeWords = wordArr.map(escapeRegExp);
    const regex = new RegExp(`(${safeWords.join("|")})`, "gi");
    const parts = String(text).split(regex);

    return parts.map((part, index) =>
        wordArr.some(word => word?.toLowerCase() === part?.toLowerCase()) ? (
            <strong
                key={index}
                style={{
                    backgroundColor: "yellow",
                    color: isActive ? "#000" : undefined,
                    padding: "0 2px"
                }}
            >
                {part}
            </strong>
        ) : (
            <span key={index}>{part}</span>
        )
    );
};