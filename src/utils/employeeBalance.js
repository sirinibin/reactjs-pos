// Employee liability-account balances are always stored as an unsigned
// magnitude (see backend Account.CalculateBalance) — direction is carried
// separately in account.type ("liability" = store owes employee, "asset" =
// employee owes the store, e.g. an advance/overpayment not yet worked off).
//
// The employee's balance-sheet/ledger (Posting) shows a single SIGNED balance
// column instead: negative = store owes the employee, positive = employee
// owes the store (see backend models/posting.go CreatePostings, which negates
// the magnitude for "liability" type accounts). We mirror that exact sign
// convention here so the number shown in the index table / form always
// matches what the employee's balance sheet shows.
export function getEmployeeBalanceInfo(account, t) {
    const magnitude = account && account.balance ? account.balance : 0;
    const amount = account && account.type === 'asset' ? magnitude : -magnitude;

    if (!account || magnitude === 0) {
        return {
            amount: 0,
            magnitude: 0,
            label: t('Balance'),
            suffix: '',
            colorClass: 'text-success',
            colorHex: '#1a7a3a',
        };
    }

    if (account.type === 'asset') {
        return {
            amount,
            magnitude,
            label: t('Balance'),
            suffix: t('Employee Owes'),
            colorClass: 'text-primary',
            colorHex: '#0a58ca',
        };
    }

    return {
        amount,
        magnitude,
        label: t('Balance'),
        suffix: t('Owed to Employee'),
        colorClass: 'text-danger',
        colorHex: '#ba1a1a',
    };
}
