export function getTimeGreeting(userName: string, date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 7 && hour < 12) return `Good Morning, ${userName}`;
  if (hour >= 12 && hour < 17) return `Good Afternoon, ${userName}`;
  if (hour >= 17 && hour < 21) return `Good Evening, ${userName}`;
  return `Hello, ${userName}`;
}
