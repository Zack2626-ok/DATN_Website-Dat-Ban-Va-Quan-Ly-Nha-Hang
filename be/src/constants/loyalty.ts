/** Membership levels supported by the loyalty programme. */
export const MEMBER_LEVEL = {
  BRONZE: "bronze",
  SILVER: "silver",
  GOLD: "gold",
  VIP: "vip",
} as const;

export type MemberLevel = (typeof MEMBER_LEVEL)[keyof typeof MEMBER_LEVEL];

/** Point threshold for each membership level. */
export const MEMBER_LEVEL_MIN_POINTS: Record<MemberLevel, number> = {
  [MEMBER_LEVEL.BRONZE]: 0,
  [MEMBER_LEVEL.SILVER]: 2000,
  [MEMBER_LEVEL.GOLD]: 8000,
  [MEMBER_LEVEL.VIP]: 20000,
};

/** Relative order used to decide whether a member can unlock a reward. */
export const MEMBER_LEVEL_RANK: Record<MemberLevel, number> = {
  [MEMBER_LEVEL.BRONZE]: 0,
  [MEMBER_LEVEL.SILVER]: 1,
  [MEMBER_LEVEL.GOLD]: 2,
  [MEMBER_LEVEL.VIP]: 3,
};

export interface TierRewardVoucherDefinition {
  code: string;
  requiredMemberLevel: MemberLevel;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  pointsCost: number;
}

/** Canonical reward catalogue: one progressively better reward per membership tier. */
export const TIER_REWARD_VOUCHERS: readonly TierRewardVoucherDefinition[] = [
  { code: "SAVE10", requiredMemberLevel: MEMBER_LEVEL.BRONZE, type: "percent", value: 10, minOrder: 500000, pointsCost: 100 },
  { code: "SILVER15", requiredMemberLevel: MEMBER_LEVEL.SILVER, type: "percent", value: 15, minOrder: 700000, pointsCost: 150 },
  { code: "GOLD25", requiredMemberLevel: MEMBER_LEVEL.GOLD, type: "percent", value: 25, minOrder: 1000000, pointsCost: 250 },
  { code: "VIP30", requiredMemberLevel: MEMBER_LEVEL.VIP, type: "percent", value: 30, minOrder: 1500000, pointsCost: 400 },
];

/** Returns the membership tier earned from the current point balance. */
export const getMemberLevelFromPoints = (points: number): MemberLevel => {
  if (points >= MEMBER_LEVEL_MIN_POINTS[MEMBER_LEVEL.VIP]) return MEMBER_LEVEL.VIP;
  if (points >= MEMBER_LEVEL_MIN_POINTS[MEMBER_LEVEL.GOLD]) return MEMBER_LEVEL.GOLD;
  if (points >= MEMBER_LEVEL_MIN_POINTS[MEMBER_LEVEL.SILVER]) return MEMBER_LEVEL.SILVER;
  return MEMBER_LEVEL.BRONZE;
};

/** Safely normalizes a persisted membership level before comparing reward access. */
export const normalizeMemberLevel = (value: string | null | undefined): MemberLevel => {
  return Object.values(MEMBER_LEVEL).includes(value as MemberLevel)
    ? (value as MemberLevel)
    : MEMBER_LEVEL.BRONZE;
};
