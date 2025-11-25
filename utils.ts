export const formatNumberWithThousands = (value: string | number): string => {
  if (value === '' || value === null || value === undefined) return '';
  const stringValue = String(value).replace(/\D/g, '');
  if (stringValue === '') return '';
  const numberValue = parseInt(stringValue, 10);
  return numberValue.toLocaleString('pt-BR');
};

export const parseFormattedNumber = (value: string): number => {
  if (typeof value !== 'string' || value === '') return 0;
  return Number(value.replace(/\./g, ''));
};
