// src/services/firebase.ts
// Firebase 초기화 설정

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase 설정 (Firebase 콘솔에서 받은 값)
const firebaseConfig = {
  apiKey: "AIzaSyBWrkpW1J2bV19SxBNpW0YbBqtU0zaf1ok",
  authDomain: "dahatni-dbe19.firebaseapp.com",
  projectId: "dahatni-dbe19",
  storageBucket: "dahatni-dbe19.firebasestorage.app",
  messagingSenderId: "332702012778",
  appId: "1:332702012778:web:6b650be5921db316410113"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firestore (데이터베이스) - 데이터 저장/조회에 사용
export const db = getFirestore(app);

// Authentication (인증) - 로그인/회원가입에 사용
export const auth = getAuth(app);

// Storage (파일 저장) - 프로필 사진 등 파일 업로드에 사용
export const storage = getStorage(app);

// Cloud Functions - 학생 로그인 인증 등 서버 함수 호출에 사용
export const functions = getFunctions(app, 'asia-northeast3');
