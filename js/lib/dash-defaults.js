// Default Today dashboard. Each item is a card instance: { id, type, opts }.
const id = () => Math.random().toString(36).slice(2, 9);
export function defaultDashboard() {
  return [
    { id: id(), type: 'week', opts: {} },
    { id: id(), type: 'bodyweight', opts: {} },
    { id: id(), type: 'streak', opts: {} },
    { id: id(), type: 'strength', opts: {} },
    { id: id(), type: 'muscles', opts: {} },
    { id: id(), type: 'prs', opts: {} },
    { id: id(), type: 'volume', opts: {} },
    { id: id(), type: 'calendar', opts: {} },
  ];
}
