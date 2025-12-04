// 상점 아이템 타입 정의

// 아이템 카테고리
export type ItemCategory = 'emoji' | 'nameEffect' | 'titleColor' | 'animation' | 'titlePermit' | 'buttonBorder' | 'buttonFill' | 'profilePhoto';

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

// 이모지 아이템 (모두 유료)
export const EMOJI_ITEMS: ShopItem[] = [
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
  { code: 'emoji_36', category: 'emoji', name: '🐹 햄스터', price: 10, value: '🐹' },
  { code: 'emoji_37', category: 'emoji', name: '🐷 돼지', price: 10, value: '🐷' },
  { code: 'emoji_38', category: 'emoji', name: '🐸 개구리', price: 10, value: '🐸' },
  { code: 'emoji_39', category: 'emoji', name: '🐨 코알라', price: 15, value: '🐨' },
  { code: 'emoji_40', category: 'emoji', name: '🐵 원숭이', price: 10, value: '🐵' },
  { code: 'emoji_41', category: 'emoji', name: '🐮 소', price: 10, value: '🐮' },
  { code: 'emoji_42', category: 'emoji', name: '🐔 닭', price: 5, value: '🐔' },
  { code: 'emoji_43', category: 'emoji', name: '🦆 오리', price: 10, value: '🦆' },
  { code: 'emoji_44', category: 'emoji', name: '🦉 부엉이', price: 15, value: '🦉' },
  { code: 'emoji_45', category: 'emoji', name: '🦈 상어', price: 20, value: '🦈' },
  { code: 'emoji_46', category: 'emoji', name: '🐙 문어', price: 15, value: '🐙' },
  { code: 'emoji_47', category: 'emoji', name: '🦖 공룡', price: 20, value: '🦖' },
  { code: 'emoji_48', category: 'emoji', name: '🐲 용머리', price: 25, value: '🐲' },
  { code: 'emoji_49', category: 'emoji', name: '🐾 발바닥', price: 10, value: '🐾' },
  { code: 'emoji_50', category: 'emoji', name: '🐧 펭귄', price: 15, value: '🐧' },
  { code: 'emoji_51', category: 'emoji', name: '🐢 거북이', price: 10, value: '🐢' },
  { code: 'emoji_52', category: 'emoji', name: '🐍 뱀', price: 15, value: '🐍' },
  { code: 'emoji_53', category: 'emoji', name: '🦀 게', price: 10, value: '🦀' },
  { code: 'emoji_54', category: 'emoji', name: '🐝 벌', price: 10, value: '🐝' },
  { code: 'emoji_55', category: 'emoji', name: '🐞 무당벌레', price: 10, value: '🐞' },
  { code: 'emoji_56', category: 'emoji', name: '🦩 플라밍고', price: 20, value: '🦩' },
  { code: 'emoji_57', category: 'emoji', name: '🦚 공작새', price: 25, value: '🦚' },
  { code: 'emoji_58', category: 'emoji', name: '🦜 앵무새', price: 15, value: '🦜' },
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
  { code: 'emoji_59', category: 'emoji', name: '⚽ 축구공', price: 10, value: '⚽' },
  { code: 'emoji_60', category: 'emoji', name: '🏀 농구공', price: 10, value: '🏀' },
  { code: 'emoji_61', category: 'emoji', name: '🎸 기타', price: 15, value: '🎸' },
  { code: 'emoji_62', category: 'emoji', name: '🎹 피아노', price: 15, value: '🎹' },
  { code: 'emoji_63', category: 'emoji', name: '🎤 마이크', price: 15, value: '🎤' },
  { code: 'emoji_64', category: 'emoji', name: '🍕 피자', price: 10, value: '🍕' },
  { code: 'emoji_65', category: 'emoji', name: '🍔 햄버거', price: 10, value: '🍔' },
  { code: 'emoji_66', category: 'emoji', name: '🍦 아이스크림', price: 10, value: '🍦' },
  { code: 'emoji_67', category: 'emoji', name: '🍩 도넛', price: 10, value: '🍩' },
  { code: 'emoji_68', category: 'emoji', name: '🌸 벚꽃', price: 15, value: '🌸' },
  { code: 'emoji_69', category: 'emoji', name: '🌻 해바라기', price: 10, value: '🌻' },
  { code: 'emoji_70', category: 'emoji', name: '🍀 네잎클로버', price: 20, value: '🍀' },
  { code: 'emoji_71', category: 'emoji', name: '☀️ 태양', price: 15, value: '☀️' },
  { code: 'emoji_72', category: 'emoji', name: '🌙 달', price: 15, value: '🌙' },
  { code: 'emoji_73', category: 'emoji', name: '⛄ 눈사람', price: 15, value: '⛄' },
  { code: 'emoji_74', category: 'emoji', name: '🎃 호박', price: 15, value: '🎃' },
  { code: 'emoji_75', category: 'emoji', name: '🎄 크리스마스트리', price: 20, value: '🎄' },
];

