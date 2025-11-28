// 학생 프로필 커스터마이징 타입

// 테두리 스타일 종류
export type BorderStyle =
  | 'none'
  | 'solid'
  | 'gradient-rainbow'
  | 'gradient-gold'
  | 'gradient-aurora'
  | 'gradient-fire'
  | 'gradient-ocean'
  | 'neon-blue'
  | 'neon-pink'
  | 'neon-green'
  | 'pulse'
  | 'sparkle';

// 테두리 스타일 정보
export const BORDER_STYLES: Record<BorderStyle, { name: string; css: string; animation?: string }> = {
  none: {
    name: '없음',
    css: 'border-2 border-gray-200',
  },
  solid: {
    name: '기본',
    css: 'border-4 border-current',
  },
  'gradient-rainbow': {
    name: '무지개',
    css: 'border-4 border-transparent bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-border',
  },
  'gradient-gold': {
    name: '골드',
    css: 'border-4 border-transparent bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-border',
  },
  'gradient-aurora': {
    name: '오로라',
    css: 'border-4 border-transparent bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-border',
  },
  'gradient-fire': {
    name: '불꽃',
    css: 'border-4 border-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-border',
  },
  'gradient-ocean': {
    name: '바다',
    css: 'border-4 border-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-border',
  },
  'neon-blue': {
    name: '네온 블루',
    css: 'border-4 border-blue-400 shadow-[0_0_10px_#60a5fa,0_0_20px_#60a5fa]',
  },
  'neon-pink': {
    name: '네온 핑크',
    css: 'border-4 border-pink-400 shadow-[0_0_10px_#f472b6,0_0_20px_#f472b6]',
  },
  'neon-green': {
    name: '네온 그린',
    css: 'border-4 border-green-400 shadow-[0_0_10px_#4ade80,0_0_20px_#4ade80]',
  },
  pulse: {
    name: '펄스',
    css: 'border-4 border-purple-500',
    animation: 'animate-pulse',
  },
  sparkle: {
    name: '반짝임',
    css: 'border-4 border-yellow-400',
    animation: 'animate-bounce',
  },
};

// 이름 효과 종류
export type NameEffect =
  | 'none'
  | 'gradient-rainbow'
  | 'gradient-fire'
  | 'gradient-ocean'
  | 'gradient-gold'
  | 'glow-blue'
  | 'glow-pink'
  | 'glow-gold'
  | 'shadow';

// 이름 효과 정보
export const NAME_EFFECTS: Record<NameEffect, { name: string; css: string }> = {
  none: {
    name: '기본',
    css: '',
  },
  'gradient-rainbow': {
    name: '무지개',
    css: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500 bg-clip-text text-transparent',
  },
  'gradient-fire': {
    name: '불꽃',
    css: 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent',
  },
  'gradient-ocean': {
    name: '바다',
    css: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent',
  },
  'gradient-gold': {
    name: '골드',
    css: 'bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent',
  },
  'glow-blue': {
    name: '블루 글로우',
    css: 'text-blue-500 drop-shadow-[0_0_8px_#3b82f6]',
  },
  'glow-pink': {
    name: '핑크 글로우',
    css: 'text-pink-500 drop-shadow-[0_0_8px_#ec4899]',
  },
  'glow-gold': {
    name: '골드 글로우',
    css: 'text-yellow-500 drop-shadow-[0_0_8px_#eab308]',
  },
  shadow: {
    name: '그림자',
    css: 'text-gray-800 drop-shadow-[2px_2px_0px_#9ca3af]',
  },
};

