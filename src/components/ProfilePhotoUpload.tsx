// src/components/ProfilePhotoUpload.tsx
// 프로필 사진 업로드 컴포넌트

import React, { useState, useRef } from 'react';
import { storage, db } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, X, Upload, Check } from 'lucide-react';

interface ProfilePhotoUploadProps {
  studentCode: string;
  teacherId: string;
  currentPhotoUrl?: string;
  onPhotoUpdated: (url: string) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

export function ProfilePhotoUpload({
  studentCode,
  teacherId,
  currentPhotoUrl,
  onPhotoUpdated,
  onClose
}: ProfilePhotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검사
    if (file.size > MAX_FILE_SIZE) {
      setError('파일 크기가 3MB를 초과합니다. 더 작은 파일을 선택해주세요.');
      return;
    }

    // 이미지 파일인지 검사
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // Storage에 업로드
      const storageRef = ref(storage, `profile-photos/${teacherId}/${studentCode}`);
      await uploadBytes(storageRef, selectedFile);

      // 다운로드 URL 가져오기
      const downloadUrl = await getDownloadURL(storageRef);

      // Firestore에 URL 저장
      const studentRef = doc(db, `teachers/${teacherId}/students/${studentCode}`);
      await updateDoc(studentRef, {
        profilePhotoUrl: downloadUrl
      });

      onPhotoUpdated(downloadUrl);
      onClose();
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setIsUploading(true);
    try {
      // Firestore에서 URL 제거
      const studentRef = doc(db, `teachers/${teacherId}/students/${studentCode}`);
      await updateDoc(studentRef, {
        profilePhotoUrl: null
      });

      onPhotoUpdated('');
      onClose();
    } catch (err) {
      console.error('Failed to remove photo:', err);
      setError('삭제에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">프로필 사진</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* 미리보기 영역 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200 bg-gray-100 flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="프로필 미리보기"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-12 h-12 text-gray-400" />
                )}
              </div>
              {previewUrl && (
                <button
                  onClick={() => {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                  }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 안내 문구 */}
          <p className="text-center text-sm text-gray-500 mb-4">
            📷 최대 3MB 이하의 이미지 파일만 업로드할 수 있어요.<br/>
            사진은 원형으로 표시됩니다.
          </p>

          {/* 파일 선택 버튼 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              사진 선택하기
            </button>

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    업로드하기
                  </>
                )}
              </button>
            )}

            {currentPhotoUrl && (
              <button
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="w-full py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                사진 삭제하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
