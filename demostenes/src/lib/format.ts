const dateTime = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const date = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const formatDateTime = (value: Date) => dateTime.format(value);
export const formatDate = (value: Date) => date.format(value);
