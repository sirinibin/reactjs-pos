let _count = 0;

export function acquireFormOverHistory() {
    _count++;
    document.body.classList.add('form-over-history');
}

export function releaseFormOverHistory() {
    _count = Math.max(0, _count - 1);
    if (_count === 0) document.body.classList.remove('form-over-history');
}
