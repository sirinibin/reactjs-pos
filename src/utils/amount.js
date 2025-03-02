const Amount = ({ amount }) => {
    return <span>{new Intl.NumberFormat("en-US").format(amount)}</span>;
};

export default Amount;