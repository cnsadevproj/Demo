// src/games/MinorityGameTeacher.tsx
// 소수결게임 - 교사용 게임 관리 페이지

import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, collection, getDocs, deleteDoc, setDoc, getDoc } from 'firebase/firestore';

// 밸런스 게임 질문 목록 (학생에게 적합한 내용)
const BALANCE_QUESTIONS = [
  // 음식 관련
  { text: '여름 vs 겨울, 더 좋은 계절은?', optionA: '여름', optionB: '겨울' },
  { text: '치킨 vs 피자, 오늘 저녁은?', optionA: '치킨', optionB: '피자' },
  { text: '떡볶이 vs 순대, 더 좋아하는 건?', optionA: '떡볶이', optionB: '순대' },
  { text: '짜장면 vs 짬뽕, 오늘의 선택은?', optionA: '짜장면', optionB: '짬뽕' },
  { text: '민트초코 vs 반민초, 당신의 취향은?', optionA: '민트초코 좋아', optionB: '민트초코 싫어' },
  { text: '탕수육 부먹 vs 찍먹?', optionA: '부먹', optionB: '찍먹' },
  { text: '아이스크림 vs 케이크?', optionA: '아이스크림', optionB: '케이크' },
  { text: '라면 vs 밥?', optionA: '라면', optionB: '밥' },
  { text: '단짠 vs 짠단, 더 맛있는 조합은?', optionA: '단짠', optionB: '짠단' },
  { text: '햄버거 vs 김밥?', optionA: '햄버거', optionB: '김밥' },
  { text: '콜라 vs 사이다?', optionA: '콜라', optionB: '사이다' },
  { text: '밀크티 vs 아메리카노?', optionA: '밀크티', optionB: '아메리카노' },
  { text: '붕어빵 vs 호떡?', optionA: '붕어빵', optionB: '호떡' },
  { text: '비빔밥 vs 볶음밥?', optionA: '비빔밥', optionB: '볶음밥' },
  { text: '마라탕 vs 마라샹궈?', optionA: '마라탕', optionB: '마라샹궈' },
  { text: '초밥 vs 회?', optionA: '초밥', optionB: '회' },
  { text: '감자튀김 vs 양파링?', optionA: '감자튀김', optionB: '양파링' },
  { text: '편의점 음식 vs 집밥?', optionA: '편의점 음식', optionB: '집밥' },
  { text: '국밥 vs 찌개?', optionA: '국밥', optionB: '찌개' },
  { text: '매운맛 vs 순한맛?', optionA: '매운맛', optionB: '순한맛' },
  { text: '파인애플 피자 vs 불고기 피자?', optionA: '파인애플', optionB: '불고기' },
  { text: '떡볶이에 치즈 vs 떡볶이에 계란?', optionA: '치즈', optionB: '계란' },
  { text: '카레 vs 짜장?', optionA: '카레', optionB: '짜장' },
  { text: '돈까스 vs 생선까스?', optionA: '돈까스', optionB: '생선까스' },

  // 생활/습관 관련
  { text: '아침형 인간 vs 저녁형 인간?', optionA: '아침형', optionB: '저녁형' },
  { text: '혼밥 vs 같이 먹기, 더 편한 건?', optionA: '혼밥', optionB: '같이 먹기' },
  { text: '비 오는 날 vs 맑은 날?', optionA: '비 오는 날', optionB: '맑은 날' },
  { text: '스마트폰 없이 1주일 vs 샤워 없이 1주일?', optionA: '폰 없이', optionB: '샤워 없이' },
  { text: '혼자 여행 vs 친구와 여행?', optionA: '혼자', optionB: '친구와' },
  { text: '일찍 자고 일찍 일어나기 vs 늦게 자고 늦게 일어나기?', optionA: '일찍 자기', optionB: '늦게 자기' },
  { text: '지하철 vs 버스?', optionA: '지하철', optionB: '버스' },
  { text: '카페 공부 vs 집 공부?', optionA: '카페', optionB: '집' },
  { text: '새 책 vs 중고책?', optionA: '새 책', optionB: '중고책' },
  { text: '정리 정돈 vs 창의적 어지러움?', optionA: '정리 정돈', optionB: '어지러움' },
  { text: '계획적인 여행 vs 즉흥적인 여행?', optionA: '계획적', optionB: '즉흥적' },
  { text: '집에서 쉬기 vs 밖에서 놀기?', optionA: '집에서', optionB: '밖에서' },
  { text: '큰 파티 vs 소규모 모임?', optionA: '큰 파티', optionB: '소규모 모임' },
  { text: '문자 vs 전화?', optionA: '문자', optionB: '전화' },
  { text: '현금 vs 카드?', optionA: '현금', optionB: '카드' },
  { text: '일기 쓰기 vs 사진 찍기?', optionA: '일기', optionB: '사진' },
  { text: '아침 운동 vs 저녁 운동?', optionA: '아침 운동', optionB: '저녁 운동' },
  { text: '빨리빨리 vs 천천히?', optionA: '빨리빨리', optionB: '천천히' },

  // 취미/관심사 관련
  { text: '고양이 vs 강아지, 반려동물로 키운다면?', optionA: '고양이', optionB: '강아지' },
  { text: '책 vs 영화, 이야기를 접하는 방식은?', optionA: '책', optionB: '영화' },
  { text: '유튜브 vs 틱톡?', optionA: '유튜브', optionB: '틱톡' },
  { text: '산 vs 바다, 여행 갈 곳은?', optionA: '산', optionB: '바다' },
  { text: '게임 vs 운동?', optionA: '게임', optionB: '운동' },
  { text: '음악 듣기 vs 노래 부르기?', optionA: '듣기', optionB: '부르기' },
  { text: '드라마 vs 예능?', optionA: '드라마', optionB: '예능' },
  { text: '애니메이션 vs 실사 영화?', optionA: '애니메이션', optionB: '실사 영화' },
  { text: '그림 그리기 vs 글쓰기?', optionA: '그림', optionB: '글' },
  { text: '콘서트 vs 뮤지컬?', optionA: '콘서트', optionB: '뮤지컬' },
  { text: '놀이공원 vs 워터파크?', optionA: '놀이공원', optionB: '워터파크' },
  { text: '캠핑 vs 호텔?', optionA: '캠핑', optionB: '호텔' },
  { text: '국내 여행 vs 해외 여행?', optionA: '국내', optionB: '해외' },
  { text: '아이돌 vs 밴드?', optionA: '아이돌', optionB: '밴드' },
  { text: '축구 vs 농구?', optionA: '축구', optionB: '농구' },
  { text: '야구 vs 배구?', optionA: '야구', optionB: '배구' },
  { text: '보드게임 vs 카드게임?', optionA: '보드게임', optionB: '카드게임' },
  { text: '방탈출 vs 스크린골프?', optionA: '방탈출', optionB: '스크린골프' },
  { text: '실내 활동 vs 야외 활동?', optionA: '실내', optionB: '야외' },

  // 학교/학습 관련
  { text: '수학 vs 국어?', optionA: '수학', optionB: '국어' },
  { text: '과학 vs 사회?', optionA: '과학', optionB: '사회' },
  { text: '영어 vs 제2외국어?', optionA: '영어', optionB: '제2외국어' },
  { text: '체육 vs 음악?', optionA: '체육', optionB: '음악' },
  { text: '미술 vs 기술?', optionA: '미술', optionB: '기술' },
  { text: '혼자 공부 vs 스터디 그룹?', optionA: '혼자', optionB: '스터디 그룹' },
  { text: '온라인 수업 vs 대면 수업?', optionA: '온라인', optionB: '대면' },
  { text: '필기 vs 타이핑?', optionA: '필기', optionB: '타이핑' },
  { text: '시험 전날 벼락치기 vs 매일 꾸준히?', optionA: '벼락치기', optionB: '꾸준히' },
  { text: '발표 vs 보고서?', optionA: '발표', optionB: '보고서' },
  { text: '조별과제 vs 개인과제?', optionA: '조별', optionB: '개인' },
  { text: '오픈북 시험 vs 암기 시험?', optionA: '오픈북', optionB: '암기' },
  { text: '교과서 vs 문제집?', optionA: '교과서', optionB: '문제집' },
  { text: '짧은 쉬는 시간 여러 번 vs 긴 점심 시간?', optionA: '짧은 여러 번', optionB: '긴 점심' },

  // 가상/상상 질문
  { text: '100만원 받기 vs 1% 확률로 1억 받기?', optionA: '확실한 100만원', optionB: '1% 도전' },
  { text: '시간을 멈추는 능력 vs 하늘을 나는 능력?', optionA: '시간 정지', optionB: '비행' },
  { text: '과거로 가기 vs 미래로 가기?', optionA: '과거', optionB: '미래' },
  { text: '투명인간 vs 독심술?', optionA: '투명인간', optionB: '독심술' },
  { text: '매일 같은 음식 vs 매일 다른 랜덤 음식?', optionA: '같은 음식', optionB: '랜덤 음식' },
  { text: '친구 10명 vs 진짜 친구 1명?', optionA: '10명', optionB: '진짜 1명' },
  { text: '엄마 vs 아빠, 용돈 더 잘 주시는 분?', optionA: '엄마', optionB: '아빠' },
  { text: '텔레포트 능력 vs 시간 되돌리기 능력?', optionA: '텔레포트', optionB: '시간 되돌리기' },
  { text: '10년 후로 가기 vs 10년 전으로 가기?', optionA: '10년 후', optionB: '10년 전' },
  { text: '부자인데 바빠 vs 보통인데 여유?', optionA: '부자+바빠', optionB: '보통+여유' },
  { text: '엄청난 미모 vs 엄청난 두뇌?', optionA: '미모', optionB: '두뇌' },
  { text: '운동 만렙 vs 공부 만렙?', optionA: '운동 만렙', optionB: '공부 만렙' },
  { text: '다음 생에 한국 vs 다음 생에 외국?', optionA: '한국', optionB: '외국' },
  { text: '1년 동안 핸드폰 없음 vs 1년 동안 친구 못 만남?', optionA: '핸드폰 없음', optionB: '친구 못 만남' },
  { text: '지금 즉시 대학생 vs 지금 즉시 직장인?', optionA: '대학생', optionB: '직장인' },
  { text: '모든 언어 가능 vs 모든 악기 가능?', optionA: '언어', optionB: '악기' },
  { text: '어디든 갈 수 있는 문 vs 무엇이든 나오는 주머니?', optionA: '어디든 문', optionB: '무한 주머니' },
  { text: '기억력 천재 vs 창의력 천재?', optionA: '기억력', optionB: '창의력' },
  { text: '동물과 대화 vs 식물과 대화?', optionA: '동물', optionB: '식물' },
  { text: '영원한 여름 vs 영원한 겨울?', optionA: '영원한 여름', optionB: '영원한 겨울' },

  // 성격/가치관 관련
  { text: '리더 역할 vs 팔로워 역할?', optionA: '리더', optionB: '팔로워' },
  { text: '새로운 도전 vs 익숙한 안정?', optionA: '새로운 도전', optionB: '익숙한 안정' },
  { text: '완벽주의 vs 적당주의?', optionA: '완벽주의', optionB: '적당주의' },
  { text: '감성적 vs 이성적?', optionA: '감성적', optionB: '이성적' },
  { text: '외향적 vs 내향적?', optionA: '외향적', optionB: '내향적' },
  { text: '계획형 vs 즉흥형?', optionA: '계획형', optionB: '즉흥형' },
  { text: '낙천적 vs 현실적?', optionA: '낙천적', optionB: '현실적' },
  { text: '첫인상 중시 vs 오래 알아야 알 수 있다?', optionA: '첫인상', optionB: '오래 알아야' },
  { text: '많이 말하기 vs 잘 듣기?', optionA: '말하기', optionB: '듣기' },
  { text: '상상력 vs 논리력?', optionA: '상상력', optionB: '논리력' },

  // 계절/날씨/시간 관련
  { text: '봄 vs 가을?', optionA: '봄', optionB: '가을' },
  { text: '새벽 vs 한낮?', optionA: '새벽', optionB: '한낮' },
  { text: '평일 오후 vs 주말 아침?', optionA: '평일 오후', optionB: '주말 아침' },
  { text: '눈 오는 날 vs 비 오는 날?', optionA: '눈', optionB: '비' },
  { text: '해돋이 vs 해넘이?', optionA: '해돋이', optionB: '해넘이' },
  { text: '만개한 벚꽃 vs 떨어지는 단풍?', optionA: '벚꽃', optionB: '단풍' },

  // 물건/브랜드 관련
  { text: '아이폰 vs 안드로이드?', optionA: '아이폰', optionB: '안드로이드' },
  { text: '노트북 vs 태블릿?', optionA: '노트북', optionB: '태블릿' },
  { text: '무선 이어폰 vs 유선 이어폰?', optionA: '무선', optionB: '유선' },
  { text: '편의점 vs 슈퍼마켓?', optionA: '편의점', optionB: '슈퍼마켓' },
  { text: '온라인 쇼핑 vs 오프라인 쇼핑?', optionA: '온라인', optionB: '오프라인' },
  { text: '새 제품 vs 할인 제품?', optionA: '새 제품', optionB: '할인 제품' },
  { text: '브랜드 중시 vs 실용성 중시?', optionA: '브랜드', optionB: '실용성' },

  // 색상/외형 관련
  { text: '밝은 색 vs 어두운 색?', optionA: '밝은 색', optionB: '어두운 색' },
  { text: '무채색 vs 컬러풀?', optionA: '무채색', optionB: '컬러풀' },
  { text: '심플한 디자인 vs 화려한 디자인?', optionA: '심플', optionB: '화려' },
  { text: '캐주얼 vs 포멀?', optionA: '캐주얼', optionB: '포멀' },
  { text: '운동화 vs 구두?', optionA: '운동화', optionB: '구두' },

  // 추가 재미있는 질문들
  { text: '좀비 아포칼립스 vs 로봇 반란?', optionA: '좀비', optionB: '로봇' },
  { text: '무인도에 책 1권 vs 게임기 1개?', optionA: '책', optionB: '게임기' },
  { text: '평생 국수만 vs 평생 빵만?', optionA: '국수', optionB: '빵' },
  { text: '초능력이지만 비밀 vs 유명인이지만 평범?', optionA: '초능력 비밀', optionB: '유명인 평범' },
  { text: '1분에 1원 vs 1시간에 100원?', optionA: '1분에 1원', optionB: '1시간에 100원' },
  { text: '영화 주인공 vs 드라마 주인공?', optionA: '영화', optionB: '드라마' },
  { text: '롤러코스터 vs 자이로드롭?', optionA: '롤러코스터', optionB: '자이로드롭' },
  { text: '귀신 영화 vs 범죄 스릴러?', optionA: '귀신', optionB: '스릴러' },
  { text: 'SF vs 판타지?', optionA: 'SF', optionB: '판타지' },
  { text: '마지막 만찬 vs 첫 데이트?', optionA: '마지막 만찬', optionB: '첫 데이트' },
  { text: '갑자기 부자 vs 천천히 부자?', optionA: '갑자기', optionB: '천천히' },
  { text: '1등만 기억하는 세상 vs 꼴등만 기억하는 세상?', optionA: '1등', optionB: '꼴등' },
  { text: '모든 비밀을 아는 것 vs 아무도 모르게 하는 것?', optionA: '비밀 알기', optionB: '비밀 지키기' },
  { text: '24시간 게임 vs 24시간 드라마?', optionA: '게임', optionB: '드라마' },
  { text: '맛집 탐방 vs 카페 투어?', optionA: '맛집', optionB: '카페' },
  { text: '버킷리스트 완성 vs 새로운 꿈 시작?', optionA: '완성', optionB: '새 시작' },
];

