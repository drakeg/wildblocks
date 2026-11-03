export const SKILLS = ["Gathering", "Mining", "Woodcutting", "Crafting", "Farming"];
export function levelFor(xp, scale = 25) {
  const level = Math.floor(Math.sqrt(xp / scale)) + 1;
  const start = scale * (level - 1) ** 2,
    next = scale * level ** 2;
  return { level, xp, current: xp - start, needed: next - start };
}
export class Progression {
  constructor(saved) {
    if (
      saved !== undefined &&
      (!Array.isArray(saved) ||
        ![4,SKILLS.length].includes(saved.length) ||
        saved.some((n) => !Number.isSafeInteger(n) || n < 0 || n > 1e9))
    )
      throw Error("Invalid skill experience.");
    this.xp = SKILLS.map((_,i)=>saved?.[i]??0);
  }
  earn(skill, amount) {
    const index = SKILLS.indexOf(skill);
    if (index < 0 || !Number.isSafeInteger(amount) || amount <= 0) return;
    this.xp[index] = Math.min(1e9, this.xp[index] + amount);
  }
  get character() {
    return levelFor(
      this.xp.reduce((a, b) => a + b, 0),
      100,
    );
  }
  skill(name) {
    return levelFor(this.xp[SKILLS.indexOf(name)] || 0);
  }
  snapshot() {
    return [...this.xp];
  }
}
export function skillFor(id) {
  if([29,31].includes(id))return "Farming";
  return [3,6,8,11,12,15,16,17,18].includes(id)
    ? "Mining"
    : [4,7,9,19,20,22,23,24,25].includes(id)
      ? "Woodcutting"
      : "Gathering";
}
