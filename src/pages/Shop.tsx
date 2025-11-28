import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../contexts/AuthContext';
import {
  ShoppingBag,
  Cookie,
  Check,
  Lock,
  Sparkles,
  Palette,
  Type,
  Square,
  Image,
  Tag,
} from 'lucide-react';
import {
  getShopItems,
  getStudent,
  purchaseItem,
  SheetShopItem,
  SheetStudent,
} from '../services/sheetsApi';
import {
  ItemCategory,
  ALL_SHOP_ITEMS,
  getItemByCode,
} from '../types/shop';

interface ShopProps {
  onBack?: () => void;
}

// 카테고리 정보
const CATEGORIES: { key: ItemCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'emoji', label: '이모지', icon: <Sparkles className="w-4 h-4" /> },
  { key: 'border', label: '테두리', icon: <Square className="w-4 h-4" /> },
  { key: 'nameEffect', label: '이름효과', icon: <Type className="w-4 h-4" /> },
  { key: 'background', label: '배경', icon: <Image className="w-4 h-4" /> },
  { key: 'titleColor', label: '칭호색상', icon: <Tag className="w-4 h-4" /> },
];

export function Shop({ onBack }: ShopProps) {
  const { user, selectedClass, isTeacher } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('emoji');
  const [student, setStudent] = useState<SheetStudent | null>(null);
  const [shopItems, setShopItems] = useState<SheetShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      if (!user?.code || !selectedClass) return;

      setLoading(true);
      try {
        const [studentData, items] = await Promise.all([
          getStudent(user.code, selectedClass),
          getShopItems(),
        ]);

        setStudent(studentData);
        setShopItems(items.length > 0 ? items : ALL_SHOP_ITEMS);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.code, selectedClass]);

  // 카테고리별 아이템 필터링
  const categoryItems = shopItems.filter(item => item.category === selectedCategory);

  // 아이템 구매
  const handlePurchase = async (itemCode: string) => {
    if (!user?.code || !selectedClass || !student) return;

    setPurchasing(itemCode);
    setMessage(null);

    try {
      const result = await purchaseItem(selectedClass, user.code, itemCode);

      if (result.success) {
        setMessage({ type: 'success', text: '구매 완료!' });
        // 학생 정보 다시 로드
        const updatedStudent = await getStudent(user.code, selectedClass);
        setStudent(updatedStudent);
      } else {
        setMessage({ type: 'error', text: result.message || '구매에 실패했습니다.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '오류가 발생했습니다.' });
    } finally {
      setPurchasing(null);
      // 메시지 자동 숨김
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 아이템 상태 확인
  const getItemStatus = (item: SheetShopItem) => {
    if (!student) return { owned: false, canBuy: false };

    const owned = student.ownedItems.includes(item.code);
    const canBuy = !owned && student.totalCookie >= item.price;

    return { owned, canBuy };
  };

  // 사용 가능 쿠키 (총쿠키 - 사용쿠키)
  const availableCookies = student ? student.totalCookie - student.usedCookie : 0;

  if (isTeacher) {
    return (
      <PageLayout title="상점" role="admin" showBack onBack={onBack}>
        <Card>
          <CardContent className="pt-6 text-center">
            <Palette className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">상점은 학생 전용입니다.</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="상점" role="student" showBack onBack={onBack}>
      <div className="space-y-4">
        {/* 쿠키 정보 */}
        <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Cookie className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm text-amber-100">사용 가능한 쿠키</p>
                  <p className="text-2xl font-bold">{availableCookies}</p>
                </div>
              </div>
              <div className="text-right text-sm text-amber-100">
                <p>총 누적: {student?.totalCookie || 0}</p>
                <p>사용함: {student?.usedCookie || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메시지 */}
        {message && (
          <div
            className={`p-3 rounded-lg text-center font-medium ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 카테고리 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* 아이템 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              {CATEGORIES.find(c => c.key === selectedCategory)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                로딩 중...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categoryItems.map(item => {
                  const { owned, canBuy } = getItemStatus(item);
                  const localItem = getItemByCode(item.code);
                  const displayValue = localItem?.value || item.value;

                  return (
                    <div
                      key={item.code}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        owned
                          ? 'border-green-300 bg-green-50'
                          : canBuy
                          ? 'border-purple-200 bg-white hover:border-purple-400 hover:shadow-md'
                          : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      {/* 보유 중 배지 */}
                      {owned && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          보유중
                        </Badge>
                      )}

                      {/* 아이템 미리보기 */}
                      <div className="text-center mb-3">
                        {selectedCategory === 'emoji' && (
                          <span className="text-4xl">{displayValue}</span>
                        )}
                        {selectedCategory === 'border' && (
                          <div
                            className={`w-16 h-16 mx-auto rounded-lg border-4 ${
                              displayValue === 'none'
                                ? 'border-transparent bg-gray-100'
                                : displayValue === 'solid'
                                ? 'border-gray-400 bg-gray-100'
                                : displayValue.startsWith('gradient')
                                ? 'border-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'
                                : displayValue.startsWith('neon')
                                ? `border-4 ${
                                    displayValue === 'neon-blue'
                                      ? 'border-blue-400 shadow-lg shadow-blue-400/50'
                                      : displayValue === 'neon-pink'
                                      ? 'border-pink-400 shadow-lg shadow-pink-400/50'
                                      : 'border-green-400 shadow-lg shadow-green-400/50'
                                  } bg-gray-100`
                                : 'border-purple-400 bg-gray-100'
                            }`}
                          />
                        )}
                        {selectedCategory === 'nameEffect' && (
                          <span
                            className={`text-xl font-bold ${
                              displayValue === 'none'
                                ? ''
                                : displayValue.includes('rainbow')
                                ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent'
                                : displayValue.includes('fire')
                                ? 'bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent'
                                : displayValue.includes('gold')
                                ? 'text-yellow-500 drop-shadow-lg'
                                : displayValue.includes('glow')
                                ? 'text-blue-500 drop-shadow-lg'
                                : ''
                            }`}
                          >
                            홍길동
                          </span>
                        )}
                        {selectedCategory === 'background' && (
                          <div
                            className={`w-16 h-16 mx-auto rounded-lg ${
                              displayValue === 'none'
                                ? 'bg-white border'
                                : displayValue === 'dots'
                                ? 'bg-[radial-gradient(circle,_#ddd_1px,_transparent_1px)] bg-[length:8px_8px]'
                                : displayValue === 'stars'
                                ? 'bg-gradient-to-br from-indigo-100 to-purple-100'
                                : displayValue === 'hearts'
                                ? 'bg-gradient-to-br from-pink-100 to-red-100'
                                : 'bg-gradient-to-br from-gray-100 to-gray-200'
                            }`}
                          />
                        )}
                        {selectedCategory === 'titleColor' && (
                          <Badge
                            className={`${
                              ['0', '1', '2', '3', '4'].includes(displayValue)
                                ? [
                                    'bg-red-100 text-red-800',
                                    'bg-orange-100 text-orange-800',
                                    'bg-yellow-100 text-yellow-800',
                                    'bg-green-100 text-green-800',
                                    'bg-blue-100 text-blue-800',
                                  ][parseInt(displayValue)]
                                : displayValue === '5'
                                ? 'bg-purple-100 text-purple-800'
                                : displayValue === '8'
                                ? 'bg-yellow-200 text-yellow-900'
                                : displayValue === '9'
                                ? 'bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 text-white'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            칭호
                          </Badge>
                        )}
                      </div>

                      {/* 아이템 이름 */}
                      <p className="text-center font-medium text-sm mb-2">{item.name}</p>

                      {/* 가격 / 구매 버튼 */}
                      {owned ? (
                        <div className="text-center text-sm text-green-600">
                          보유 중
                        </div>
                      ) : item.price === 0 ? (
                        <div className="text-center text-sm text-gray-500">무료</div>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full"
                          variant={canBuy ? 'default' : 'outline'}
                          disabled={!canBuy || purchasing === item.code}
                          onClick={() => handlePurchase(item.code)}
                        >
                          {purchasing === item.code ? (
                            '구매 중...'
                          ) : canBuy ? (
                            <>
                              <Cookie className="w-3 h-3 mr-1" />
                              {item.price}
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 mr-1" />
                              {item.price}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 안내 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <strong>안내:</strong> 구매한 아이템은 마이페이지에서 프로필에 적용할 수 있습니다.
              쿠키는 다했니를 통해 누적된 총 쿠키로 구매합니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
