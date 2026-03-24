const pad = (value: number): string => value.toString().padStart(2, "0");

export const toDateOnly = (value: Date | string): string => {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());

  return `${year}-${month}-${day}`;
};
