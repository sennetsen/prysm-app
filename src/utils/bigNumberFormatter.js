export const bigNumberFormatter = (count) => {
  if (count >= 1e15) {
    return '--';
  }

  if (count < 1000) {
    return count.toString();
  }

  if (count < 10000) {
    if (count < 1100) return '1K';
    const hundreds = Math.floor((count - 1000) / 100);
    return `${1 + hundreds * 0.1}K`;
  }

  if (count < 100000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands}K`;
  }

  if (count < 1000000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands}K`;
  }

  if (count < 10000000) {
    if (count < 1100000) return '1M';
    const hundredThousands = Math.floor((count - 1000000) / 100000);
    return `${1 + hundredThousands * 0.1}M`;
  }

  if (count < 1000000000) {
    const millions = Math.floor(count / 1000000);
    return `${millions}M`;
  }

  if (count < 10000000000) {
    if (count < 1100000000) return '1B';
    const hundredMillions = Math.floor((count - 1000000000) / 100000000);
    return `${1 + hundredMillions * 0.1}B`;
  }

  if (count < 1000000000000) {
    const billions = Math.floor(count / 1000000000);
    return `${billions}B`;
  }

  if (count < 10000000000000) {
    if (count < 1100000000000) return '1T';
    const hundredBillions = Math.floor((count - 1000000000000) / 100000000000);
    return `${1 + hundredBillions * 0.1}T`;
  }

  const trillions = Math.floor(count / 1000000000000);
  return `${trillions}T`;
};

export const formatNumberWithCommas = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};