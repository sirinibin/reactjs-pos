import { useCallback, useRef, useState } from "react";

// For a modal component opened through its ref (ref.current.open(...)) that should
// mount only when first opened: a screen that renders a form or preview up front
// pays its loading (store, print settings, reminders...) even if it never opens.
//   const salesForm = useLazyOpen();
//   salesForm.open(id);                         // mounts it, then calls open(id)
//   {salesForm.mounted && <OrderCreate ref={salesForm.ref} />}
export function useLazyOpen() {
    const [mounted, setMounted] = useState(false);
    const instanceRef = useRef(null);
    const pendingArgsRef = useRef(null);
    const ref = useCallback((instance) => {
        instanceRef.current = instance;
        if (instance && pendingArgsRef.current) {
            const args = pendingArgsRef.current;
            pendingArgsRef.current = null;
            instance.open(...args);
        }
    }, []);
    const open = useCallback((...args) => {
        if (instanceRef.current) {
            instanceRef.current.open(...args);
        } else {
            pendingArgsRef.current = args;
            setMounted(true);
        }
    }, []);
    return { mounted, ref, open };
}