// 이름 효과 아이템 (모두 유료)
export const NAME_EFFECT_ITEMS: ShopItem[] = [
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

// 칭호 색상 아이템 (모두 유료)
export const TITLE_COLOR_ITEMS: ShopItem[] = [
  // 유료
  { code: 'title_00', category: 'titleColor', name: '빨강', price: 5, value: '0' },
  { code: 'title_01', category: 'titleColor', name: '주황', price: 5, value: '1' },
  { code: 'title_02', category: 'titleColor', name: '노랑', price: 5, value: '2' },
  { code: 'title_03', category: 'titleColor', name: '초록', price: 5, value: '3' },
  { code: 'title_04', category: 'titleColor', name: '파랑', price: 5, value: '4' },
  { code: 'title_05', category: 'titleColor', name: '💜 보라', price: 10, value: '5' },
  { code: 'title_06', category: 'titleColor', name: '💗 핑크', price: 10, value: '6' },
  { code: 'title_07', category: 'titleColor', name: '🖤 검정', price: 10, value: '7' },
  { code: 'title_08', category: 'titleColor', name: '🥇 골드', price: 20, value: '8' },
  { code: 'title_09', category: 'titleColor', name: '🌈 무지개', price: 25, value: '9' },
];

// 애니메이션 효과 아이템 (모두 유료)
export const ANIMATION_ITEMS: ShopItem[] = [
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

// 칭호권 아이템 (5글자 칭호권 하나만)
export const TITLE_PERMIT_ITEMS: ShopItem[] = [
  // 유료 - 5글자 칭호권만
  { code: 'title_permit_5', category: 'titlePermit', name: '🏷️ 5글자 칭호권', price: 20, value: '5', description: '칭호를 5글자까지 설정할 수 있어요!' },
];

// 프로필사진권 아이템
export const PROFILE_PHOTO_ITEMS: ShopItem[] = [
  { code: 'profile_photo_permit', category: 'profilePhoto', name: '📷 프로필사진권', price: 30, value: 'enabled', description: '나만의 프로필 사진을 업로드할 수 있어요! (3MB 이하)' },
];

// 버튼 테두리 아이템
export const BUTTON_BORDER_ITEMS: ShopItem[] = [
  { code: 'btn_border_01', category: 'buttonBorder', name: '🔵 파란 테두리', price: 10, value: 'border-blue-500' },
  { code: 'btn_border_02', category: 'buttonBorder', name: '🔴 빨간 테두리', price: 10, value: 'border-red-500' },
  { code: 'btn_border_03', category: 'buttonBorder', name: '🟢 초록 테두리', price: 10, value: 'border-green-500' },
  { code: 'btn_border_04', category: 'buttonBorder', name: '🟡 노란 테두리', price: 10, value: 'border-yellow-500' },
  { code: 'btn_border_05', category: 'buttonBorder', name: '🟣 보라 테두리', price: 15, value: 'border-purple-500' },
  { code: 'btn_border_06', category: 'buttonBorder', name: '💗 핑크 테두리', price: 15, value: 'border-pink-500' },
  { code: 'btn_border_07', category: 'buttonBorder', name: '🥇 골드 테두리', price: 20, value: 'border-amber-400' },
  { code: 'btn_border_08', category: 'buttonBorder', name: '⬛ 검정 테두리', price: 10, value: 'border-gray-800' },
];

// 버튼 채우기 아이템
export const BUTTON_FILL_ITEMS: ShopItem[] = [
  // 단색 배경
  { code: 'btn_fill_01', category: 'buttonFill', name: '🔵 파란 배경', price: 15, value: 'bg-blue-500' },
  { code: 'btn_fill_02', category: 'buttonFill', name: '🔴 빨간 배경', price: 15, value: 'bg-red-500' },
  { code: 'btn_fill_03', category: 'buttonFill', name: '🟢 초록 배경', price: 15, value: 'bg-green-500' },
  { code: 'btn_fill_04', category: 'buttonFill', name: '🟡 노란 배경', price: 15, value: 'bg-yellow-500' },
  { code: 'btn_fill_05', category: 'buttonFill', name: '🟣 보라 배경', price: 20, value: 'bg-purple-500' },
  { code: 'btn_fill_06', category: 'buttonFill', name: '💗 핑크 배경', price: 20, value: 'bg-pink-500' },
  { code: 'btn_fill_07', category: 'buttonFill', name: '🥇 골드 배경', price: 25, value: 'bg-amber-400' },
  { code: 'btn_fill_08', category: 'buttonFill', name: '⬛ 검정 배경', price: 15, value: 'bg-gray-800' },
  // 그라데이션 배경
  { code: 'btn_fill_09', category: 'buttonFill', name: '🌈 무지개', price: 30, value: 'gradient-rainbow' },
  { code: 'btn_fill_10', category: 'buttonFill', name: '🔥 불꽃', price: 25, value: 'gradient-fire' },
  { code: 'btn_fill_11', category: 'buttonFill', name: '🌊 바다', price: 25, value: 'gradient-ocean' },
  { code: 'btn_fill_12', category: 'buttonFill', name: '🌅 일몰', price: 25, value: 'gradient-sunset' },
  { code: 'btn_fill_13', category: 'buttonFill', name: '🌌 오로라', price: 30, value: 'gradient-aurora' },
  { code: 'btn_fill_14', category: 'buttonFill', name: '💜 핑크보라', price: 20, value: 'gradient-pink-purple' },
  { code: 'btn_fill_15', category: 'buttonFill', name: '💎 민트', price: 20, value: 'gradient-mint' },
  { code: 'btn_fill_16', category: 'buttonFill', name: '🍊 오렌지', price: 20, value: 'gradient-orange' },
];

// 모든 아이템
export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...EMOJI_ITEMS,
  ...NAME_EFFECT_ITEMS,
  ...TITLE_COLOR_ITEMS,
  ...ANIMATION_ITEMS,
  ...TITLE_PERMIT_ITEMS,
  ...PROFILE_PHOTO_ITEMS,
  ...BUTTON_BORDER_ITEMS,
  ...BUTTON_FILL_ITEMS,
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
