// 상점 아이템 타입 정의

// 아이템 카테고리
export type ItemCategory = 'emoji' | 'border' | 'nameEffect' | 'background' | 'titleColor';

// 상점 아이템
export interface ShopItem {
  code: string;           // 아이템 코드 (예: emoji_01)
  category: ItemCategory; // 카테고리
  name: string;           // 표시 이름
  price: number;          // 가격 (쿠키)
  value: string;          // 실제 값 (이모지면 😎, 테두리면 'neon-pink' 등)
  description?: string;   // 설명
}

// 구매 기록
export interface PurchaseRecord {
  itemCode: string;
  purchasedAt: string;
  price: number;
}

// ========================================
// 기본 상점 아이템 목록
// ========================================

// 이모지 아이템
export const EMOJI_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'emoji_00', category: 'emoji', name: '😀 기본', price: 0, value: '😀' },
  // 유료
  { code: 'emoji_01', category: 'emoji', name: '😎 쿨한', price: 5, value: '😎' },
  { code: 'emoji_02', category: 'emoji', name: '🤩 스타', price: 5, value: '🤩' },
  { code: 'emoji_03', category: 'emoji', name: '😇 천사', price: 5, value: '😇' },
  { code: 'emoji_04', category: 'emoji', name: '🥳 파티', price: 10, value: '🥳' },
  { code: 'emoji_05', category: 'emoji', name: '🐶 강아지', price: 10, value: '🐶' },
  { code: 'emoji_06', category: 'emoji', name: '🐱 고양이', price: 10, value: '🐱' },
  { code: 'emoji_07', category: 'emoji', name: '🦁 사자', price: 15, value: '🦁' },
  { code: 'emoji_08', category: 'emoji', name: '🐉 드래곤', price: 20, value: '🐉' },
  { code: 'emoji_09', category: 'emoji', name: '🦄 유니콘', price: 25, value: '🦄' },
  { code: 'emoji_10', category: 'emoji', name: '👑 왕관', price: 30, value: '👑' },
  { code: 'emoji_11', category: 'emoji', name: '🔥 불꽃', price: 15, value: '🔥' },
  { code: 'emoji_12', category: 'emoji', name: '⭐ 별', price: 10, value: '⭐' },
  { code: 'emoji_13', category: 'emoji', name: '💎 다이아', price: 30, value: '💎' },
  { code: 'emoji_14', category: 'emoji', name: '🚀 로켓', price: 20, value: '🚀' },
  { code: 'emoji_15', category: 'emoji', name: '🎮 게임', price: 15, value: '🎮' },
];

// 테두리 아이템
export const BORDER_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'border_00', category: 'border', name: '없음', price: 0, value: 'none' },
  { code: 'border_01', category: 'border', name: '기본', price: 0, value: 'solid' },
  // 유료
  { code: 'border_02', category: 'border', name: '🌈 무지개', price: 20, value: 'gradient-rainbow', description: '화려한 무지개 테두리' },
  { code: 'border_03', category: 'border', name: '🥇 골드', price: 25, value: 'gradient-gold', description: '빛나는 금색 테두리' },
  { code: 'border_04', category: 'border', name: '🌌 오로라', price: 25, value: 'gradient-aurora', description: '신비로운 오로라' },
  { code: 'border_05', category: 'border', name: '🔥 불꽃', price: 20, value: 'gradient-fire', description: '타오르는 불꽃' },
  { code: 'border_06', category: 'border', name: '🌊 바다', price: 20, value: 'gradient-ocean', description: '시원한 바다' },
  { code: 'border_07', category: 'border', name: '💙 네온블루', price: 30, value: 'neon-blue', description: '빛나는 네온 블루' },
  { code: 'border_08', category: 'border', name: '💗 네온핑크', price: 30, value: 'neon-pink', description: '빛나는 네온 핑크' },
  { code: 'border_09', category: 'border', name: '💚 네온그린', price: 30, value: 'neon-green', description: '빛나는 네온 그린' },
  { code: 'border_10', category: 'border', name: '💜 펄스', price: 35, value: 'pulse', description: '두근두근 펄스' },
  { code: 'border_11', category: 'border', name: '✨ 반짝임', price: 35, value: 'sparkle', description: '반짝반짝' },
];

