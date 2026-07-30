export type DaysRemaining = {
  text: string;
  isOverdue: boolean;
};

export function getDaysRemaining(
  endDate: string,
  now = new Date(),
): DaysRemaining {
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) {
    return { text: "No due date", isOverdue: false };
  }

  const diffDays = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)} days`, isOverdue: true };
  }

  return { text: `${diffDays} days remaining`, isOverdue: false };
}
