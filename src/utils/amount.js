// move this outside the component so it isn’t re-created on every render
/*const twoDecimalsFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});*/

function getDecimalsFormatter(decimalPlaces) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    });
}


const Amount = ({ amount, decimals = 2 }) => {
    return <span>{getDecimalsFormatter(decimals).format(amount)}</span>;
};

export default Amount;
