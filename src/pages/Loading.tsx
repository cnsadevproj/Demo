import React from 'react';

export function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* 스피너 */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        
        <h3 className="mb-2">로딩 중...</h3>
        <p className="text-gray-600">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}
