/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CafeOrder } from '../types.ts';
import { Coffee, Clock, User, Phone, CheckCircle, Flame, RefreshCw, Loader2 } from 'lucide-react';

interface OrderBoardProps {
  orders: CafeOrder[];
  onStatusChange?: (orderId: string, nextStatus: CafeOrder['status']) => Promise<void> | void;
  isLoading?: boolean;
  onRefresh?: () => void;
  isSupabaseLive?: boolean;
}

export const OrderBoard: React.FC<OrderBoardProps> = ({
  orders,
  onStatusChange,
  isLoading = false,
  onRefresh,
  isSupabaseLive = false,
}) => {
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // 상태별 배지 스타일 헬퍼 함수
  const getStatusBadge = (status: CafeOrder['status']) => {
    switch (status) {
      case '접수완료':
        return 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
      case '제조중':
        return 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]';
      case '픽업대기':
        return 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]';
      case '완료':
        return 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 다음 상태로 변경하는 순환 로직
  const handleNextStatus = async (order: CafeOrder) => {
    if (!onStatusChange || updatingOrderId) return;
    const statusCycle: CafeOrder['status'][] = ['접수완료', '제조중', '픽업대기', '완료'];
    const currentIndex = statusCycle.indexOf(order.status);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    try {
      setUpdatingOrderId(order.id);
      await onStatusChange(order.id, nextStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#4a2e1b] flex items-center gap-2">
            <span>📋</span>
            실시간 주문 접수 현황
            <span className="text-xs bg-[#6b4226] text-white px-2 py-0.5 rounded-full font-medium">
              {orders.length}건
            </span>
          </h3>
          {isSupabaseLive && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live DB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 text-[#8c674b] hover:text-[#4a2e1b] hover:bg-[#f0e8df] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-[#8c674b] px-1">
        * 상태 칩을 클릭하면 [접수완료 → 제조중 → 픽업대기 → 완료] 순으로 상태가 즉시 변경됩니다.
      </p>

      {isLoading && orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#ebdccf] p-6 text-[#8c674b] space-y-2 shadow-xs">
          <Loader2 className="w-8 h-8 mx-auto text-[#6b4226] animate-spin" />
          <p className="font-semibold text-sm">Supabase에서 주문 목록을 불러오는 중...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#ebdccf] p-6 text-[#8c674b] space-y-2 shadow-xs">
          <Coffee className="w-10 h-10 mx-auto text-[#c4b1a0] stroke-[1.5]" />
          <p className="font-semibold text-sm">아직 접수된 주문이 없습니다.</p>
          <p className="text-xs">주문서 작성 탭에서 첫 음료를 주문해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const isRowUpdating = updatingOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl p-4 border border-[#ebdccf] shadow-xs hover:shadow-sm transition-all space-y-3"
              >
                {/* 상단: 주문자 정보 & 상태 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#f3ece2] flex items-center justify-center text-[#6b4226] font-bold text-sm">
                      {order.customerName ? order.customerName.charAt(0) : '?'}
                    </div>
                    <div>
                      <div className="font-bold text-[#3d2716] text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#8c674b]" />
                        {order.customerName}
                        {order.phoneNumber && order.phoneNumber !== '미입력' && (
                          <span className="text-xs text-[#8c674b] font-normal flex items-center gap-1 ml-1">
                            <Phone className="w-3 h-3" />
                            {order.phoneNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#a0826c] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {order.createdAt}
                      </div>
                    </div>
                  </div>

                  {/* 상태 배지 (클릭 시 상태 전환) */}
                  <button
                    type="button"
                    onClick={() => handleNextStatus(order)}
                    disabled={isRowUpdating}
                    title="클릭하여 상태 변경"
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border transition-transform active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-1 ${getStatusBadge(
                      order.status
                    )}`}
                  >
                    {isRowUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        {order.status === '제조중' && <Flame className="w-3 h-3 text-[#b45309] animate-pulse" />}
                        {order.status === '완료' && <CheckCircle className="w-3 h-3 text-[#15803d]" />}
                      </>
                    )}
                    {order.status}
                  </button>
                </div>

                {/* 주문 내용 상세 */}
                <div className="bg-[#faf6f0] p-3 rounded-lg border border-[#ede3d8] text-xs space-y-1 text-[#4a2e1b]">
                  <div className="flex justify-between items-center font-bold text-sm text-[#3d2716]">
                    <span className="flex items-center gap-1.5">
                      <Coffee className="w-4 h-4 text-[#6b4226]" />
                      {order.drinkName} ({order.size}사이즈) × {order.quantity}잔
                    </span>
                    <span className="text-[#6b4226] text-base font-extrabold">
                      {order.totalPrice.toLocaleString()}원
                    </span>
                  </div>

                  {order.options && order.options.length > 0 && (
                    <div className="text-[#6b4226] font-medium pt-1">
                      옵션: {order.options.join(', ')}
                    </div>
                  )}

                  {order.specialRequests && (
                    <div className="text-[#7c5b43] italic pt-1 border-t border-[#ede3d8]">
                      요청: "{order.specialRequests}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
