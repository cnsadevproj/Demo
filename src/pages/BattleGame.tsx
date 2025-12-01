import React, { useState, useMemo } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';
import {
  GameTeam,
  BattleBet,
  BattleResult,
  GameSettlement,
  calculateWinProbability,
  DEFAULT_GAME_SETTINGS,
  LossMechanism,
  LOSS_MECHANISM_INFO,
  getLossMechanismSettings,
} from '../types/game';
import { createBattle, endBattle, Battle } from '../services/firestoreApi';
import { toast } from 'sonner';
import {
  Swords,
  Shield,
  Cookie,
  Trophy,
  Target,
  Dices,
  Play,
  RotateCcw,
  Crown,
  Skull,
  ArrowRight,
  Check,
  X,
  Save,
} from 'lucide-react';

interface BattleGameProps {
  onBack?: () => void;
}

type GamePhase = 'setup' | 'betting' | 'reveal' | 'battle' | 'results' | 'finished';

export function BattleGame({ onBack }: BattleGameProps) {
  const { teams, settings, addBonusCookies } = useGame();
  const { user, selectedClass } = useAuth();

  // Firebase 저장 상태
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 게임 상태
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [roundNumber, setRoundNumber] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [lossMechanism, setLossMechanism] = useState<LossMechanism>('standard');

  // 현재 손실 메커니즘 설정
  const currentSettings = {
    ...settings,
    ...getLossMechanismSettings(lossMechanism),
  };

  // 팀별 현재 쿠키 (게임용)
  const [teamCookies, setTeamCookies] = useState<Map<string, number>>(new Map());

  // 배팅 상태
  const [bets, setBets] = useState<Map<string, BattleBet>>(new Map());
  const [currentBettingTeam, setCurrentBettingTeam] = useState<string | null>(null);
  const [attackTarget, setAttackTarget] = useState<string | null>(null);
  const [attackBet, setAttackBet] = useState(0);
  const [defenseBet, setDefenseBet] = useState(0);

  // 배틀 결과
  const [battleResults, setBattleResults] = useState<BattleResult[]>([]);
  const [allRoundResults, setAllRoundResults] = useState<BattleResult[][]>([]);

  // 최종 결과
  const [settlements, setSettlements] = useState<GameSettlement[]>([]);

  // 활성 팀 (쿠키 0 이상)
  const activeTeams = useMemo(() => {
    return teams.filter(t => (teamCookies.get(t.id) ?? t.totalCookies) > 0);
  }, [teams, teamCookies]);

  // 게임 시작
  const handleStartGame = () => {
    const initialCookies = new Map<string, number>();
    teams.forEach(t => {
      initialCookies.set(t.id, t.totalCookies);
    });
    setTeamCookies(initialCookies);
    setBets(new Map());
    setBattleResults([]);
    setAllRoundResults([]);
    setRoundNumber(1);
    setPhase('betting');
    setCurrentBettingTeam(teams[0]?.id || null);
  };

  // 팀 쿠키 조회
  const getTeamCookies = (teamId: string) => {
    return teamCookies.get(teamId) ?? teams.find(t => t.id === teamId)?.totalCookies ?? 0;
  };

  // 배팅 제출
  const handleSubmitBet = () => {
    if (!currentBettingTeam) return;

    const totalBet = attackBet + defenseBet;
    const available = getTeamCookies(currentBettingTeam);

    if (totalBet > available) {
      alert('보유 쿠키보다 많이 배팅할 수 없습니다!');
      return;
    }

    const bet: BattleBet = {
      teamId: currentBettingTeam,
      attackTargetId: attackTarget,
      attackBet,
      defenseBet,
    };

    setBets(prev => new Map(prev).set(currentBettingTeam, bet));

    // 다음 팀으로
    const currentIndex = activeTeams.findIndex(t => t.id === currentBettingTeam);
    if (currentIndex < activeTeams.length - 1) {
      setCurrentBettingTeam(activeTeams[currentIndex + 1].id);
      setAttackTarget(null);
      setAttackBet(0);
      setDefenseBet(0);
    } else {
      // 모든 팀 배팅 완료
      setPhase('reveal');
    }
  };

  // 배틀 실행
  const handleExecuteBattles = () => {
    const results: BattleResult[] = [];
    const attackedTeams = new Set<string>();

    // 공격 배틀 처리
    bets.forEach((bet, attackerId) => {
      if (!bet.attackTargetId || bet.attackBet === 0) return;

      const defenderBet = bets.get(bet.attackTargetId);
      if (!defenderBet) return;

      attackedTeams.add(bet.attackTargetId);

      const winProb = calculateWinProbability(
        bet.attackBet,
        defenderBet.defenseBet,
        settings
      );

      const diceRoll = Math.floor(Math.random() * 100) + 1;
      const attackerWon = diceRoll <= winProb;

      const cookieTransfer = attackerWon
        ? Math.floor(defenderBet.defenseBet * settings.winnerTakePercent / 100)
        : bet.attackBet;

      results.push({
        attackerId,
        defenderId: bet.attackTargetId,
        attackerBet: bet.attackBet,
        defenderBet: defenderBet.defenseBet,
        winProbability: winProb,
        diceRoll,
        attackerWon,
        cookieTransfer,
      });
    });

    setBattleResults(results);
    setPhase('battle');
  };

  // 결과 정산
  const handleSettleRound = () => {
    const newCookies = new Map(teamCookies);

    // 배틀 결과 적용
    battleResults.forEach(result => {
      if (result.attackerWon) {
        // 공격 성공: 공격자는 유지, 방어자는 방어배팅 잃고 30%는 공격자에게
        const defenderCookies = newCookies.get(result.defenderId) || 0;
        newCookies.set(result.defenderId, defenderCookies - result.defenderBet);

        const attackerCookies = newCookies.get(result.attackerId) || 0;
        newCookies.set(result.attackerId, attackerCookies + result.cookieTransfer);
      } else {
        // 공격 실패: 공격자는 공격배팅 잃음, 방어자는 30% 획득
        const attackerCookies = newCookies.get(result.attackerId) || 0;
        newCookies.set(result.attackerId, attackerCookies - result.attackerBet);

        const defenderCookies = newCookies.get(result.defenderId) || 0;
        const defenderGain = Math.floor(result.attackerBet * currentSettings.winnerTakePercent / 100);
        newCookies.set(result.defenderId, defenderCookies + defenderGain);
      }
    });

    // 공격 안 받은 팀의 방어 페널티 (50%)
    const attackedTeams = new Set(battleResults.map(r => r.defenderId));
    bets.forEach((bet, teamId) => {
      if (!attackedTeams.has(teamId) && bet.defenseBet > 0) {
        const penalty = Math.floor(bet.defenseBet * settings.unusedDefensePenalty / 100);
        const current = newCookies.get(teamId) || 0;
        newCookies.set(teamId, current - penalty);
      }
    });

    setTeamCookies(newCookies);
    setAllRoundResults(prev => [...prev, battleResults]);

    // 다음 라운드 또는 종료
    if (roundNumber >= totalRounds) {
      // 최종 정산
      const finalSettlements: GameSettlement[] = teams.map(team => {
        const startCookies = team.totalCookies;
        const finalCookies = newCookies.get(team.id) || 0;

        // 승패 계산
        let wins = 0, losses = 0, won = 0, lost = 0;
        allRoundResults.flat().concat(battleResults).forEach(r => {
          if (r.attackerId === team.id) {
            if (r.attackerWon) {
              wins++;
              won += r.cookieTransfer;
            } else {
              losses++;
              lost += r.attackerBet;
            }
          }
          if (r.defenderId === team.id) {
            if (!r.attackerWon) {
              wins++;
              won += Math.floor(r.attackerBet * settings.winnerTakePercent / 100);
            } else {
              losses++;
              lost += r.defenderBet;
            }
          }
        });

        return {
          teamId: team.id,
          teamName: team.name,
          startCookies,
          totalWins: wins,
          totalLosses: losses,
          cookiesWon: won,
          cookiesLost: lost,
          defensePenalty: 0,
          finalCookies,
          rank: 0,
        };
      });

      // 순위 매기기
      finalSettlements.sort((a, b) => b.finalCookies - a.finalCookies);
      finalSettlements.forEach((s, i) => {
        s.rank = i + 1;
      });

      setSettlements(finalSettlements);
      setPhase('finished');
    } else {
      // 다음 라운드
      setRoundNumber(prev => prev + 1);
      setBets(new Map());
      setBattleResults([]);
      setPhase('betting');
      setCurrentBettingTeam(activeTeams.filter(t => (newCookies.get(t.id) || 0) > 0)[0]?.id || null);
      setAttackTarget(null);
      setAttackBet(0);
      setDefenseBet(0);
    }
  };

  // 게임 리셋
  const handleResetGame = () => {
    setPhase('setup');
    setRoundNumber(1);
    setTeamCookies(new Map());
    setBets(new Map());
    setBattleResults([]);
    setAllRoundResults([]);
    setSettlements([]);
    setCurrentBettingTeam(null);
    setAttackTarget(null);
    setAttackBet(0);
    setDefenseBet(0);
    setIsSaved(false);
  };

  // 배틀 결과 Firebase에 저장
  const handleSaveBattleResults = async () => {
    if (!user?.uid || !selectedClass || settlements.length === 0) {
      toast.error('저장할 수 없습니다. 로그인 정보를 확인하세요.');
      return;
    }

    setIsSaving(true);
    try {
      // 최종 순위 1, 2위 팀
      const sortedSettlements = [...settlements].sort((a, b) => a.rank - b.rank);
      const winner = sortedSettlements[0];
      const runnerUp = sortedSettlements[1];

      if (!winner || !runnerUp) {
        toast.error('팀 정보가 충분하지 않습니다.');
        setIsSaving(false);
        return;
      }

      // 배틀 제목 생성
      const today = new Date().toLocaleDateString('ko-KR');
      const title = `${today} 쿠키 배틀 (${totalRounds}라운드)`;
      const description = `손실 메커니즘: ${LOSS_MECHANISM_INFO[lossMechanism].name} | 참가팀: ${teams.length}팀`;

      // 배틀 생성 및 저장
      const battleId = await createBattle(
        user.uid,
        selectedClass,
        title,
        description,
        winner.teamId,
        runnerUp.teamId,
        winner.finalCookies - winner.startCookies // 승자의 쿠키 변화량을 보상으로 기록
      );

      // 배틀 종료 처리 (승자 기록)
      await endBattle(user.uid, selectedClass, battleId, winner.teamId);

      setIsSaved(true);
      toast.success('배틀 결과가 저장되었습니다! 🎉');
    } catch (error) {
      console.error('배틀 결과 저장 실패:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 현재 배팅 중인 팀 정보
  const currentTeam = teams.find(t => t.id === currentBettingTeam);
  const currentTeamCookies = currentBettingTeam ? getTeamCookies(currentBettingTeam) : 0;

  return (
    <PageLayout title="쿠키 배틀" role="admin" showBack onBack={onBack}>
      <div className="space-y-6">
        {/* 게임 헤더 */}
        <Card className="p-6 bg-gradient-to-r from-red-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white mb-2">쿠키 배틀</h2>
              <p className="text-red-100">
                {phase === 'setup' && '게임을 시작하세요'}
                {phase === 'betting' && `라운드 ${roundNumber}/${totalRounds} - 배팅 중`}
                {phase === 'reveal' && '배팅 공개'}
                {phase === 'battle' && '배틀 진행 중'}
                {phase === 'results' && '라운드 결과'}
                {phase === 'finished' && '게임 종료!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Swords className="w-8 h-8" />
            </div>
          </div>
        </Card>

        {/* 셋업 페이즈 */}
        {phase === 'setup' && (
          <Card>
            <CardHeader>
              <CardTitle>게임 설정</CardTitle>
              <CardDescription>
                {teams.length}개 팀이 배틀에 참가합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm mb-2">총 라운드 수</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Button
                      key={n}
                      variant={totalRounds === n ? 'default' : 'outline'}
                      onClick={() => setTotalRounds(n)}
                    >
                      {n}라운드
                    </Button>
                  ))}
                </div>
              </div>

              {/* 손실 메커니즘 선택 */}
              <div>
                <label className="block text-sm mb-2">손실 메커니즘</label>
                <div className="space-y-2">
                  {(Object.keys(LOSS_MECHANISM_INFO) as LossMechanism[]).map(mechanism => (
                    <button
                      key={mechanism}
                      onClick={() => setLossMechanism(mechanism)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        lossMechanism === mechanism
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{LOSS_MECHANISM_INFO[mechanism].name}</div>
                      <div className="text-sm text-gray-600">
                        {LOSS_MECHANISM_INFO[mechanism].description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 참가 팀 목록 */}
              <div>
                <h4 className="text-sm font-medium mb-2">참가 팀</h4>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{team.flag}</span>
                        <span>{team.name}</span>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800">
                        <Cookie className="w-3 h-3 mr-1" />
                        {team.totalCookies}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleStartGame}
                disabled={teams.length < 2}
                className="w-full"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                게임 시작!
              </Button>

              {teams.length < 2 && (
                <p className="text-red-500 text-sm text-center">
                  최소 2개 팀이 필요합니다
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* 배팅 페이즈 */}
        {phase === 'betting' && currentTeam && (
          <div className="space-y-4">
            {/* 현재 팀 정보 */}
            <Card className="border-2 border-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">{currentTeam.flag}</span>
                  {currentTeam.name}의 차례
                </CardTitle>
                <CardDescription>
                  보유 쿠키: {currentTeamCookies} | 남은 팀: {activeTeams.length - Array.from(bets.keys()).length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 공격 대상 선택 */}
                <div>
                  <h4 className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-red-500" />
                    공격 대상 선택
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {activeTeams
                      .filter(t => t.id !== currentBettingTeam)
                      .map(team => (
                        <Button
                          key={team.id}
                          variant={attackTarget === team.id ? 'default' : 'outline'}
                          onClick={() => setAttackTarget(team.id)}
                          className="justify-start"
                        >
                          <span className="text-xl mr-2">{team.flag}</span>
                          {team.name}
                          <Badge variant="secondary" className="ml-auto">
                            {getTeamCookies(team.id)}
                          </Badge>
                        </Button>
                      ))}
                    <Button
                      variant={attackTarget === null ? 'default' : 'outline'}
                      onClick={() => setAttackTarget(null)}
                      className="border-dashed"
                    >
                      공격 안함
                    </Button>
                  </div>
                </div>

                {/* 배팅 금액 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 공격 배팅 */}
                  <div>
                    <h4 className="flex items-center gap-2 mb-2">
                      <Swords className="w-4 h-4 text-red-500" />
                      공격 배팅
                    </h4>
                    <input
                      type="number"
                      value={attackBet}
                      onChange={e => setAttackBet(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={!attackTarget}
                      className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100"
                      placeholder="0"
                    />
                  </div>

                  {/* 방어 배팅 */}
                  <div>
                    <h4 className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      방어 배팅
                    </h4>
                    <input
                      type="number"
                      value={defenseBet}
                      onChange={e => setDefenseBet(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 남은 쿠키 */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>보유 쿠키</span>
                    <span>{currentTeamCookies}</span>
                  </div>
                  <div className="flex justify-between mb-2 text-red-600">
                    <span>공격 배팅</span>
                    <span>-{attackBet}</span>
                  </div>
                  <div className="flex justify-between mb-2 text-blue-600">
                    <span>방어 배팅</span>
                    <span>-{defenseBet}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold">
                    <span>남은 쿠키</span>
                    <span className={currentTeamCookies - attackBet - defenseBet < 0 ? 'text-red-600' : ''}>
                      {currentTeamCookies - attackBet - defenseBet}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitBet}
                  disabled={attackBet + defenseBet > currentTeamCookies}
                  className="w-full"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  배팅 확정
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 배팅 공개 페이즈 */}
        {phase === 'reveal' && (
          <Card>
            <CardHeader>
              <CardTitle>배팅 공개!</CardTitle>
              <CardDescription>
                모든 팀의 배팅이 완료되었습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from(bets.entries()).map(([teamId, bet]) => {
                const team = teams.find(t => t.id === teamId);
                const targetTeam = bet.attackTargetId
                  ? teams.find(t => t.id === bet.attackTargetId)
                  : null;

                return (
                  <div
                    key={teamId}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{team?.flag}</span>
                        <span className="font-medium">{team?.name}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-red-600">
                        <Swords className="w-4 h-4" />
                        {targetTeam ? (
                          <>
                            {targetTeam.flag} {targetTeam.name}
                            <Badge variant="destructive">{bet.attackBet}</Badge>
                          </>
                        ) : (
                          <span className="text-gray-400">공격 안함</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-blue-600">
                        <Shield className="w-4 h-4" />
                        방어
                        <Badge className="bg-blue-100 text-blue-800">{bet.defenseBet}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button onClick={handleExecuteBattles} className="w-full" size="lg">
                <Dices className="w-5 h-5 mr-2" />
                배틀 실행!
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 배틀 결과 페이즈 */}
        {phase === 'battle' && (
          <Card>
            <CardHeader>
              <CardTitle>배틀 결과</CardTitle>
              <CardDescription>
                라운드 {roundNumber} 결과
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {battleResults.map((result, idx) => {
                const attacker = teams.find(t => t.id === result.attackerId);
                const defender = teams.find(t => t.id === result.defenderId);

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      result.attackerWon ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    } border`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{attacker?.flag}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span className="text-2xl">{defender?.flag}</span>
                      </div>
                      <Badge variant={result.attackerWon ? 'default' : 'destructive'}>
                        {result.attackerWon ? '공격 성공!' : '방어 성공!'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm text-center">
                      <div>
                        <p className="text-gray-500">공격</p>
                        <p className="font-bold text-red-600">{result.attackerBet}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">방어</p>
                        <p className="font-bold text-blue-600">{result.defenderBet}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">주사위</p>
                        <p className="font-bold">
                          {result.diceRoll} / {Math.round(result.winProbability)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t text-center">
                      {result.attackerWon ? (
                        <span className="text-green-600">
                          {attacker?.name} +{result.cookieTransfer} 획득!
                        </span>
                      ) : (
                        <span className="text-blue-600">
                          {defender?.name} +{Math.floor(result.attackerBet * settings.winnerTakePercent / 100)} 획득!
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {battleResults.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  이번 라운드에 배틀이 없습니다
                </p>
              )}

              <Button onClick={handleSettleRound} className="w-full" size="lg">
                {roundNumber >= totalRounds ? '최종 결과 보기' : '다음 라운드'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 최종 결과 */}
        {phase === 'finished' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                최종 결과
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settlements.map((settlement, idx) => {
                const team = teams.find(t => t.id === settlement.teamId);
                const isWinner = settlement.rank === 1;
                const cookieChange = settlement.finalCookies - settlement.startCookies;

                return (
                  <div
                    key={settlement.teamId}
                    className={`p-4 rounded-lg border-2 ${
                      isWinner
                        ? 'bg-yellow-50 border-yellow-400'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-gray-400">
                          #{settlement.rank}
                        </span>
                        <span className="text-3xl">{team?.flag}</span>
                        <span className="font-semibold text-lg">{settlement.teamName}</span>
                        {isWinner && <Crown className="w-6 h-6 text-yellow-500" />}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xl font-bold">
                          <Cookie className="w-5 h-5 text-amber-500" />
                          {settlement.finalCookies}
                        </div>
                        <span className={`text-sm ${cookieChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {cookieChange >= 0 ? '+' : ''}{cookieChange}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-center mt-2">
                      <div>
                        <span className="text-gray-500">승리</span>
                        <p className="font-bold text-green-600">{settlement.totalWins}회</p>
                      </div>
                      <div>
                        <span className="text-gray-500">패배</span>
                        <p className="font-bold text-red-600">{settlement.totalLosses}회</p>
                      </div>
                      <div>
                        <span className="text-gray-500">시작</span>
                        <p className="font-bold">{settlement.startCookies}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-2">
                {!isSaved && (
                  <Button
                    onClick={handleSaveBattleResults}
                    disabled={isSaving}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    size="lg"
                  >
                    {isSaving ? (
                      <>저장 중...</>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        결과 저장
                      </>
                    )}
                  </Button>
                )}
                {isSaved && (
                  <div className="flex-1 flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-lg">
                    <Check className="w-5 h-5 mr-2" />
                    저장 완료!
                  </div>
                )}
                <Button onClick={handleResetGame} className="flex-1" variant="outline" size="lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  새 게임
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 팀 현황 (게임 중) */}
        {phase !== 'setup' && phase !== 'finished' && (
          <Card>
            <CardHeader>
              <CardTitle>팀 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {teams.map(team => {
                  const cookies = getTeamCookies(team.id);
                  const hasBet = bets.has(team.id);
                  const isEliminated = cookies <= 0;

                  return (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg ${
                        isEliminated
                          ? 'bg-gray-100 opacity-50'
                          : hasBet
                          ? 'bg-green-50'
                          : 'bg-white border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{team.flag}</span>
                          <span className="text-sm">{team.name}</span>
                          {isEliminated && <Skull className="w-4 h-4 text-gray-400" />}
                        </div>
                        <Badge variant={isEliminated ? 'secondary' : 'default'}>
                          {cookies}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