// 이름 효과 아이템
export const NAME_EFFECT_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'name_00', category: 'nameEffect', name: '기본', price: 0, value: 'none' },
  // 유료
  { code: 'name_01', category: 'nameEffect', name: '🌈 무지개', price: 15, value: 'gradient-rainbow' },
  { code: 'name_02', category: 'nameEffect', name: '🔥 불꽃', price: 15, value: 'gradient-fire' },
  { code: 'name_03', category: 'nameEffect', name: '🌊 바다', price: 15, value: 'gradient-ocean' },
  { code: 'name_04', category: 'nameEffect', name: '🥇 골드', price: 20, value: 'gradient-gold' },
  { code: 'name_05', category: 'nameEffect', name: '💙 블루글로우', price: 25, value: 'glow-blue' },
  { code: 'name_06', category: 'nameEffect', name: '💗 핑크글로우', price: 25, value: 'glow-pink' },
  { code: 'name_07', category: 'nameEffect', name: '✨ 골드글로우', price: 30, value: 'glow-gold' },
  { code: 'name_08', category: 'nameEffect', name: '🖤 그림자', price: 10, value: 'shadow' },
];

// 배경 아이템
export const BACKGROUND_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'bg_00', category: 'background', name: '없음', price: 0, value: 'none' },
  // 유료
  { code: 'bg_01', category: 'background', name: '점무늬', price: 10, value: 'dots' },
  { code: 'bg_02', category: 'background', name: '줄무늬', price: 10, value: 'stripes' },
  { code: 'bg_03', category: 'background', name: '🌊 물결', price: 15, value: 'waves' },
  { code: 'bg_04', category: 'background', name: '💕 하트', price: 15, value: 'hearts' },
  { code: 'bg_05', category: 'background', name: '⭐ 별', price: 15, value: 'stars' },
  { code: 'bg_06', category: 'background', name: '부드러운', price: 20, value: 'gradient-soft' },
  { code: 'bg_07', category: 'background', name: '선명한', price: 20, value: 'gradient-vivid' },
];

// 칭호 색상 아이템
export const TITLE_COLOR_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'title_00', category: 'titleColor', name: '빨강', price: 0, value: '0' },
  { code: 'title_01', category: 'titleColor', name: '주황', price: 0, value: '1' },
  { code: 'title_02', category: 'titleColor', name: '노랑', price: 0, value: '2' },
  { code: 'title_03', category: 'titleColor', name: '초록', price: 0, value: '3' },
  { code: 'title_04', category: 'titleColor', name: '파랑', price: 0, value: '4' },
  // 유료
  { code: 'title_05', category: 'titleColor', name: '💜 보라', price: 10, value: '5' },
  { code: 'title_06', category: 'titleColor', name: '💗 핑크', price: 10, value: '6' },
  { code: 'title_07', category: 'titleColor', name: '🖤 검정', price: 10, value: '7' },
  { code: 'title_08', category: 'titleColor', name: '🥇 골드', price: 20, value: '8' },
  { code: 'title_09', category: 'titleColor', name: '🌈 무지개', price: 25, value: '9' },
];

// 모든 아이템
export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...EMOJI_ITEMS,
  ...BORDER_ITEMS,
  ...NAME_EFFECT_ITEMS,
  ...BACKGROUND_ITEMS,
  ...TITLE_COLOR_ITEMS,
];

// 코드로 아이템 찾기
export function getItemByCode(code: string): ShopItem | undefined {
  return ALL_SHOP_ITEMS.find(item => item.code === code);
}

// 값으로 아이템 코드 찾기
export function getItemCodeByValue(category: ItemCategory, value: string): string | undefined {
  const item = ALL_SHOP_ITEMS.find(i => i.category === category && i.value === value);
  return item?.code;
}

// 카테고리별 아이템 가져오기
export function getItemsByCategory(category: ItemCategory): ShopItem[] {
  return ALL_SHOP_ITEMS.filter(item => item.category === category);
}

// 구매 가능 여부 확인
export function canPurchase(item: ShopItem, ownedItems: string[], totalCookies: number): {
  canBuy: boolean;
  reason?: string;
} {
  if (ownedItems.includes(item.code)) {
    return { canBuy: false, reason: '이미 보유 중입니다.' };
  }
  if (item.price > totalCookies) {
    return { canBuy: false, reason: `쿠키가 부족합니다. (필요: ${item.price}, 보유: ${totalCookies})` };
  }
  return { canBuy: true };
}
