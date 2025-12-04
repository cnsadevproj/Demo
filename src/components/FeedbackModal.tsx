// src/components/FeedbackModal.tsx
// To개발자 - 버그보고/기능요청 모달 컴포넌트

import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'student' | 'teacher';
  userName?: string;
  userCode?: string;
}

export function FeedbackModal({ isOpen, onClose, userType, userName, userCode }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        userType,
        userName: userName || '익명',
        userCode: userCode || '',
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setTitle('');
        setDescription('');
        setFeedbackType('bug');
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('제출에 실패했습니다. 다시 시도해주세요.');
    }
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <h2 className="text-lg font-bold text-white">To 개발자</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">제출 완료!</h3>
            <p className="text-gray-600">소중한 의견 감사합니다.</p>
          </div>
        ) : (
          <div className="p-4">
            {/* 타입 토글 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setFeedbackType('bug')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  feedbackType === 'bug'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🐛 버그 보고
              </button>
              <button
                onClick={() => setFeedbackType('feature')}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  feedbackType === 'feature'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💡 기능 요청
              </button>
            </div>

            {/* 안내 메시지 */}
            <div className={`p-3 rounded-xl mb-4 ${
              feedbackType === 'bug' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {feedbackType === 'bug' ? (
                <p className="text-sm">
                  🐛 발견한 버그나 오류를 알려주세요!<br/>
                  어떤 상황에서 문제가 발생했는지 자세히 적어주시면 빠른 수정에 도움이 됩니다.
                </p>
              ) : (
                <p className="text-sm">
                  💡 새로운 기능이나 개선 아이디어를 제안해주세요!<br/>
                  여러분의 의견으로 더 나은 서비스를 만들어갑니다.
                </p>
              )}
            </div>

            {/* 제목 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={feedbackType === 'bug' ? '예: 로그인이 안돼요' : '예: 다크모드 추가해주세요'}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
                maxLength={100}
              />
            </div>

            {/* 내용 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                내용
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={feedbackType === 'bug'
                  ? '버그가 발생한 상황을 자세히 설명해주세요...'
                  : '원하는 기능을 자세히 설명해주세요...'
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none resize-none"
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {description.length}/1000
              </p>
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                feedbackType === 'bug'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? '제출 중...' : '제출하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// To개발자 버튼 컴포넌트
export function FeedbackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-full hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1"
    >
      <span>💬</span>
      <span>To 개발자</span>
    </button>
  );
}
