import React from 'react';
import { Card } from '../components/ui/card';
import { AlertCircle, Home } from 'lucide-react';

interface ErrorUnauthorizedProps {
  onNavigate?: (page: string) => void;
}

export function ErrorUnauthorized({ onNavigate }: ErrorUnauthorizedProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-100 rounded-full">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
        </div>
        
        <h2 className="mb-4">접근 권한이 없습니다</h2>
        
        <p className="text-gray-600 mb-6">
          이 페이지는 학교 계정으로만 접근할 수 있습니다.
          학교 이메일(@school.ac.kr)로 로그인해주세요.
        </p>

        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm text-blue-900 mb-2"><strong>학생용 페이지</strong></p>
            <p className="text-sm text-blue-800">
              학교 이메일로 Google 계정에 로그인하여 접근하세요.
            </p>
          </div>

          <div className="p-4 bg-red-50 rounded-lg text-left">
            <p className="text-sm text-red-900 mb-2"><strong>관리자용 페이지</strong></p>
            <p className="text-sm text-red-800">
              교사 계정으로 인증된 사용자만 접근할 수 있습니다.
            </p>
          </div>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('demo')}
            className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 w-full"
          >
            <Home className="w-5 h-5" />
            데모 버전 보기
          </button>
        )}
      </Card>
    </div>
  );
}
