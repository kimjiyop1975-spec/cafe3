/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CafeOrderForm } from './components/CafeOrderForm.tsx';
import { OrderBoard } from './components/OrderBoard.tsx';
import { SupabaseSqlModal } from './components/SupabaseSqlModal.tsx';
import { INITIAL_ORDERS } from './data/cafeData.ts';
import { CafeOrder } from './types.ts';
import {
  isSupabaseConfigured,
  fetchOrdersFromSupabase,
  createOrderInSupabase,
  updateOrderStatusInSupabase,
  subscribeToOrders,
} from './lib/supabase.ts';
import { ClipboardList, PenTool, Database, Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  // 접수된 주문 목록 상태 (초기 샘플 데이터 포함)
  const [orders, setOrders] = useState<CafeOrder[]>(INITIAL_ORDERS);
  // 현재 활성화된 탭 ('order': 주문서 작성, 'board': 접수 게시판)
  const [activeTab, setActiveTab] = useState<'order' | 'board'>('order');
  // Supabase SQL 및 연동 설정 모달 열림 여부
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  // Supabase 설정 완료 여부
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured());
  // 주문 데이터 로딩 상태
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  // 동기화 에러 메시지
  const [syncError, setSyncError] = useState<string | null>(null);

  // Supabase로부터 주문 데이터 불러오기 함수
  const loadOrders = useCallback(async () => {
    const configured = isSupabaseConfigured();
    setIsSupabaseConnected(configured);

    if (!configured) {
      return;
    }

    try {
      setIsLoadingOrders(true);
      setSyncError(null);
      const dbOrders = await fetchOrdersFromSupabase();
      setOrders(dbOrders);
    } catch (err: any) {
      console.error('Supabase fetch error:', err);
      setSyncError(err.message || '데이터베이스 조회 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // 초기 로드 및 실시간 구독(Realtime) 설정
  useEffect(() => {
    loadOrders();

    if (isSupabaseConfigured()) {
      // Supabase Realtime 테이블 변경 감지 구독
      const unsubscribe = subscribeToOrders(() => {
        fetchOrdersFromSupabase()
          .then((dbOrders) => setOrders(dbOrders))
          .catch((err) => console.error('Realtime sync error:', err));
      });

      return () => {
        unsubscribe();
      };
    }
  }, [loadOrders, isSupabaseConnected]);

  // 신규 주문 접수 처리 핸들러
  const handleOrderCreated = async (newOrder: CafeOrder) => {
    if (isSupabaseConfigured()) {
      try {
        const savedOrder = await createOrderInSupabase(newOrder);
        setOrders((prev) => [savedOrder, ...prev.filter((o) => o.id !== savedOrder.id)]);
        return savedOrder;
      } catch (err: any) {
        console.error('Failed to create order in Supabase:', err);
        throw err;
      }
    } else {
      // Supabase 미연결 시 로컬 메모리 상태에 저장
      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    }
  };

  // 주문 상태 업데이트 핸들러
  const handleStatusChange = async (orderId: string, nextStatus: CafeOrder['status']) => {
    // 낙관적 UI 업데이트 (사용자 경험 개선)
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: nextStatus } : order
      )
    );

    if (isSupabaseConfigured()) {
      try {
        await updateOrderStatusInSupabase(orderId, nextStatus);
      } catch (err: any) {
        console.error('Failed to update status in Supabase:', err);
        alert(`주문 상태 변경 실패: ${err.message || '다시 시도해주세요.'}`);
        // 에러 시 기존 상태로 재동기화
        loadOrders();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] text-[#3d2716] py-8 px-4 flex flex-col items-center">
      {/* 
        전체 레이아웃 제약조건:
        - 최대 너비 520px, 가운데 정렬 (max-w-[520px] w-full mx-auto)
        - 폰트: '맑은 고딕', sans-serif (index.css 설정 완료)
      */}
      <div className="w-full max-w-[520px] mx-auto space-y-6">
        
        {/* =================================================== */}
        {/* 페이지 상단 카페 헤더                                */}
        {/* =================================================== */}
        <header className="text-center pt-2 pb-1 space-y-2">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-full bg-[#f0e4d7] shadow-inner mb-1 border border-[#e4d3c2]">
            <span className="text-4xl select-none" role="img" aria-label="카페 로고">
              ☕
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#6b4226] tracking-tight">
            바이브 카페
          </h1>
          <p className="text-sm font-medium text-[#8c674b]">
            당신의 하루에 바이브를 더하다
          </p>

          {/* Supabase 연동 상태 배지 & 설정 버튼 */}
          <div className="pt-1 flex items-center justify-center gap-2">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                isSupabaseConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-[#f5ede3] text-[#7a5332] border-[#dfccba] hover:bg-[#ede2d4]'
              }`}
              title="Supabase 연동 상태 및 SQL 설정 열기"
            >
              <Database className="w-3.5 h-3.5" />
              {isSupabaseConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Supabase 실시간 연동됨
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Supabase 설정 (로컬 모드)
                </>
              )}
            </button>
          </div>
        </header>

        {/* 동기화 에러 경고 배너 */}
        {syncError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{syncError}</span>
            </div>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="font-bold underline text-rose-900 cursor-pointer ml-2 whitespace-nowrap"
            >
              설정 확인
            </button>
          </div>
        )}

        {/* 탭 네비게이션: [주문서 작성] vs [주문 접수 게시판] */}
        <nav className="flex rounded-xl bg-[#ede3d8] p-1 shadow-inner border border-[#e2d5c7]">
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'order'
                ? 'bg-[#ffffff] text-[#6b4226] shadow-xs'
                : 'text-[#856b57] hover:text-[#4a2e1b]'
            }`}
          >
            <PenTool className="w-4 h-4" />
            주문서 작성
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'board'
                ? 'bg-[#ffffff] text-[#6b4226] shadow-xs'
                : 'text-[#856b57] hover:text-[#4a2e1b]'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            주문 게시판 ({orders.length})
          </button>
        </nav>

        {/* 메인 콘텐츠 영역 */}
        <main>
          {activeTab === 'order' ? (
            <CafeOrderForm onOrderCreated={handleOrderCreated} />
          ) : (
            <div className="bg-white rounded-2xl shadow-md border border-[#ebdccf] p-5">
              <OrderBoard
                orders={orders}
                onStatusChange={handleStatusChange}
                isLoading={isLoadingOrders}
                onRefresh={loadOrders}
                isSupabaseLive={isSupabaseConnected}
              />
            </div>
          )}
        </main>

        {/* 푸터 영역 */}
        <footer className="text-center text-xs text-[#a0826c] py-4 space-y-2 border-t border-[#ebdccf]">
          <p>© 바이브 카페 (Vibe Cafe). All rights reserved.</p>
          <div className="flex flex-wrap justify-center items-center gap-3">
            <button
              onClick={() => setActiveTab(activeTab === 'order' ? 'board' : 'order')}
              className="text-[#6b4226] hover:underline font-semibold cursor-pointer"
            >
              {activeTab === 'order' ? '📋 접수된 주문 게시판 보기' : '✏️ 주문서 작성으로 돌아가기'}
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="text-[#6b4226] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              Supabase SQL 및 연동 설정
            </button>
          </div>
        </footer>
      </div>

      {/* Supabase 연동 & SQL 설정 모달 */}
      <SupabaseSqlModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        onConfigUpdated={() => {
          setIsSupabaseConnected(isSupabaseConfigured());
          loadOrders();
        }}
      />
    </div>
  );
}