interface GameData {
  teacherId: string;
  classId: string;
  className?: string;
  status: 'waiting' | 'question' | 'result' | 'finished';
  currentRound: number;
  currentQuestion: {
    text: string;
    optionA: string;
    optionB: string;
  } | null;
  usedQuestions: number[];
  createdAt: any;
  gameMode?: 'elimination' | 'score'; // 탈락전 또는 점수전
  maxRounds?: number; // 점수전일 경우 최대 라운드 수
}

interface PlayerData {
  code: string;
  name: string;
  joinedAt: any;
  isAlive: boolean;
  currentChoice: 'A' | 'B' | null;
  survivedRounds: number;
  score?: number; // 점수 모드에서 사용
}

interface StudentData {
  name: string;
  number: number;
  code: string;
  jelly?: number;
  cookie?: number;
}

export function MinorityGameTeacher() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);

  // 학생 모달 관련 상태
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [candyAmount, setCandyAmount] = useState('');
  const [isAddingCandy, setIsAddingCandy] = useState(false);

  // 학생 모달 열기
  const openStudentModal = async (player: PlayerData) => {
    if (!gameData) return;
    setSelectedPlayer(player);

    try {
      const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', player.code);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        setStudentData({ code: player.code, ...studentSnap.data() } as StudentData);
      }
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  // 학생 모달 닫기
  const closeStudentModal = () => {
    setSelectedPlayer(null);
    setStudentData(null);
    setCandyAmount('');
  };

  // 캔디 부여/차감
  const handleAddCandy = async (directAmount?: number) => {
    if (!gameData || !selectedPlayer || !studentData) return;

    const amount = directAmount !== undefined ? directAmount : parseInt(candyAmount);
    if (isNaN(amount) || amount === 0) return;

    setIsAddingCandy(true);
    try {
      const studentRef = doc(db, 'teachers', gameData.teacherId, 'students', selectedPlayer.code);
      const currentCandy = studentData.jelly ?? studentData.cookie ?? 0;
      const newCandy = Math.max(0, currentCandy + amount);

      await updateDoc(studentRef, {
        jelly: newCandy
      });

      setStudentData(prev => prev ? { ...prev, jelly: newCandy } : null);
      setCandyAmount('');
    } catch (error) {
      console.error('Failed to add candy:', error);
      alert('캔디 부여에 실패했습니다.');
    }
    setIsAddingCandy(false);
  };

  // 게임 데이터 구독
  useEffect(() => {
    if (!gameId) {
      console.error('[MinorityGameTeacher] No gameId in URL');
      return;
    }

    console.log('[MinorityGameTeacher] Subscribing to game:', gameId);
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          console.log('[MinorityGameTeacher] Game data updated');
          setGameData(snapshot.data() as GameData);
        } else {
          alert('게임이 삭제되었습니다.');
          window.close();
        }
      },
      (error) => {
        console.error('[MinorityGameTeacher] Game subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 플레이어 목록 구독
  useEffect(() => {
    if (!gameId) return;

    console.log('[MinorityGameTeacher] Subscribing to players for game:', gameId);
    const playersRef = collection(db, 'games', gameId, 'players');
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const playerList: PlayerData[] = [];
        snapshot.forEach((doc) => {
          playerList.push({ code: doc.id, ...doc.data() } as PlayerData);
        });
        playerList.sort((a, b) => {
          // 점수 모드: 점수 높은 순
          if (gameData?.gameMode === 'score') {
            return (b.score || 0) - (a.score || 0);
          }
          // 탈락전 모드: 생존자 우선, 그 다음 생존 라운드 높은 순
          if (a.isAlive && !b.isAlive) return -1;
          if (!a.isAlive && b.isAlive) return 1;
          return b.survivedRounds - a.survivedRounds;
        });
        console.log('[MinorityGameTeacher] Players updated:', playerList.length);
        setPlayers(playerList);
      },
      (error) => {
        console.error('[MinorityGameTeacher] Players subscription error:', error);
      }
    );

    return () => unsubscribe();
  }, [gameId]);

  // 카운트다운 처리
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      calculateResult();
      setCountdown(null);
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 다음 질문 가져오기
  const getNextQuestion = () => {
    if (!gameData) return null;
    const usedQuestions = gameData.usedQuestions || [];
    const available = BALANCE_QUESTIONS.filter((_, i) => !usedQuestions.includes(i));
    if (available.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * available.length);
    return {
      question: available[randomIndex],
      index: BALANCE_QUESTIONS.indexOf(available[randomIndex])
    };
  };

  // 새 라운드 시작
  const startRound = async () => {
    if (!gameId || !gameData) return;

    const next = getNextQuestion();
    if (!next) {
      alert('모든 질문을 사용했습니다!');
      return;
    }

    try {
      // 모든 플레이어 선택 초기화
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        if (playerDoc.data().isAlive) {
          await updateDoc(playerDoc.ref, { currentChoice: null });
        }
      }

      // 게임 상태 업데이트
      await updateDoc(doc(db, 'games', gameId), {
        status: 'question',
        currentRound: (gameData.currentRound || 0) + 1,
        currentQuestion: {
          text: next.question.text,
          optionA: next.question.optionA,
          optionB: next.question.optionB
        },
        usedQuestions: [...(gameData.usedQuestions || []), next.index]
      });
    } catch (error) {
      console.error('Failed to start round:', error);
      alert('라운드 시작에 실패했습니다.');
    }
  };

  // 투표 마감 (카운트다운 시작)
  const closeVoting = () => {
    setCountdown(3);
  };

  // 결과 계산
  const calculateResult = async () => {
    if (!gameId || !gameData || !gameData.currentQuestion) return;

    const isScoreMode = gameData.gameMode === 'score';

    try {
      // 점수 모드: 모든 플레이어, 탈락전: 생존자만
      const activePlayers = isScoreMode ? players : players.filter(p => p.isAlive);
      const countA = activePlayers.filter(p => p.currentChoice === 'A').length;
      const countB = activePlayers.filter(p => p.currentChoice === 'B').length;

      // 소수파 결정 (동점이면 랜덤)
      let winningChoice: 'A' | 'B';
      if (countA === countB) {
        winningChoice = Math.random() < 0.5 ? 'A' : 'B';
      } else {
        winningChoice = countA < countB ? 'A' : 'B';
      }

      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);

      if (isScoreMode) {
        // 점수 모드: 소수파에게 1점 부여
        for (const playerDoc of playersSnap.docs) {
          const data = playerDoc.data();
          const currentScore = data.score || 0;
          const earnedPoint = data.currentChoice === winningChoice ? 1 : 0;
          await updateDoc(playerDoc.ref, {
            score: currentScore + earnedPoint,
            survivedRounds: gameData.currentRound
          });
        }

        // 라운드 결과 저장
        await setDoc(doc(db, 'games', gameId, 'rounds', `round_${gameData.currentRound}`), {
          question: gameData.currentQuestion.text,
          optionA: gameData.currentQuestion.optionA,
          optionB: gameData.currentQuestion.optionB,
          countA,
          countB,
          winningChoice,
          eliminated: [],
          gameMode: 'score'
        });

        // 10라운드 완료 시 게임 종료
        if (gameData.currentRound >= (gameData.maxRounds || 10)) {
          await updateDoc(doc(db, 'games', gameId), {
            status: 'finished'
          });
        } else {
          await updateDoc(doc(db, 'games', gameId), {
            status: 'result'
          });
        }
      } else {
        // 탈락전 모드: 다수파 탈락
        const eliminated: string[] = [];

        for (const playerDoc of playersSnap.docs) {
          const data = playerDoc.data();
          if (data.isAlive) {
            if (data.currentChoice !== winningChoice) {
              await updateDoc(playerDoc.ref, {
                isAlive: false,
                survivedRounds: gameData.currentRound
              });
              eliminated.push(data.name);
            } else {
              await updateDoc(playerDoc.ref, {
                survivedRounds: gameData.currentRound
              });
            }
          }
        }

        // 라운드 결과 저장
        await setDoc(doc(db, 'games', gameId, 'rounds', `round_${gameData.currentRound}`), {
          question: gameData.currentQuestion.text,
          optionA: gameData.currentQuestion.optionA,
          optionB: gameData.currentQuestion.optionB,
          countA,
          countB,
          winningChoice,
          eliminated,
          gameMode: 'elimination'
        });

        // 생존자 수 확인
        const survivors = activePlayers.filter(p => p.currentChoice === winningChoice).length;

        if (survivors <= 2) {
          await updateDoc(doc(db, 'games', gameId), {
            status: 'finished'
          });
        } else {
          await updateDoc(doc(db, 'games', gameId), {
            status: 'result'
          });
        }
      }
    } catch (error) {
      console.error('Failed to calculate result:', error);
      alert('결과 계산에 실패했습니다.');
    }
  };

  // 게임 종료
  const endGame = async () => {
    if (!gameId) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        status: 'finished'
      });
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };

  // 게임 삭제
  const deleteGame = async () => {
    if (!gameId) return;
    if (!confirm('정말 게임을 삭제하시겠습니까?')) return;

    try {
      const playersRef = collection(db, 'games', gameId, 'players');
      const playersSnap = await getDocs(playersRef);
      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(playerDoc.ref);
      }

      const roundsRef = collection(db, 'games', gameId, 'rounds');
      const roundsSnap = await getDocs(roundsRef);
      for (const roundDoc of roundsSnap.docs) {
        await deleteDoc(roundDoc.ref);
      }

      await deleteDoc(doc(db, 'games', gameId));
      window.close();
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  // 유효하지 않은 접근
  if (!gameId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800">잘못된 접근</h1>
        </div>
      </div>
    );
  }

  // 로딩 중
  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-6xl mb-4 animate-bounce">🎯</div>
          <h1 className="text-xl font-bold text-gray-800">게임 로딩 중...</h1>
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter(p => p.isAlive);
  const votedCount = alivePlayers.filter(p => p.currentChoice !== null).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-600 to-purple-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-4 text-center">
          <h1 className="text-3xl font-bold text-pink-800 mb-2">🎯 소수결 게임</h1>
          <p className="text-gray-600">{gameData.className || '게임'}</p>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
              gameData.gameMode === 'score'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {gameData.gameMode === 'score' ? '⭐ 점수전 모드' : '💀 탈락전 모드'}
            </span>
          </div>
          <div className="mt-3 flex justify-center gap-4 flex-wrap">
            <span className={`px-4 py-2 rounded-full text-white font-bold ${
              gameData.status === 'waiting' ? 'bg-amber-500' :
              gameData.status === 'question' ? 'bg-green-500' :
              gameData.status === 'result' ? 'bg-blue-500' : 'bg-gray-500'
            }`}>
              {gameData.status === 'waiting' ? '⏳ 대기중' :
               gameData.status === 'question' ? `🎮 ${gameData.currentRound}${gameData.gameMode === 'score' ? `/${gameData.maxRounds || 10}` : ''}라운드` :
               gameData.status === 'result' ? '📊 결과' : '🏁 종료'}
            </span>
            <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-bold">
              {gameData.gameMode === 'score'
                ? `👥 참가: ${players.length}명`
                : `👥 생존: ${alivePlayers.length}명`}
            </span>
          </div>
        </div>

        {/* 카운트다운 오버레이 */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-12 text-center">
              <p className="text-xl text-gray-600 mb-4">투표 마감!</p>
              <div className="text-8xl font-bold text-pink-600 animate-pulse">{countdown}</div>
            </div>
          </div>
        )}

        {/* 현재 질문 */}
        {gameData.status === 'question' && gameData.currentQuestion && (
          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <h2 className="font-bold text-lg text-center text-gray-800 mb-3">
              {gameData.currentQuestion.text}
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-pink-100 rounded-xl p-4">
                <p className="font-bold text-pink-800">{gameData.currentQuestion.optionA}</p>
                <p className="text-2xl font-bold mt-2">
                  {gameData.gameMode === 'score'
                    ? players.filter(p => p.currentChoice === 'A').length
                    : alivePlayers.filter(p => p.currentChoice === 'A').length}명
                </p>
              </div>
              <div className="bg-purple-100 rounded-xl p-4">
                <p className="font-bold text-purple-800">{gameData.currentQuestion.optionB}</p>
                <p className="text-2xl font-bold mt-2">
                  {gameData.gameMode === 'score'
                    ? players.filter(p => p.currentChoice === 'B').length
                    : alivePlayers.filter(p => p.currentChoice === 'B').length}명
                </p>
              </div>
            </div>
            <p className="text-center text-gray-500 mt-3">
              투표: {gameData.gameMode === 'score'
                ? `${players.filter(p => p.currentChoice !== null).length} / ${players.length}명`
                : `${votedCount} / ${alivePlayers.length}명`}
            </p>
          </div>
        )}

        {/* 참가자 목록 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
          <h2 className="font-bold text-xl text-gray-800 mb-3">
            👥 참가자 ({players.length}명)
          </h2>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {players.map((player, index) => (
              <div
                key={player.code}
                onClick={() => openStudentModal(player)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer hover:ring-2 hover:ring-pink-400 transition-all ${
                  gameData.gameMode === 'score'
                    ? 'bg-yellow-50'
                    : player.isAlive ? 'bg-green-50' : 'bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {gameData.gameMode === 'score' ? (
                    <>
                      <span className="text-xl font-bold text-yellow-600">#{index + 1}</span>
                      <span className="font-medium">{player.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">{player.isAlive ? '💚' : '💀'}</span>
                      <span className={player.isAlive ? 'font-medium' : 'text-gray-400 line-through'}>
                        {player.name}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {gameData.status === 'question' && (gameData.gameMode === 'score' || player.isAlive) && (
                    <span className={player.currentChoice ? 'text-green-600' : 'text-amber-600'}>
                      {player.currentChoice ? '✅ 투표완료' : '⏳ 대기중'}
                    </span>
                  )}
                  {gameData.gameMode === 'score' ? (
                    <span className="text-yellow-600 font-bold">⭐{player.score || 0}점</span>
                  ) : (
                    <span className="text-gray-500">R{player.survivedRounds}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 컨트롤 버튼 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg">
          <div className="flex gap-3 flex-wrap">
            {gameData.status === 'waiting' && (
              <>
                <button
                  onClick={startRound}
                  disabled={alivePlayers.length < 3}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg ${
                    alivePlayers.length >= 3
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  🚀 게임 시작
                </button>
                <button
                  onClick={deleteGame}
                  className="px-6 py-4 rounded-xl bg-red-100 text-red-600 font-bold hover:bg-red-200"
                >
                  삭제
                </button>
              </>
            )}
            {gameData.status === 'question' && (
              <>
                <button
                  onClick={closeVoting}
                  className="flex-1 py-4 rounded-xl bg-amber-500 text-white font-bold text-lg hover:bg-amber-600"
                >
                  ⏱️ 투표 마감
                </button>
                <button
                  onClick={endGame}
                  className="px-6 py-4 rounded-xl bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                >
                  종료
                </button>
              </>
            )}
            {gameData.status === 'result' && (
              <>
                <button
                  onClick={startRound}
                  className="flex-1 py-4 rounded-xl bg-green-500 text-white font-bold text-lg hover:bg-green-600"
                >
                  ➡️ 다음 라운드
                </button>
                <button
                  onClick={endGame}
                  className="px-6 py-4 rounded-xl bg-gray-200 text-gray-600 font-bold hover:bg-gray-300"
                >
                  종료
                </button>
              </>
            )}
            {gameData.status === 'finished' && (
              <button
                onClick={() => window.close()}
                className="flex-1 py-4 rounded-xl bg-gray-500 text-white font-bold text-lg hover:bg-gray-600"
              >
                창 닫기
              </button>
            )}
          </div>
        </div>

        {/* 안내 */}
        <div className="mt-4 text-center text-white/80 text-sm">
          {gameData.status === 'waiting' && <p>3명 이상이 참가하면 시작할 수 있어요</p>}
          {gameData.status === 'question' && <p>모두 투표하면 마감 버튼을 눌러주세요</p>}
          {gameData.status === 'result' && (
            <p>
              {gameData.gameMode === 'score'
                ? `결과 확인 후 다음 라운드를 시작하세요 (${gameData.currentRound}/${gameData.maxRounds || 10})`
                : '결과 확인 후 다음 라운드를 시작하세요'}
            </p>
          )}
          {gameData.status === 'finished' && (
            <p>{gameData.gameMode === 'score' ? '🏆 최종 순위가 결정되었습니다!' : '게임이 종료되었습니다!'}</p>
          )}
        </div>
      </div>

      {/* 학생 모달 */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeStudentModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{selectedPlayer.name}</h3>
                <p className="text-sm text-gray-500">{selectedPlayer.code}</p>
              </div>
              <button onClick={closeStudentModal} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-4 bg-pink-50 text-center">
              <p className="text-pink-600 font-bold text-3xl">
                {studentData ? (studentData.jelly ?? studentData.cookie ?? 0) : '...'}
              </p>
              <p className="text-sm text-pink-700">🍭 캔디</p>
            </div>

            <div className="p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">🍭 캔디 부여/차감</p>
              <div className="flex gap-2 mb-2">
                <button onClick={() => handleAddCandy(-5)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50">-5</button>
                <button onClick={() => handleAddCandy(-1)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-red-100 text-red-600 font-bold hover:bg-red-200 disabled:opacity-50">-1</button>
                <button onClick={() => handleAddCandy(1)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50">+1</button>
                <button onClick={() => handleAddCandy(5)} disabled={isAddingCandy}
                  className="flex-1 py-2 rounded-lg bg-green-100 text-green-600 font-bold hover:bg-green-200 disabled:opacity-50">+5</button>
              </div>
              <div className="flex gap-2">
                <input type="number" value={candyAmount} onChange={(e) => setCandyAmount(e.target.value)}
                  placeholder="직접 입력" className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-pink-400 focus:outline-none"/>
                <button onClick={() => handleAddCandy()} disabled={isAddingCandy || !candyAmount}
                  className="px-4 py-2 rounded-lg bg-pink-500 text-white font-bold hover:bg-pink-600 disabled:opacity-50">
                  {isAddingCandy ? '...' : '적용'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinorityGameTeacher;
