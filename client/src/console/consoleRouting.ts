export function isConsoleHost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  return hostname === 'hq.cerosity.com' || params.get('console') === '1';
}

export function getConsoleRedirectPath(): string {
  return '/console/login';
}
