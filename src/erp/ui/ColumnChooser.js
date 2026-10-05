import React, { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Modal } from './Overlay';
import { Button, IconButton } from './Button';

/** Show/hide and reorder columns. prefs: [{key, visible}]; labels: {key: label}. */
export default function ColumnChooser({ open, onClose, prefs, labels, onSave, onReset }) {
    const [draft, setDraft] = useState(prefs);
    useEffect(() => { if (open) setDraft(prefs); }, [open, prefs]);

    function move(idx, delta) {
        const next = draft.slice();
        const target = idx + delta;
        if (target < 0 || target >= next.length) return;
        const tmp = next[idx];
        next[idx] = next[target];
        next[target] = tmp;
        setDraft(next);
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Columns"
            size="sm"
            footer={
                <>
                    <Button onClick={() => { onReset(); onClose(); }} variant="ghost">Restore defaults</Button>
                    <span style={{ flex: 1 }} />
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={() => { onSave(draft); onClose(); }}>Apply</Button>
                </>
            }
        >
            <ul className="erp-colchooser">
                {draft.map((p, i) => (
                    <li key={p.key}>
                        <label className="erp-check">
                            <input
                                type="checkbox"
                                checked={p.visible}
                                onChange={e => setDraft(draft.map(d => d.key === p.key ? { ...d, visible: e.target.checked } : d))}
                            />
                            <span>{labels[p.key] || p.key}</span>
                        </label>
                        <span className="erp-row" style={{ gap: 2 }}>
                            <IconButton icon={ArrowUp} size="sm" label={'Move ' + (labels[p.key] || p.key) + ' up'} disabled={i === 0} onClick={() => move(i, -1)} />
                            <IconButton icon={ArrowDown} size="sm" label={'Move ' + (labels[p.key] || p.key) + ' down'} disabled={i === draft.length - 1} onClick={() => move(i, 1)} />
                        </span>
                    </li>
                ))}
            </ul>
        </Modal>
    );
}
