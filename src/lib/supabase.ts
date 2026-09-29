/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CafeOrder } from '../types.ts';

// Supabase 설정 정보 타입
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'storage' | 'none';
}

// 현재 적용된 Supabase 설정 가져오기 (환경변수 우선, 로컬 스토리지 차선)
export const getSupabaseConfig = (): SupabaseConfig => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim() || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() || '';

  if (envUrl && envKey && !envUrl.includes('your-project') && !envKey.includes('your-anon')) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  const storageUrl = localStorage.getItem('VITE_SUPABASE_URL')?.trim() || '';
  const storageKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY')?.trim() || '';

  if (storageUrl && storageKey) {
    return { url: storageUrl, anonKey: storageKey, source: 'storage' };
  }

  return {
    url: envUrl || storageUrl,
    anonKey: envKey || storageKey,
    source: 'none',
  };
};

// 동적으로 Supabase 설정 저장 (UI 모달에서 직접 입력 시 즉시 반영)
export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();

  if (cleanUrl) {
    localStorage.setItem('VITE_SUPABASE_URL', cleanUrl);
  } else {
    localStorage.removeItem('VITE_SUPABASE_URL');
  }

  if (cleanKey) {
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', cleanKey);
  } else {
    localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  }

  // 기존 클라이언트 캐시 무효화
  cachedClient = null;
};

// Supabase 설정 삭제
export const clearSupabaseConfig = (): void => {
  localStorage.removeItem('VITE_SUPABASE_URL');
  localStorage.removeItem('VITE_SUPABASE_ANON_KEY');
  cachedClient = null;
};

// Supabase 설정 유효 여부 확인
export const isSupabaseConfigured = (): boolean => {
  const config = getSupabaseConfig();
  return Boolean(
    config.url &&
    config.anonKey &&
    !config.url.includes('your-project') &&
    !config.anonKey.includes('your-anon')
  );
};

// 싱글톤 Supabase 클라이언트 캐시
let cachedClient: SupabaseClient | null = null;

// Supabase 클라이언트 인스턴스 취득
export const getSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey || config.source === 'none') {
    return null;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

// 시간 포맷 헬퍼 함수 (ISO 문자열 -> 상대 시간 표현)
export const formatOrderTime = (isoString?: string): string => {
  if (!isoString) return '방금 전';
  // 이미 상대 시간 문자열인 경우 그대로 반환
  if (isoString.includes('전') || isoString.includes('방금')) return isoString;

  try {
    const orderDate = new Date(isoString);
    if (isNaN(orderDate.getTime())) return isoString;

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - orderDate.getTime()) / 1000);

    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;

    const month = orderDate.getMonth() + 1;
    const day = orderDate.getDate();
    const hours = String(orderDate.getHours()).padStart(2, '0');
    const minutes = String(orderDate.getMinutes()).padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
};

// DB row -> CafeOrder 매핑 헬퍼
export const mapRowToCafeOrder = (row: any): CafeOrder => {
  return {
    id: String(row.id),
    customerName: row.customer_name || '익명',
    phoneNumber: row.phone_number || '미입력',
    drinkName: row.drink_name || '음료',
    drinkPrice: Number(row.drink_price) || 0,
    size: (row.size as CafeOrder['size']) || 'M',
    sizeExtraPrice: Number(row.size_extra_price) || 0,
    options: Array.isArray(row.options) ? row.options : [],
    optionsExtraPrice: Number(row.options_extra_price) || 0,
    quantity: Number(row.quantity) || 1,
    specialRequests: row.special_requests || '',
    totalPrice: Number(row.total_price) || 0,
    status: (row.order_status as CafeOrder['status']) || '접수완료',
    createdAt: formatOrderTime(row.created_at),
  };
};

// Supabase 연결 테스트 함수
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL과 Anon Key가 입력되지 않았습니다.',
    };
  }

  try {
    const { error } = await client
      .from('cafe_orders')
      .select('id', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Supabase 프로젝트에 연결되었으나, cafe_orders 테이블이 없습니다. SQL을 실행해주세요.',
        };
      }
      return {
        success: false,
        message: `연결 오류: ${error.message} (코드: ${error.code})`,
      };
    }

    return {
      success: true,
      message: 'Supabase 프로젝트 및 cafe_orders 테이블에 성공적으로 연결되었습니다!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `네트워크 연결 실패: ${err.message || '알 수 없는 오류'}`,
    };
  }
};

// 주문 목록 전체 조회 (Supabase)
export const fetchOrdersFromSupabase = async (): Promise<CafeOrder[]> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');

  const { data, error } = await client
    .from('cafe_orders')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map(mapRowToCafeOrder);
};

// 새 주문 등록 (Supabase)
export const createOrderInSupabase = async (
  order: Omit<CafeOrder, 'id' | 'createdAt'>
): Promise<CafeOrder> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');

  const insertPayload = {
    customer_name: order.customerName,
    phone_number: order.phoneNumber || null,
    drink_name: order.drinkName,
    drink_price: order.drinkPrice,
    size: order.size,
    size_extra_price: order.sizeExtraPrice,
    options: order.options,
    options_extra_price: order.optionsExtraPrice,
    quantity: order.quantity,
    special_requests: order.specialRequests || null,
    total_price: order.totalPrice,
    order_status: order.status || '접수완료',
  };

  const { data, error } = await client
    .from('cafe_orders')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapRowToCafeOrder(data);
};

// 주문 상태 변경 (Supabase)
export const updateOrderStatusInSupabase = async (
  orderId: string,
  nextStatus: CafeOrder['status']
): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');

  const id = isNaN(Number(orderId)) ? orderId : Number(orderId);

  const { error } = await client
    .from('cafe_orders')
    .update({ order_status: nextStatus })
    .eq('id', id);

  if (error) {
    throw error;
  }
};

// 실시간 변경사항 구독 (Realtime)
export const subscribeToOrders = (
  onRefresh: () => void
): (() => void) => {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('realtime:cafe_orders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cafe_orders',
      },
      () => {
        onRefresh();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
};
