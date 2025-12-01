// src/services/firebase.ts
// Firebase 초기화 설정

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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