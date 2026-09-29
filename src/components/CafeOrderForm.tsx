/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { DRINK_MENU, SIZE_OPTIONS, ADDON_OPTIONS } from '../data/cafeData.ts';
import { CafeOrder } from '../types.ts';
import { CheckCircle2, AlertCircle, RotateCcw, Coffee, Sparkles, Loader2 } from 'lucide-react';

interface CafeOrderFormProps {
  onOrderCreated?: (order: any) => Promise<CafeOrder | void> | void;
}

export const CafeOrderForm: React.FC<CafeOrderFormProps> = ({ onOrderCreated }) => {
  // ==========================================
  // 1. 주문서 입력 상태 관리 (React State)
  // ==========================================
  // 고객명 (필수, text)
  const [customerName, setCustomerName] = useState<string>('');
  // 전화번호 (tel)
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  // 선택된 음료 ID (드롭다운)
  const [selectedDrinkId, setSelectedDrinkId] = useState<string>('');
  // 사이즈 ('S' | 'M' | 'L', 기본값: 'M')
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('M');
  // 추가 옵션 목록 (체크박스 다중 선택)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  // 수량 (기본값: 1, 최소: 1, 최대: 10)
  const [quantity, setQuantity] = useState<number>(1);
  // 요청사항 (textarea)
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // 유효성 검사 에러 메시지
  const [errorMessage, setErrorMessage] = useState<string>('');
  // 주문 완료 확인 메시지 (성공 시 노출)
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  // 최근 접수된 주문 상세 (영수증 스타일 표시용)
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<CafeOrder | null>(null);
  // 주문 등록 처리 중 상태
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ==========================================
  // 2. 실시간 예상 금액 계산 로직 (useMemo)
  // ==========================================
  const currentDrink = useMemo(() => {
    return DRINK_MENU.find((drink) => drink.id === selectedDrinkId) || null;
  }, [selectedDrinkId]);

  const currentSizeOption = useMemo(() => {
    return SIZE_OPTIONS.find((s) => s.id === selectedSize) || SIZE_OPTIONS[1];
  }, [selectedSize]);

  // 선택된 추가 옵션의 총 금액 계산
  const optionsTotalExtraPrice = useMemo(() => {
    return selectedOptions.reduce((acc, optId) => {
      const found = ADDON_OPTIONS.find((opt) => opt.id === optId);
      return acc + (found ? found.extraPrice : 0);
    }, 0);
  }, [selectedOptions]);

  // 1잔당 단가 (음료 기본가 + 사이즈 추가금 + 옵션 추가금)
  const unitPrice = useMemo(() => {
    if (!currentDrink) return 0;
    return currentDrink.price + currentSizeOption.extraPrice + optionsTotalExtraPrice;
  }, [currentDrink, currentSizeOption, optionsTotalExtraPrice]);

  // 최종 예상 금액: 1잔당 단가 * 수량
  const estimatedTotalPrice = useMemo(() => {
    return unitPrice * quantity;
  }, [unitPrice, quantity]);

  // ==========================================
  // 3. 이벤트 핸들러
  // ==========================================
  // 체크박스 옵션 토글 핸들러
  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  // 수량 변경 핸들러 (최소 1, 최대 10 제한)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setQuantity(1);
    } else {
      const clamped = Math.max(1, Math.min(10, val));
      setQuantity(clamped);
    }
  };

  // 다시 작성 (초기화) 버튼 핸들러
  const handleReset = () => {
    setCustomerName('');
    setPhoneNumber('');
    setSelectedDrinkId('');
    setSelectedSize('M');
    setSelectedOptions([]);
    setQuantity(1);
    setSpecialRequests('');
    setErrorMessage('');
    setConfirmationMessage('');
    setLastSubmittedOrder(null);
  };

  // 주문하기 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 유효성 검사 1: 이름이 비어있는 경우
    if (!customerName.trim()) {
      setErrorMessage('이름을 입력해주세요.');
      setConfirmationMessage('');
      const nameInput = document.getElementById('customerName');
      nameInput?.focus();
      return;
    }

    // 유효성 검사 2: 음료를 선택하지 않은 경우
    if (!selectedDrinkId || !currentDrink) {
      setErrorMessage('음료를 선택해주세요.');
      setConfirmationMessage('');
      const drinkSelect = document.getElementById('drinkSelect');
      drinkSelect?.focus();
      return;
    }

    // 선택된 옵션 명칭 배열 생성
    const selectedOptionNames = selectedOptions
      .map((optId) => ADDON_OPTIONS.find((o) => o.id === optId)?.name)
      .filter((name): name is string => Boolean(name));

    // 옵션 텍스트 조합 (예: "(샷 추가, 크림 추가)")
    const optionText =
      selectedOptionNames.length > 0
        ? ` (${selectedOptionNames.join(', ')})`
        : '';

    // 주문 확인 메시지 형식
    const formattedPrice = estimatedTotalPrice.toLocaleString();
    const successMsg = `${customerName.trim()}님, ${currentDrink.name} ${selectedSize}사이즈${optionText} ${quantity}잔, 총 ${formattedPrice}원 주문이 접수되었습니다!`;

    // 새 주문 객체 생성
    const newOrder: CafeOrder = {
      id: `ord-${Date.now()}`,
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim() || '미입력',
      drinkName: currentDrink.name,
      drinkPrice: currentDrink.price,
      size: selectedSize,
      sizeExtraPrice: currentSizeOption.extraPrice,
      options: selectedOptionNames,
      optionsExtraPrice: optionsTotalExtraPrice,
      quantity,
      specialRequests: specialRequests.trim(),
      totalPrice: estimatedTotalPrice,
      status: '접수완료',
      createdAt: '방금 전',
    };

    try {
      setIsSubmitting(true);
      let created: any = null;
      if (onOrderCreated) {
        created = await onOrderCreated(newOrder);
      }
      const finalOrder = (created && created.id) ? created : newOrder;
      setConfirmationMessage(successMsg);
      setLastSubmittedOrder(finalOrder);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMessage(`주문 등록에 실패했습니다: ${err.message || '다시 시도해주세요.'}`);
      setConfirmationMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#ffffff] rounded-2xl shadow-md border border-[#ebdccf] p-6 space-y-6"
    >
      {/* 안내 알림 배너 (에러 발생 시) */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 bg-[#fdf2f2] text-[#991b1b] border border-[#fecaca] rounded-lg text-sm font-medium animate-fadeIn"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#dc2626]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. 이름 입력 필드 (필수) */}
      <div>
        <label
          htmlFor="customerName"
          className="block text-sm font-bold text-[#4a2e1b] mb-1.5"
        >
          1. 이름 <span className="text-[#dc2626]">*</span>
        </label>
        <input
          id="customerName"
          type="text"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            if (errorMessage) setErrorMessage('');
          }}
          placeholder="주문하시는 분의 성함을 입력해주세요"
          className="cafe-input"
          required
        />
      </div>

      {/* 2. 전화번호 입력 필드 */}
      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-bold text-[#4a2e1b] mb-1.5"
        >
          2. 전화번호
        </label>
        <input
          id="phoneNumber"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="010-1234-5678"
          className="cafe-input"
        />
      </div>

      {/* 3. 음료 선택 드롭다운 */}
      <div>
        <label
          htmlFor="drinkSelect"
          className="block text-sm font-bold text-[#4a2e1b] mb-1.5"
        >
          3. 음료 선택 <span className="text-[#dc2626]">*</span>
        </label>
        <div className="relative">
          <select
            id="drinkSelect"
            value={selectedDrinkId}
            onChange={(e) => {
              setSelectedDrinkId(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
            className="cafe-input appearance-none bg-white pr-10 cursor-pointer"
          >
            <option value="">-- 음료를 선택해주세요 --</option>
            {DRINK_MENU.map((drink) => (
              <option key={drink.id} value={drink.id}>
                {drink.name} {drink.price.toLocaleString()}원
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#6b4226]">
            <Coffee className="w-4 h-4 opacity-70" />
          </div>
        </div>
      </div>

      {/* 4. 사이즈 라디오 버튼 (가로 배치) */}
      <div>
        <label className="block text-sm font-bold text-[#4a2e1b] mb-2">
          4. 사이즈 (가로 배치)
        </label>
        <div className="flex flex-wrap items-center gap-4 bg-[#faf6f0] p-3 rounded-xl border border-[#ede3d8]">
          {SIZE_OPTIONS.map((size) => {
            const radioId = `size-${size.id.toLowerCase()}`;
            const isChecked = selectedSize === size.id;
            return (
              <div key={size.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  id={radioId}
                  name="sizeGroup"
                  value={size.id}
                  checked={isChecked}
                  onChange={() => setSelectedSize(size.id)}
                  className="w-4 h-4 accent-[#6b4226] cursor-pointer"
                />
                <label
                  htmlFor={radioId}
                  className={`cursor-pointer text-sm font-medium transition-colors select-none ${
                    isChecked ? 'text-[#6b4226] font-bold' : 'text-[#5c4033]'
                  }`}
                >
                  {size.name} +{size.extraPrice.toLocaleString()}원
                  {size.id === 'M' && (
                    <span className="ml-1 text-xs text-[#8c674b] bg-[#ebdccf] px-1.5 py-0.5 rounded">
                      기본
                    </span>
                  )}
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 추가 옵션 체크박스 (가로 배치) */}
      <div>
        <label className="block text-sm font-bold text-[#4a2e1b] mb-2">
          5. 추가 옵션 (가로 배치)
        </label>
        <div className="flex flex-wrap items-center gap-4 bg-[#faf6f0] p-3 rounded-xl border border-[#ede3d8]">
          {ADDON_OPTIONS.map((addon) => {
            const isChecked = selectedOptions.includes(addon.id);
            return (
              <div key={addon.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={addon.id}
                  checked={isChecked}
                  onChange={() => handleOptionToggle(addon.id)}
                  className="w-4 h-4 accent-[#6b4226] rounded cursor-pointer"
                />
                <label
                  htmlFor={addon.id}
                  className={`cursor-pointer text-sm font-medium transition-colors select-none ${
                    isChecked ? 'text-[#6b4226] font-bold' : 'text-[#5c4033]'
                  }`}
                >
                  {addon.name} +{addon.extraPrice.toLocaleString()}원
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. 수량 입력 (number 타입, min 1, max 10) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="quantity"
            className="text-sm font-bold text-[#4a2e1b]"
          >
            6. 수량
          </label>
          <span className="text-xs text-[#8c674b]">최소 1개 ~ 최대 10개</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            id="quantity"
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={handleQuantityChange}
            className="cafe-input font-medium"
          />
        </div>
      </div>

      {/* 7. 요청사항 (textarea) */}
      <div>
        <label
          htmlFor="specialRequests"
          className="block text-sm font-bold text-[#4a2e1b] mb-1.5"
        >
          7. 요청사항
        </label>
        <textarea
          id="specialRequests"
          rows={3}
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="예: 얼음 조금만 넣어주세요, 일회용 컵 홀더 챙겨주세요 등"
          className="cafe-input resize-none"
        />
      </div>

      {/* =================================================== */}
      {/* 실시간 예상 금액 표시 영역 (주문하기 버튼 바로 위) */}
      {/* 요구사항: 큰 글씨(24px), 갈색, 굵게, 가운데 정렬       */}
      {/* 예) "예상 금액: 5,000원"                             */}
      {/* =================================================== */}
      <div className="pt-2 pb-1 border-t border-[#ebdccf]">
        <div className="text-[24px] text-[#6b4226] font-bold text-center tracking-tight">
          예상 금액: {estimatedTotalPrice.toLocaleString()}원
        </div>
        {!selectedDrinkId && (
          <p className="text-center text-xs text-[#a0826c] mt-1">
            * 음료를 선택하시면 상세 금액이 실시간으로 계산됩니다.
          </p>
        )}
      </div>

      {/* 버튼 영역 (주문하기 & 다시 작성) */}
      <div className="flex gap-3">
        {/* 다시 작성 버튼 */}
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 bg-[#f0e8df] hover:bg-[#e4d7cb] active:scale-[0.98] text-[#5c3e29] font-semibold rounded-xl text-sm transition-all border border-[#dfd2c4] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          다시 작성
        </button>

        {/* 8. 주문하기 버튼: 갈색 배경(#6b4226), 흰색 글씨, hover시 약간 밝게 */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] flex items-center justify-center gap-2 py-3 px-6 bg-[#6b4226] hover:bg-[#804e2d] active:scale-[0.98] disabled:opacity-50 text-white font-bold rounded-xl text-base shadow-sm transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              접수 처리 중...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-[#ffd700]" />
              주문하기
            </>
          )}
        </button>
      </div>

      {/* =================================================== */}
      {/* 주문 확인 메시지 표시 영역                           */}
      {/* 요구사항: 연두색 배경, 초록 글씨, 둥근 모서리         */}
      {/* "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!" */}
      {/* =================================================== */}
      {confirmationMessage && (
        <div
          role="status"
          className="p-4 bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] rounded-xl shadow-sm space-y-2 animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-[#16a34a] mt-0.5" />
            <div className="text-sm font-semibold leading-relaxed">
              {confirmationMessage}
            </div>
          </div>

          {/* 추가 영수증 요약 카드 */}
          {lastSubmittedOrder && (
            <div className="mt-3 pt-3 border-t border-[#86efac]/50 text-xs text-[#166534] grid grid-cols-2 gap-y-1">
              <span>👤 주문자: {lastSubmittedOrder.customerName}</span>
              <span>📞 연락처: {lastSubmittedOrder.phoneNumber}</span>
              <span>☕ 음료: {lastSubmittedOrder.drinkName} ({lastSubmittedOrder.size})</span>
              <span>
                ➕ 옵션: {lastSubmittedOrder.options.length > 0 ? lastSubmittedOrder.options.join(', ') : '없음'}
              </span>
              <span>🔢 수량: {lastSubmittedOrder.quantity}잔</span>
              <span className="font-bold text-[#14532d]">
                💳 총 금액: {lastSubmittedOrder.totalPrice.toLocaleString()}원
              </span>
            </div>
          )}
        </div>
      )}
    </form>
  );
};
