// src/pages/Loading.tsx
// 로딩 페이지

import React from 'react';

export function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4 animate-bounce">🍪</div>
        <p className="text-amber-800 font-medium">로딩 중...</p>
      </div>
    </div>
  );
}