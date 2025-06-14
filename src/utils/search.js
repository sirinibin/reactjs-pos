export function highlightWords(text, words, isActive = false) {
    if (!text) return null;
    if (!words || words.length === 0) return text;

    const regex = new RegExp(`(${words.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
        words.some(word => word?.toLowerCase() === part?.toLowerCase()) ? (
            <strong
                key={index}
                style={{
                    backgroundColor: "yellow",
                    color: isActive ? "#000" : undefined,  // force readable text on blue bg
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
