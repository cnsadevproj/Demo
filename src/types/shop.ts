// 상점 아이템 타입 정의

// 아이템 카테고리
export type ItemCategory = 'emoji' | 'border' | 'nameEffect' | 'background' | 'titleColor' | 'buttonBorder' | 'buttonFill' | 'animation' | 'titlePermit';

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
  // 유료 - 표정
  { code: 'emoji_01', category: 'emoji', name: '😎 쿨한', price: 5, value: '😎' },
  { code: 'emoji_02', category: 'emoji', name: '🤩 스타', price: 5, value: '🤩' },
  { code: 'emoji_03', category: 'emoji', name: '😇 천사', price: 5, value: '😇' },
  { code: 'emoji_04', category: 'emoji', name: '🥳 파티', price: 10, value: '🥳' },
  { code: 'emoji_16', category: 'emoji', name: '🤓 공부벌레', price: 5, value: '🤓' },
  { code: 'emoji_17', category: 'emoji', name: '😴 졸린', price: 5, value: '😴' },
  { code: 'emoji_18', category: 'emoji', name: '🤪 장난', price: 5, value: '🤪' },
  { code: 'emoji_19', category: 'emoji', name: '🥰 사랑', price: 10, value: '🥰' },
  // 동물
  { code: 'emoji_05', category: 'emoji', name: '🐶 강아지', price: 10, value: '🐶' },
  { code: 'emoji_06', category: 'emoji', name: '🐱 고양이', price: 10, value: '🐱' },
  { code: 'emoji_07', category: 'emoji', name: '🦁 사자', price: 15, value: '🦁' },
  { code: 'emoji_08', category: 'emoji', name: '🐉 드래곤', price: 20, value: '🐉' },
  { code: 'emoji_09', category: 'emoji', name: '🦄 유니콘', price: 25, value: '🦄' },
  { code: 'emoji_20', category: 'emoji', name: '🐰 토끼', price: 10, value: '🐰' },
  { code: 'emoji_21', category: 'emoji', name: '🐻 곰', price: 10, value: '🐻' },
  { code: 'emoji_22', category: 'emoji', name: '🐼 팬더', price: 15, value: '🐼' },
  { code: 'emoji_23', category: 'emoji', name: '🦊 여우', price: 15, value: '🦊' },
  { code: 'emoji_24', category: 'emoji', name: '🐯 호랑이', price: 20, value: '🐯' },
  { code: 'emoji_25', category: 'emoji', name: '🦅 독수리', price: 20, value: '🦅' },
  { code: 'emoji_26', category: 'emoji', name: '🐺 늑대', price: 20, value: '🐺' },
  { code: 'emoji_27', category: 'emoji', name: '🦋 나비', price: 15, value: '🦋' },
  // 특별
  { code: 'emoji_10', category: 'emoji', name: '👑 왕관', price: 30, value: '👑' },
  { code: 'emoji_11', category: 'emoji', name: '🔥 불꽃', price: 15, value: '🔥' },
  { code: 'emoji_12', category: 'emoji', name: '⭐ 별', price: 10, value: '⭐' },
  { code: 'emoji_13', category: 'emoji', name: '💎 다이아', price: 30, value: '💎' },
  { code: 'emoji_14', category: 'emoji', name: '🚀 로켓', price: 20, value: '🚀' },
  { code: 'emoji_15', category: 'emoji', name: '🎮 게임', price: 15, value: '🎮' },
  { code: 'emoji_28', category: 'emoji', name: '🌈 무지개', price: 15, value: '🌈' },
  { code: 'emoji_29', category: 'emoji', name: '🌟 빛나는별', price: 20, value: '🌟' },
  { code: 'emoji_30', category: 'emoji', name: '💫 유성', price: 25, value: '💫' },
  { code: 'emoji_31', category: 'emoji', name: '🏆 트로피', price: 30, value: '🏆' },
  { code: 'emoji_32', category: 'emoji', name: '🎯 다트', price: 10, value: '🎯' },
  { code: 'emoji_33', category: 'emoji', name: '🎨 팔레트', price: 15, value: '🎨' },
  { code: 'emoji_34', category: 'emoji', name: '🎭 가면', price: 20, value: '🎭' },
  { code: 'emoji_35', category: 'emoji', name: '🎪 서커스', price: 25, value: '🎪' },
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

// 버튼 테두리 색상 아이템
export const BUTTON_BORDER_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'btn_border_00', category: 'buttonBorder', name: '기본', price: 0, value: 'gray-300' },
  { code: 'btn_border_01', category: 'buttonBorder', name: '빨강', price: 0, value: 'red-400' },
  { code: 'btn_border_02', category: 'buttonBorder', name: '주황', price: 0, value: 'orange-400' },
  { code: 'btn_border_03', category: 'buttonBorder', name: '노랑', price: 0, value: 'yellow-400' },
  { code: 'btn_border_04', category: 'buttonBorder', name: '초록', price: 0, value: 'green-400' },
  { code: 'btn_border_05', category: 'buttonBorder', name: '파랑', price: 0, value: 'blue-400' },
  // 유료
  { code: 'btn_border_06', category: 'buttonBorder', name: '💜 보라', price: 10, value: 'purple-500' },
  { code: 'btn_border_07', category: 'buttonBorder', name: '💗 핑크', price: 10, value: 'pink-500' },
  { code: 'btn_border_08', category: 'buttonBorder', name: '🥇 골드', price: 20, value: 'yellow-500' },
  { code: 'btn_border_09', category: 'buttonBorder', name: '🌈 무지개', price: 30, value: 'gradient' },
];

