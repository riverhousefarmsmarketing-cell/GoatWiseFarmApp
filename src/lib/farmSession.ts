/**
 * The signed-in person's role on the farm they're working in, kept outside
 * React so plain helpers (like deleteOrRequest) can read it. FarmProvider
 * keeps it current. The database enforces every rule regardless; this only
 * decides what to ask the person and what to tell them.
 */
export type FarmRole = 'owner' | 'manager' | 'worker';

let currentRole: FarmRole | null = null;

export function setFarmSessionRole(role: FarmRole | null) {
  currentRole = role;
}

export function getFarmSessionRole(): FarmRole | null {
  return currentRole;
}

export function isFarmManagerRole(role: FarmRole | null | undefined): boolean {
  return role === 'owner' || role === 'manager';
}