// 칭호 배경 색상
export const TITLE_COLORS = [
  { name: '빨강', bg: 'bg-red-500', text: 'text-white' },
  { name: '주황', bg: 'bg-orange-500', text: 'text-white' },
  { name: '노랑', bg: 'bg-yellow-400', text: 'text-gray-800' },
  { name: '초록', bg: 'bg-green-500', text: 'text-white' },
  { name: '파랑', bg: 'bg-blue-500', text: 'text-white' },
  { name: '보라', bg: 'bg-purple-500', text: 'text-white' },
  { name: '핑크', bg: 'bg-pink-500', text: 'text-white' },
  { name: '검정', bg: 'bg-gray-800', text: 'text-white' },
  { name: '골드', bg: 'bg-gradient-to-r from-yellow-400 to-yellow-600', text: 'text-white' },
  { name: '무지개', bg: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500', text: 'text-white' },
];

// 대표 이모지 옵션
export const PROFILE_EMOJIS = [
  '😀', '😎', '🤩', '😇', '🥳', '😤', '🤔', '😴',
  '🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁',
  '🐉', '🦅', '🦋', '🐺', '🦈', '🐢', '🦄', '🐸',
  '🌟', '⭐', '✨', '💫', '🔥', '❄️', '🌈', '🌙',
  '💎', '👑', '🎯', '🚀', '⚡', '🎮', '🎵', '🎨',
  '🍕', '🍪', '🍩', '🍦', '🎂', '🍭', '🧁', '☕',
];

// 프로필 배경 패턴
export type BackgroundPattern =
  | 'none'
  | 'dots'
  | 'stripes'
  | 'waves'
  | 'hearts'
  | 'stars'
  | 'gradient-soft'
  | 'gradient-vivid';

export const BACKGROUND_PATTERNS: Record<BackgroundPattern, { name: string; css: string }> = {
  none: {
    name: '없음',
    css: 'bg-white',
  },
  dots: {
    name: '점',
    css: 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-[size:16px_16px] bg-white',
  },
  stripes: {
    name: '줄무늬',
    css: 'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_50%,#f3f4f6_50%,#f3f4f6_75%,transparent_75%)] bg-[size:20px_20px] bg-white',
  },
  waves: {
    name: '물결',
    css: 'bg-gradient-to-br from-blue-50 via-white to-cyan-50',
  },
  hearts: {
    name: '하트',
    css: 'bg-gradient-to-br from-pink-50 via-white to-red-50',
  },
  stars: {
    name: '별',
    css: 'bg-gradient-to-br from-yellow-50 via-white to-orange-50',
  },
  'gradient-soft': {
    name: '부드러운',
    css: 'bg-gradient-to-br from-purple-50 via-white to-blue-50',
  },
  'gradient-vivid': {
    name: '선명한',
    css: 'bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100',
  },
};

// 학생 프로필 설정
export interface StudentProfile {
  studentCode: string;
  title: string;                    // 칭호 (최대 5글자)
  titleColorIndex: number;          // 칭호 색상 인덱스
  emoji: string;                    // 대표 이모지
  borderStyle: BorderStyle;         // 테두리 스타일
  borderColor: string;              // 테두리 색상 (solid일 때)
  nameEffect: NameEffect;           // 이름 효과
  backgroundPattern: BackgroundPattern;  // 배경 패턴
  updatedAt: string;
}

// 기본 프로필
export const DEFAULT_PROFILE: Omit<StudentProfile, 'studentCode'> = {
  title: '',
  titleColorIndex: 0,
  emoji: '😀',
  borderStyle: 'none',
  borderColor: '#6366f1',
  nameEffect: 'none',
  backgroundPattern: 'none',
  updatedAt: '',
};

// 소원 (방명록)
export interface Wish {
  id: string;
  classId: string;
  studentCode: string;
  studentName: string;
  content: string;              // 소원 내용 (최대 50자)
  createdAt: string;
  likes: string[];              // 좋아요 누른 학생 코드들
  isGranted: boolean;           // 교사가 선정했는지
  grantedReward?: number;       // 선정 시 보상 쿠키
}

// 출석 기록
export interface AttendanceRecord {
  id: string;
  classId: string;
  studentCode: string;
  date: string;                 // YYYY-MM-DD
  createdAt: string;
}
