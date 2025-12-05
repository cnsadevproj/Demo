// src/components/ProfilePhotoUpload.tsx
// 프로필 사진 업로드 컴포넌트 (Canvas 기반 크롭)

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
const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 400;

export function ProfilePhotoUpload({
  studentCode,
  teacherId,
  currentPhotoUrl,
  onPhotoUpdated,
  onClose
}: ProfilePhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 편집 상태
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas에 이미지 그리기 (미리보기 & 최종 출력 공통 로직)
  const drawToCanvas = (
    canvas: HTMLCanvasElement,
    image: HTMLImageElement,
    size: number
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas 크기 설정
    canvas.width = size;
    canvas.height = size;

    // 원형 클리핑
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 회색 배경
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, size, size);

    // 이미지 크기 계산
    const imgAspect = image.naturalWidth / image.naturalHeight;
    let baseWidth, baseHeight;

    if (imgAspect >= 1) {
      // 가로가 더 긴 이미지
      baseHeight = size;
      baseWidth = size * imgAspect;
    } else {
      // 세로가 더 긴 이미지
      baseWidth = size;
      baseHeight = size / imgAspect;
    }

    // 줌 적용
    const scale = zoom / 100;
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    // 위치 계산 - position은 PREVIEW_SIZE 기준이므로 size에 맞게 스케일
    const positionScale = size / PREVIEW_SIZE;
    const adjustedX = position.x * positionScale;
    const adjustedY = position.y * positionScale;

    const drawX = size / 2 + adjustedX - scaledWidth / 2;
    const drawY = size / 2 + adjustedY - scaledHeight / 2;

    // 이미지 그리기
    ctx.drawImage(image, drawX, drawY, scaledWidth, scaledHeight);
  };

  // 미리보기 업데이트
  useEffect(() => {
    if (!selectedFile || !sourceImageRef.current || !previewCanvasRef.current) return;

    const img = sourceImageRef.current;
    const canvas = previewCanvasRef.current;

    if (img.complete) {
      drawToCanvas(canvas, img, PREVIEW_SIZE);
    }
  }, [selectedFile, zoom, position]);

  // 이미지 로드 완료 시 미리보기 그리기
  const handleImageLoad = () => {
    if (sourceImageRef.current && previewCanvasRef.current) {
      drawToCanvas(previewCanvasRef.current, sourceImageRef.current, PREVIEW_SIZE);
    }
  };

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
    setZoom(100);
    setPosition({ x: 0, y: 0 });
  };

  // 마우스 드래그
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedFile) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedFile) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 최종 이미지 생성 및 업로드
  const handleUpload = async () => {
    if (!selectedFile || !sourceImageRef.current || !outputCanvasRef.current) return;

    setIsUploading(true);
    setError(null);

    try {
      // 최종 출력 Canvas에 그리기
      const canvas = outputCanvasRef.current;
      const image = sourceImageRef.current;
      drawToCanvas(canvas, image, OUTPUT_SIZE);

      // Blob 생성
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/jpeg', 0.95);
      });

      // Storage에 업로드
      const storageRef = ref(storage, `profile-photos/${teacherId}/${studentCode}`);
      await uploadBytes(storageRef, blob);

      // 다운로드 URL 가져오기
      const downloadUrl = await getDownloadURL(storageRef);

      // Firestore에 URL 저장
      const studentRef = doc(db, `teachers/${teacherId}/students/${studentCode}`);
      await updateDoc(studentRef, {
        profilePhotoUrl: downloadUrl,
        'profile.profilePhotoActive': true
      });

      onPhotoUpdated(downloadUrl);
      onClose();
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError(`업로드에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentPhotoUrl) return;

    setIsUploading(true);
    try {
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
            <div
              className="rounded-full overflow-hidden border-4 border-purple-200 bg-gray-100 flex items-center justify-center relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                width: `${PREVIEW_SIZE}px`,
                height: `${PREVIEW_SIZE}px`,
                cursor: selectedFile ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
            >
              {selectedFile ? (
                <canvas
                  ref={previewCanvasRef}
                  width={PREVIEW_SIZE}
                  height={PREVIEW_SIZE}
                  className="select-none"
                />
              ) : currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt="현재 프로필"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <Camera className="w-16 h-16 text-gray-400" />
              )}
            </div>
          </div>

          {/* Hidden source image */}
          {selectedFile && (
            <img
              ref={sourceImageRef}
              src={URL.createObjectURL(selectedFile)}
              alt=""
              onLoad={handleImageLoad}
              className="hidden"
            />
          )}

          {/* 줌 조절 슬라이더 */}
          {selectedFile && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>크기 조절</span>
                <span className="text-purple-600 font-bold text-lg">{zoom}%</span>
              </label>
              <div className="px-2">
                <Slider
                  value={[zoom]}
                  onValueChange={(values) => setZoom(values[0])}
                  min={50}
                  max={200}
                  step={1}
                  variant="purple"
                  className="relative w-full"
                />
              </div>
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

      {/* Hidden canvas for output */}
      <canvas ref={outputCanvasRef} className="hidden" />
    </div>
  );
}
