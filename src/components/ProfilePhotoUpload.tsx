// src/components/ProfilePhotoUpload.tsx
// 프로필 사진 업로드 컴포넌트 (이미지 크롭 기능 포함)

import React, { useState, useRef, useEffect } from 'react';
import { storage, db } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { Camera, X, Upload, Check } from 'lucide-react';
import { Slider } from './ui/slider';

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

  // 이미지 편집 상태
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      // 초기화
      setZoom(100);
      setPosition({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // 이미지 로드 완료 핸들러
  const handleImageLoad = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    }
  };

  // 마우스 드래그 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedFile) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // 마우스 이동
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedFile) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  // 마우스 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Canvas에 원형 크롭된 이미지 그리기
  const drawCroppedImage = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        reject(new Error('Canvas or image not found'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // 캔버스 크기 설정 (출력 크기)
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      // 원형 클리핑 경로
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // 배경 채우기
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, size, size);

      // 이미지 그리기
      const scale = zoom / 100;
      const previewSize = 280; // 미리보기 컨테이너 크기

      // 이미지의 원본 비율 유지하면서 컨테이너를 채우는 크기 계산
      const imgAspect = image.naturalWidth / image.naturalHeight;
      const containerAspect = 1; // 원형이므로 1:1

      let baseWidth, baseHeight;
      if (imgAspect > containerAspect) {
        // 이미지가 더 넓음 - 높이 기준으로 맞춤
        baseHeight = previewSize;
        baseWidth = baseHeight * imgAspect;
      } else {
        // 이미지가 더 높음 - 너비 기준으로 맞춤
        baseWidth = previewSize;
        baseHeight = baseWidth / imgAspect;
      }

      const scaledWidth = baseWidth * scale;
      const scaledHeight = baseHeight * scale;

      // 위치를 캔버스 크기에 맞게 조정
      const scaleFactor = size / previewSize;
      const drawX = (size / 2) - (scaledWidth / 2) + (position.x * scaleFactor);
      const drawY = (size / 2) - (scaledHeight / 2) + (position.y * scaleFactor);

      ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);

      // Blob으로 변환
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      // 크롭된 이미지 생성
      const croppedBlob = await drawCroppedImage();

      // Storage에 업로드
      const storageRef = ref(storage, `profile-photos/${teacherId}/${studentCode}`);
      await uploadBytes(storageRef, croppedBlob);

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">프로필 사진</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 미리보기 영역 */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="w-[280px] h-[280px] rounded-full overflow-hidden border-4 border-purple-200 bg-gray-100 flex items-center justify-center relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: selectedFile ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              >
                {previewUrl ? (
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="프로필 미리보기"
                    onLoad={handleImageLoad}
                    className="absolute select-none pointer-events-none"
                    draggable={false}
                    style={{
                      transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom / 100})`,
                      transformOrigin: 'center',
                      left: '50%',
                      top: '50%',
                      width: 'auto',
                      height: 'auto',
                      minWidth: '100%',
                      minHeight: '100%',
                      maxWidth: 'none',
                      maxHeight: 'none'
                    }}
                  />
                ) : (
                  <Camera className="w-16 h-16 text-gray-400" />
                )}
              </div>
              {selectedFile && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full">
                  드래그로 위치 조정
                </div>
              )}
            </div>
          </div>

          {/* 줌 조절 슬라이더 */}
          {selectedFile && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>크기 조절</span>
                <span className="text-purple-600">{zoom}%</span>
              </label>
              <Slider
                value={[zoom]}
                onValueChange={(values) => setZoom(values[0])}
                min={50}
                max={200}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>50%</span>
                <span>200%</span>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 안내 문구 */}
          <p className="text-center text-sm text-gray-500">
            📷 최대 3MB 이하의 이미지 파일<br/>
            {selectedFile && '🖱️ 드래그로 위치 조정, 슬라이더로 크기 조절'}
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
              📷 사진 선택하기
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
                    ✅ 프로필로 적용하기
                  </>
                )}
              </button>
            )}

            {currentPhotoUrl && !selectedFile && (
              <button
                onClick={handleRemovePhoto}
                disabled={isUploading}
                className="w-full py-3 px-4 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-all disabled:opacity-50"
              >
                🗑️ 사진 삭제하기
              </button>
            )}

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              닫기
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
