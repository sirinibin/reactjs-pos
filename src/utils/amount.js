// move this outside the component so it isn’t re-created on every render
const twoDecimalsFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const Amount = ({ amount }) => {
    return <span>{twoDecimalsFormatter.format(amount)}</span>;
};

export default Amount;
