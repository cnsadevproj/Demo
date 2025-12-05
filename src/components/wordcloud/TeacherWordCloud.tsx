// src/components/wordcloud/TeacherWordCloud.tsx
// 선생님용 워드클라우드 컴포넌트

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Plus, Pencil, X, Loader2, Trash2, Power, PowerOff } from 'lucide-react';
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

  const getFontSize = (count: number) => {
    const minSize = 16;
    const maxSize = 48;
    const ratio = count / maxCount;
    return minSize + (maxSize - minSize) * ratio;
  };

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
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{selectedSession.title}</span>
                  <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'}>
                    {selectedSession.status === 'active' ? '진행 중' : '종료됨'}
                  </Badge>
                </CardTitle>
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
