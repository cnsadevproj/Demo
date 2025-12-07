// src/components/wordcloud/TeacherWordCloud.tsx
// 선생님용 워드클라우드 컴포넌트 - SVG 스파이럴 레이아웃, 테마, PNG 저장, 전체화면 지원

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Plus, Pencil, X, Loader2, Trash2, Power, PowerOff, Download, Maximize, Moon, Sun, Palette } from 'lucide-react';
import { toast } from 'sonner';
import {
  createWordCloudSession,
  getWordCloudSessions,
  updateWordCloudSessionStatus,
  deleteWordCloudSession,
  subscribeToWordCloudResponses,
  updateWordInCloud,
  deleteWordFromCloud,
  WordCloudSession,
  WordCloudResponse,
  WordCloudData,
  WordCloudWord,
} from '../../services/firestoreApi';

interface TeacherWordCloudProps {
  teacherId: string;
  classId: string;
}

// 색상 테마 정의
const COLOR_THEMES: Record<string, string[]> = {
  purple: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#c471f5', '#fa71cd'],
  pink: ['#f093fb', '#f5576c', '#ff6b95', '#ff8c94', '#ffa8a8', '#e056fd'],
  blue: ['#667eea', '#764ba2', '#6a11cb', '#2575fc', '#00c6fb', '#005bea'],
  green: ['#11998e', '#38ef7d', '#56ab2f', '#a8e063', '#00b09b', '#96c93d'],
  sunset: ['#fa709a', '#fee140', '#f093fb', '#f5576c', '#ff9a9e', '#fecfef'],
  orange: ['#f2994a', '#f2c94c', '#fa709a', '#ee9ca7', '#ffdde1', '#ff9a9e'],
  pastel: ['#a8d8ea', '#aa96da', '#fcbad3', '#ffffd2', '#b4f8c8', '#fbe7c6'],
  mono: ['#2c3e50', '#3d566e', '#5d6d7e', '#85929e', '#aab7b8', '#bdc3c7'],
};

