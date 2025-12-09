// src/components/wordcloud/StudentWordCloud.tsx
// 학생용 워드클라우드 컴포넌트 - SVG 스파이럴 레이아웃

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Pencil, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  getWordCloudSessions,
  submitWordToCloud,
  updateWordInCloud,
  deleteWordFromCloud,
  subscribeToWordCloudResponses,
  WordCloudSession,
  WordCloudResponse,
  WordCloudWord,
  WordCloudData,
} from '../../services/firestoreApi';

interface StudentWordCloudProps {
  teacherId: string;
  classId: string;
  studentCode: string;
  studentName: string;
}

// 교사와 동일한 색상 테마
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

export function StudentWordCloud({
  teacherId,
  classId,
  studentCode,
  studentName,
}: StudentWordCloudProps) {
  const [sessions, setSessions] = useState<WordCloudSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WordCloudSession | null>(null);
  const [myWords, setMyWords] = useState<WordCloudWord[]>([]);
  const [allResponses, setAllResponses] = useState<WordCloudResponse[]>([]);
  const [newWord, setNewWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWordValue, setEditingWordValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [colorTheme] = useState<string>('purple');

  const svgContainerRef = useRef<HTMLDivElement>(null);

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

        // 내 단어 목록 업데이트
        const myResponse = responses.find((r) => r.studentCode === studentCode);
        setMyWords(myResponse?.words || []);
      }
    );

    return () => unsubscribe();
  }, [selectedSession, teacherId, classId, studentCode]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionsData = await getWordCloudSessions(teacherId, classId);
      setSessions(sessionsData);

      // 활성 세션이 있으면 자동 선택
      const activeSessions = sessionsData.filter((s) => s.status === 'active');
      if (activeSessions.length > 0 && !selectedSession) {
        setSelectedSession(activeSessions[0]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('세션 목록을 불러올 수 없습니다.');
    }
    setLoading(false);
  };

  const handleSubmitWord = async () => {
    if (!selectedSession || !newWord.trim()) {
      toast.error('단어를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitWordToCloud(
        teacherId,
        classId,
        selectedSession.id,
        studentCode,
        studentName,
        newWord.trim()
      );

      if (result.success) {
        setNewWord('');
        toast.success('단어가 추가되었습니다!');
      } else {
        toast.error(result.error || '단어 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to submit word:', error);
      toast.error('단어 추가에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  const handleEditWord = (word: WordCloudWord) => {
    setEditingWordId(word.id);
    setEditingWordValue(word.word);
  };

  const handleSaveEdit = async (wordId: string) => {
    if (!selectedSession || !editingWordValue.trim()) return;

    try {
      const result = await updateWordInCloud(
        teacherId,
        classId,
        selectedSession.id,
        studentCode,
        wordId,
        editingWordValue.trim()
      );

      if (result.success) {
        setEditingWordId(null);
        setEditingWordValue('');
        toast.success('단어가 수정되었습니다!');
      } else {
        toast.error(result.error || '단어 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update word:', error);
      toast.error('단어 수정에 실패했습니다.');
    }
  };

  const handleDeleteWord = async (wordId: string) => {
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

  // 교사와 동일한 폰트 크기 계산
  const getFontSize = (count: number) => {
    const minSize = 20;
    const maxSize = 56;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

  // 교사와 동일한 색상 선택
  const getColor = (index: number) => {
    const colors = COLOR_THEMES[colorTheme] || COLOR_THEMES.purple;
    return colors[index % colors.length];
  };

  // 교사와 동일한 SVG 스파이럴 레이아웃 렌더링
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

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">진행 중인 워드클라우드가 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* 세션 선택 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                selectedSession?.id === session.id
                  ? 'bg-indigo-600 text-white'
                  : session.status === 'active'
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {session.title}
              {session.status === 'active' && ' 🟢'}
            </button>
          ))}
        </div>

        {selectedSession && (
          <>
            {/* 단어 입력 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">단어 입력하기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="단어를 입력하세요"
                    maxLength={20}
                    disabled={selectedSession.status !== 'active' || isSubmitting}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmitWord();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmitWord}
                    disabled={selectedSession.status !== 'active' || isSubmitting || !newWord.trim()}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '추가'}
                  </Button>
                </div>

                {selectedSession.maxSubmissions !== null && (
                  <p className="text-sm text-gray-500 mt-2">
                    최대 {selectedSession.maxSubmissions}개까지 제출 가능 (현재: {myWords.length}개)
                  </p>
                )}

                {selectedSession.status !== 'active' && (
                  <p className="text-sm text-amber-600 mt-2">이 세션은 종료되었습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* 내가 제출한 단어 목록 */}
            {myWords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">내가 제출한 단어</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {myWords.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {editingWordId === word.id ? (
                          <>
                            <Input
                              value={editingWordValue}
                              onChange={(e) => setEditingWordValue(e.target.value)}
                              className="h-6 w-24 text-sm"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(word.id);
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(word.id)}
                              className="p-1 hover:bg-purple-200 rounded"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingWordId(null)}
                              className="p-1 hover:bg-purple-200 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{word.word}</span>
                            {selectedSession.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleEditWord(word)}
                                  className="p-1 hover:bg-purple-200 rounded"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteWord(word.id)}
                                  className="p-1 hover:bg-purple-200 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 워드클라우드 결과 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selectedSession.title}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">총 {allResponses.length}명 참여</p>
                  </div>
                  <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'}>
                    {selectedSession.status === 'active' ? '진행 중' : '종료됨'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    ref={svgContainerRef}
                    className="rounded-lg p-4 bg-gray-50 w-full"
                    style={{ maxWidth: '750px', aspectRatio: '3 / 2' }}
                  >
                    {renderWordCloudSVG()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
