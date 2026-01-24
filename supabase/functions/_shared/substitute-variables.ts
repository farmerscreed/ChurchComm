export interface SubstitutionContext {
  first_name?: string;
  last_name?: string;
  church_name?: string;
  pastor_name?: string;
  event_name?: string;
  event_date?: string;
  day_of_week?: string;
  membership_duration?: string;
}

export function substituteVariables(
  template: string,
  context: SubstitutionContext
): string {
  let result = template;

  const variables: Record<string, string | undefined> = {
    first_name: context.first_name,
    last_name: context.last_name,
    church_name: context.church_name,
    pastor_name: context.pastor_name,
    event_name: context.event_name,
    event_date: context.event_date,
    day_of_week: context.day_of_week || new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    membership_duration: context.membership_duration,
  };

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(pattern, value || '');
  }

  return result;
}

export function calculateMembershipDuration(createdAt: Date): string {
  const now = new Date();
  const months = (now.getFullYear() - createdAt.getFullYear()) * 12
    + (now.getMonth() - createdAt.getMonth());

  if (months < 1) return 'less than a month';
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}