export function TeacherWordCloud({ teacherId, classId }: TeacherWordCloudProps) {
  const [sessions, setSessions] = useState<WordCloudSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WordCloudSession | null>(null);
  const [allResponses, setAllResponses] = useState<WordCloudResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // 세션 생성 폼
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [maxSubmissions, setMaxSubmissions] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 수정 상태
  const [editingWord, setEditingWord] = useState<{
    studentCode: string;
    wordId: string;
    value: string;
  } | null>(null);

  // 커스터마이징 옵션
  const [darkMode, setDarkMode] = useState(false);
  const [colorTheme, setColorTheme] = useState<string>('purple');
  const [fontScale, setFontScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  // SVG 참조
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const wordCloudRef = useRef<HTMLDivElement>(null);

  // 세션 목록 로드
  useEffect(() => {
    loadSessions();
  }, [teacherId, classId]);

  // 선택된 세션의 응답 실시간 구독
  useEffect(() => {
    if (!selectedSession) return;

    const unsubscribe = subscribeToWordCloudResponses(
      teacherId,
      classId,
      selectedSession.id,
      (responses) => {
        setAllResponses(responses);
      }
    );

    return () => unsubscribe();
  }, [selectedSession, teacherId, classId]);

  // 전체화면 변경 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionsData = await getWordCloudSessions(teacherId, classId);
      setSessions(sessionsData);

      // 첫 세션 자동 선택
      if (sessionsData.length > 0 && !selectedSession) {
        setSelectedSession(sessionsData[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('세션 목록을 불러올 수 없습니다.');
    }
    setLoading(false);
  };

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) {
      toast.error('세션 제목을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const sessionId = await createWordCloudSession(
        teacherId,
        classId,
        newSessionTitle.trim(),
        maxSubmissions
      );

      toast.success('세션이 생성되었습니다!');
      setNewSessionTitle('');
      setMaxSubmissions(null);
      setShowCreateForm(false);
      await loadSessions();

      // 새로 생성한 세션 선택
      const newSession = sessions.find((s) => s.id === sessionId);
      if (newSession) {
        setSelectedSession(newSession);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('세션 생성에 실패했습니다.');
    }
    setIsCreating(false);
  };

  const handleToggleSession = async (session: WordCloudSession) => {
    try {
      const newStatus = session.status === 'active' ? 'ended' : 'active';
      await updateWordCloudSessionStatus(teacherId, classId, session.id, newStatus);
      toast.success(newStatus === 'active' ? '세션이 활성화되었습니다.' : '세션이 종료되었습니다.');
      await loadSessions();
    } catch (error) {
      console.error('Failed to toggle session:', error);
      toast.error('세션 상태 변경에 실패했습니다.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('세션을 삭제하시겠습니까? 모든 응답이 삭제됩니다.')) return;

    try {
      await deleteWordCloudSession(teacherId, classId, sessionId);
      toast.success('세션이 삭제되었습니다.');
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      await loadSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('세션 삭제에 실패했습니다.');
    }
  };

  const handleEditWord = async (studentCode: string, wordId: string, newValue: string) => {
    if (!selectedSession || !newValue.trim()) return;

    try {
      const result = await updateWordInCloud(
        teacherId,
        classId,
        selectedSession.id,
        studentCode,
        wordId,
        newValue.trim()
      );

      if (result.success) {
        setEditingWord(null);
        toast.success('단어가 수정되었습니다.');
      } else {
        toast.error(result.error || '단어 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to edit word:', error);
      toast.error('단어 수정에 실패했습니다.');
    }
  };

  const handleDeleteWord = async (studentCode: string, wordId: string) => {
    if (!selectedSession) return;
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await deleteWordFromCloud(teacherId, classId, selectedSession.id, studentCode, wordId);
      toast.success('단어가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete word:', error);
      toast.error('단어 삭제에 실패했습니다.');
    }
  };

  // 워드클라우드 데이터 집계
  const getWordCloudData = (): WordCloudData[] => {
    const wordMap = new Map<string, { count: number; students: Set<string> }>();

    for (const response of allResponses) {
      for (const wordObj of response.words) {
        const wordLower = wordObj.word.toLowerCase();

        if (!wordMap.has(wordLower)) {
          wordMap.set(wordLower, { count: 0, students: new Set() });
        }

        const data = wordMap.get(wordLower)!;
        // 같은 단어가 제출될 때마다 카운트 증가 (더 커지게)
        data.students.add(response.studentCode);
        data.count++;
      }
    }

    return Array.from(wordMap.entries())
      .map(([word, data]) => ({
        word,
        count: data.count,
        students: Array.from(data.students),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const wordCloudData = getWordCloudData();
  const maxCount = wordCloudData.length > 0 ? wordCloudData[0].count : 1;

  // 폰트 크기 계산
  const getFontSize = (count: number) => {
    const minSize = 14 * fontScale;
    const maxSize = 56 * fontScale;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * Math.pow(ratio, 0.7);
  };

  // 테마에 따른 색상 선택
  const getColor = (index: number) => {
    const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.purple;
    return colors[index % colors.length];
  };

  // 전체화면 토글
  const toggleFullscreen = useCallback(() => {
    if (!wordCloudRef.current) return;

    if (!document.fullscreenElement) {
      wordCloudRef.current.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
        toast.error('전체화면 전환에 실패했습니다.');
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // PNG로 저장
  const saveAsPNG = useCallback(() => {
    const svgContainer = svgContainerRef.current;
    if (!svgContainer) return;

    const svg = svgContainer.querySelector('svg');
    if (!svg) {
      toast.error('저장할 워드클라우드가 없습니다.');
      return;
    }

    // SVG를 Canvas로 변환
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2; // 고해상도
    const rect = svgContainer.getBoundingClientRect();
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    ctx.scale(scale, scale);

    // 배경 그리기
    ctx.fillStyle = darkMode ? '#1a202c' : '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // SVG를 이미지로 변환
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);

      // 다운로드
      const link = document.createElement('a');
      link.download = `wordcloud_${selectedSession?.title || 'export'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('이미지가 저장되었습니다.');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error('이미지 저장에 실패했습니다.');
    };
    img.src = url;
  }, [darkMode, selectedSession]);

  // SVG 스파이럴 레이아웃 렌더링
  const renderWordCloudSVG = () => {
    if (wordCloudData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          아직 제출된 단어가 없습니다.
        </div>
      );
    }

    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    // 단어 위치 계산 (스파이럴 레이아웃)
    const placedWords: Array<{ x: number; y: number; width: number; height: number }> = [];

    const checkCollision = (x: number, y: number, w: number, h: number) => {
      const padding = 5;
      for (const placed of placedWords) {
        if (
          x < placed.x + placed.width + padding &&
          x + w + padding > placed.x &&
          y < placed.y + placed.height + padding &&
          y + h + padding > placed.y
        ) {
          return true;
        }
      }
      return false;
    };

    const findPosition = (wordWidth: number, wordHeight: number) => {
      let angle = 0;
      let radius = 0;
      const maxAttempts = 500;
      const spiralStep = 5;
      const angleStep = 0.5;

      for (let i = 0; i < maxAttempts; i++) {
        const x = centerX + radius * Math.cos(angle) - wordWidth / 2;
        const y = centerY + radius * Math.sin(angle) - wordHeight / 2;

        if (
          x >= 0 &&
          x + wordWidth <= width &&
          y >= 0 &&
          y + wordHeight <= height &&
          !checkCollision(x, y, wordWidth, wordHeight)
        ) {
          return { x, y };
        }

        angle += angleStep;
        radius += spiralStep / (2 * Math.PI);
      }

      // 위치를 찾지 못하면 랜덤 위치
      return {
        x: Math.random() * (width - wordWidth),
        y: Math.random() * (height - wordHeight),
      };
    };

    const wordElements = wordCloudData.map((item, index) => {
      const fontSize = getFontSize(item.count);
      // 대략적인 텍스트 크기 계산
      const textWidth = item.word.length * fontSize * 0.6;
      const textHeight = fontSize * 1.2;

      const position = findPosition(textWidth, textHeight);
      placedWords.push({
        x: position.x,
        y: position.y,
        width: textWidth,
        height: textHeight,
      });

      return (
        <text
          key={index}
          x={position.x + textWidth / 2}
          y={position.y + textHeight / 2}
          fill={getColor(index)}
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            transition: 'all 0.3s ease',
            cursor: 'default',
          }}
          className="hover:opacity-80"
        >
          <title>{`${item.count}회 (${item.students.length}명)`}</title>
          {item.word}
        </text>
      );
    });

    return (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ minHeight: '300px' }}
      >
        {wordElements}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 전체화면 모드 렌더링
  if (isFullscreen) {
    return (
      <div
        ref={wordCloudRef}
        className={`w-full h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
        {/* 전체화면 헤더 */}
        <div className={`flex items-center justify-between px-6 py-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedSession?.title}
          </h2>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {allResponses.length}명 참여
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleFullscreen}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 워드클라우드 */}
        <div ref={svgContainerRef} className="flex-1 p-8">
          {renderWordCloudSVG()}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 좌측: 세션 관리 */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>세션 관리</span>
              <Button
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? 'outline' : 'default'}
              >
                {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 세션 생성 폼 */}
            {showCreateForm && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                <Input
                  placeholder="세션 제목"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                />
                <div className="flex gap-2 items-center">
                  <label className="text-sm text-gray-600">제출 횟수:</label>
                  <Input
                    type="number"
                    placeholder="무제한"
                    value={maxSubmissions || ''}
                    onChange={(e) => setMaxSubmissions(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-24"
                    min="1"
                  />
                </div>
                <Button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="w-full"
                  size="sm"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : '생성'}
                </Button>
              </div>
            )}

            {/* 세션 목록 */}
            {sessions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">생성된 세션이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedSession?.id === session.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{session.title}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {session.totalResponses}개 응답
                          {session.maxSubmissions && ` · 최대 ${session.maxSubmissions}개`}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSession(session);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded"
                          title={session.status === 'active' ? '세션 종료' : '세션 재개'}
                        >
                          {session.status === 'active' ? (
                            <PowerOff className="w-4 h-4 text-green-600" />
                          ) : (
                            <Power className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className="p-1.5 hover:bg-red-100 rounded"
                          title="세션 삭제"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 우측: 워드클라우드 결과 */}
      <div className="lg:col-span-2 space-y-4">
        {selectedSession ? (
          <>
            {/* 워드클라우드 시각화 */}
            <Card ref={wordCloudRef}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{selectedSession.title}</span>
                      <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'}>
                        {selectedSession.status === 'active' ? '진행 중' : '종료됨'}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">총 {allResponses.length}명 참여</p>
                  </div>

                  {/* 도구 버튼 */}
                  <div className="flex items-center gap-2">
                    {/* 테마 선택 */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemePicker(!showThemePicker)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="테마 변경"
                      >
                        <Palette className="w-5 h-5 text-gray-600" />
                      </button>
                      {showThemePicker && (
                        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border p-3 z-10">
                          <p className="text-xs text-gray-500 mb-2">색상 테마</p>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.keys(COLOR_THEMES).map((theme) => (
                              <button
                                key={theme}
                                onClick={() => {
                                  setColorTheme(theme);
                                  setShowThemePicker(false);
                                }}
                                className={`w-8 h-8 rounded-full border-2 ${
                                  colorTheme === theme ? 'border-gray-800' : 'border-transparent'
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, ${COLOR_THEMES[theme][0]}, ${COLOR_THEMES[theme][1]})`,
                                }}
                                title={theme}
                              />
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs text-gray-500 mb-2">글자 크기</p>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.1"
                              value={fontScale}
                              onChange={(e) => setFontScale(parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                              <span>작게</span>
                              <span>{Math.round(fontScale * 100)}%</span>
                              <span>크게</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 다크모드 토글 */}
                    <button
                      onClick={() => setDarkMode(!darkMode)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title={darkMode ? '라이트 모드' : '다크 모드'}
                    >
                      {darkMode ? (
                        <Sun className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Moon className="w-5 h-5 text-gray-600" />
                      )}
                    </button>

                    {/* PNG 저장 */}
                    <button
                      onClick={saveAsPNG}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="PNG로 저장"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* 전체화면 */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="전체화면"
                    >
                      <Maximize className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  ref={svgContainerRef}
                  className={`rounded-lg p-4 min-h-[300px] ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
                >
                  {renderWordCloudSVG()}
                </div>
              </CardContent>
            </Card>

            {/* 응답 목록 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">학생 응답</CardTitle>
              </CardHeader>
              <CardContent>
                {allResponses.length > 0 ? (
                  <div className="space-y-3">
                    {allResponses.map((response) => (
                      <div key={response.studentCode} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{response.studentName}</span>
                          <span className="text-xs text-gray-500">{response.words.length}개</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {response.words.map((word) => (
                            <div
                              key={word.id}
                              className="flex items-center gap-1 px-2 py-1 bg-white rounded-full text-sm"
                            >
                              {editingWord?.wordId === word.id &&
                              editingWord?.studentCode === response.studentCode ? (
                                <>
                                  <Input
                                    value={editingWord.value}
                                    onChange={(e) =>
                                      setEditingWord({ ...editingWord, value: e.target.value })
                                    }
                                    className="h-6 w-24 text-xs"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleEditWord(response.studentCode, word.id, editingWord.value);
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() =>
                                      handleEditWord(response.studentCode, word.id, editingWord.value)
                                    }
                                    className="p-0.5 hover:bg-gray-200 rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span>{word.word}</span>
                                  <button
                                    onClick={() =>
                                      setEditingWord({
                                        studentCode: response.studentCode,
                                        wordId: word.id,
                                        value: word.word,
                                      })
                                    }
                                    className="p-0.5 hover:bg-gray-200 rounded"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteWord(response.studentCode, word.id)}
                                    className="p-0.5 hover:bg-red-100 rounded"
                                  >
                                    <X className="w-3 h-3 text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">응답이 없습니다.</div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">세션을 선택하거나 새로 생성해주세요.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