// 버튼 채우기 색상 아이템
export const BUTTON_FILL_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'btn_fill_00', category: 'buttonFill', name: '흰색', price: 0, value: 'white' },
  { code: 'btn_fill_01', category: 'buttonFill', name: '연한 빨강', price: 0, value: 'red-50' },
  { code: 'btn_fill_02', category: 'buttonFill', name: '연한 주황', price: 0, value: 'orange-50' },
  { code: 'btn_fill_03', category: 'buttonFill', name: '연한 노랑', price: 0, value: 'yellow-50' },
  { code: 'btn_fill_04', category: 'buttonFill', name: '연한 초록', price: 0, value: 'green-50' },
  { code: 'btn_fill_05', category: 'buttonFill', name: '연한 파랑', price: 0, value: 'blue-50' },
  // 유료
  { code: 'btn_fill_06', category: 'buttonFill', name: '💜 연한 보라', price: 10, value: 'purple-100' },
  { code: 'btn_fill_07', category: 'buttonFill', name: '💗 연한 핑크', price: 10, value: 'pink-100' },
  { code: 'btn_fill_08', category: 'buttonFill', name: '🥇 연한 골드', price: 15, value: 'amber-100' },
  { code: 'btn_fill_09', category: 'buttonFill', name: '🌈 그라디언트', price: 25, value: 'gradient' },
];

// 애니메이션 효과 아이템
export const ANIMATION_ITEMS: ShopItem[] = [
  // 기본 (무료)
  { code: 'anim_00', category: 'animation', name: '없음', price: 0, value: 'none', description: '애니메이션 없음' },
  // 유료
  { code: 'anim_01', category: 'animation', name: '💓 두근두근', price: 15, value: 'pulse', description: '심장처럼 두근두근' },
  { code: 'anim_02', category: 'animation', name: '🔄 회전', price: 15, value: 'spin', description: '빙글빙글 돌아요' },
  { code: 'anim_03', category: 'animation', name: '⬆️ 통통', price: 10, value: 'bounce', description: '통통 튀어요' },
  { code: 'anim_04', category: 'animation', name: '👋 흔들흔들', price: 10, value: 'shake', description: '좌우로 흔들흔들' },
  { code: 'anim_05', category: 'animation', name: '✨ 반짝반짝', price: 20, value: 'sparkle', description: '반짝반짝 빛나요' },
  { code: 'anim_06', category: 'animation', name: '🌊 물결', price: 15, value: 'wave', description: '부드럽게 출렁출렁' },
  { code: 'anim_07', category: 'animation', name: '💫 떠오르기', price: 20, value: 'float', description: '둥둥 떠다녀요' },
  { code: 'anim_08', category: 'animation', name: '🎉 폭죽', price: 30, value: 'confetti', description: '축하 폭죽!' },
  { code: 'anim_09', category: 'animation', name: '🔥 불타오르기', price: 25, value: 'flame', description: '활활 타올라요' },
  { code: 'anim_10', category: 'animation', name: '❄️ 눈송이', price: 25, value: 'snow', description: '눈이 내려요' },
];

// 칭호권 아이템 (칭호 글자 수 확장)
export const TITLE_PERMIT_ITEMS: ShopItem[] = [
  // 기본 (무료 - 3글자)
  { code: 'permit_00', category: 'titlePermit', name: '기본 (3글자)', price: 0, value: '3', description: '칭호 최대 3글자' },
  // 유료
  { code: 'permit_01', category: 'titlePermit', name: '4글자 칭호', price: 10, value: '4', description: '칭호를 4글자까지!' },
  { code: 'permit_02', category: 'titlePermit', name: '5글자 칭호', price: 20, value: '5', description: '칭호를 5글자까지!' },
  { code: 'permit_03', category: 'titlePermit', name: '6글자 칭호', price: 30, value: '6', description: '칭호를 6글자까지!' },
  { code: 'permit_04', category: 'titlePermit', name: '7글자 칭호', price: 40, value: '7', description: '칭호를 7글자까지!' },
  { code: 'permit_05', category: 'titlePermit', name: '🌟 무제한', price: 50, value: '99', description: '칭호 글자 무제한!' },
];

// 모든 아이템
export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...EMOJI_ITEMS,
  ...BORDER_ITEMS,
  ...NAME_EFFECT_ITEMS,
  ...BACKGROUND_ITEMS,
  ...TITLE_COLOR_ITEMS,
  ...BUTTON_BORDER_ITEMS,
  ...BUTTON_FILL_ITEMS,
  ...ANIMATION_ITEMS,
  ...TITLE_PERMIT_ITEMS,
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
