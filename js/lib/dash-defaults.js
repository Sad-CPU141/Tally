// Default dashboards. Each item is a card instance: { id, type, opts }.
const id = () => Math.random().toString(36).slice(2, 9);
const make = types => types.map(type => ({ id: id(), type, opts: {} }));

// Gym mode: Today
export const defaultDashboard = () => make(['week', 'streak', 'prs', 'strength', 'muscles', 'volume', 'bodyweight', 'calendar']);
// Food mode: Insights
export const defaultFoodDashboard = () => make(['calories', 'protein', 'score', 'macroSplit', 'tdee', 'bodyweight', 'deficit', 'trainRest', 'proteinProgress']);

// Card categories that belong to Food mode. 'Body' cards can sit on either dashboard.
export const FOOD_CATS = new Set(['Food', 'Combined']);
