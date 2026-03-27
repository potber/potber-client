const SHORT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export type DateInput = string | number | Date | null | undefined;

export function formatDateTime(value: DateInput) {
  if (!value) return '';

  const date = value instanceof Date ? value : new Date(value);

  return SHORT_DATE_TIME_FORMATTER.format(date);
}
