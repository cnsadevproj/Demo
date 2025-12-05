// src/components/wordcloud/StudentWordCloud.tsx
// 학생용 워드클라우드 컴포넌트

import React, { useState, useEffect } from 'react';
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

        // 같은 학생이 같은 단어를 여러 번 제출해도 1번만 카운트
        if (!data.students.has(response.studentCode)) {
          data.students.add(response.studentCode);
          data.count++;
        }
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

  // 빈도에 따른 폰트 크기 계산
  const getFontSize = (count: number) => {
    const minSize = 16;
    const maxSize = 48;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

  // 빈도에 따른 색상
  const getColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio > 0.7) return 'text-purple-600';
    if (ratio > 0.4) return 'text-blue-600';
    if (ratio > 0.2) return 'text-green-600';
    return 'text-gray-600';
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
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">진행 중인 워드클라우드가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 세션 선택 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => setSelectedSession(session)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
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
              <CardTitle className="text-lg">단어 입력하기</CardTitle>
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
                <CardTitle className="text-lg">내가 제출한 단어</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {myWords.map((word) => (
                    <div
                      key={word.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full"
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
              <CardTitle className="text-lg">워드클라우드 결과</CardTitle>
              <p className="text-sm text-gray-500">총 {allResponses.length}명 참여</p>
            </CardHeader>
            <CardContent>
              {wordCloudData.length > 0 ? (
                <div className="flex flex-wrap gap-4 justify-center items-center min-h-[200px] p-6">
                  {wordCloudData.map((item, index) => (
                    <div
                      key={index}
                      className={`font-bold transition-transform hover:scale-110 cursor-default ${getColor(
                        item.count
                      )}`}
                      style={{ fontSize: `${getFontSize(item.count)}px` }}
                      title={`${item.count}명이 선택`}
                    >
                      {item.word}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  아직 제출된 단어가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
