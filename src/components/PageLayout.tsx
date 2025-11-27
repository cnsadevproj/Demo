import React from 'react';
import { Home, Users, Swords, Target, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  role?: 'student' | 'admin' | 'demo';
  showBack?: boolean;
  onBack?: () => void;
}

export function PageLayout({ title, children, role = 'student', showBack = false, onBack }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1>{title}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              {role === 'admin' && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                  관리자
                </span>
              )}
              {role === 'demo' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  데모
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
