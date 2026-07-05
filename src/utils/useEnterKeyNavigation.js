import { useEffect } from 'react';

export function useEnterKeyNavigation({ stayClass = "barcode", onStay = null } = {}) {
    useEffect(() => {
        const listener = (event) => {
            if (event.code !== "Enter" && event.code !== "NumpadEnter") return;
            const form = event.target.form;
            if (!form || !event.target) return;
            const index = Array.prototype.indexOf.call(form, event.target);
            if (!form.elements[index + 1]) return;
            const cls = event.target.getAttribute("class") || "";
            if (cls.includes(stayClass)) {
                if (onStay) onStay(event.target);
            } else {
                form.elements[index + 1].focus();
            }
            event.preventDefault();
        };
        document.addEventListener("keydown", listener);
        return () => document.removeEventListener("keydown", listener);
    }, [stayClass, onStay]);
}
