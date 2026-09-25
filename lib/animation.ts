/** Motion tokens — the only easing curves and durations in the app. */
export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};

export const DURATION = {
  feedback: 0.12,
  state: 0.22,
  layout: 0.38,
  focal: 0.9,
};

export const SPRING = {
  snappy: { type: "spring", stiffness: 520, damping: 34, mass: 0.7 } as const,
  soft: { type: "spring", stiffness: 180, damping: 26 } as const,
};
