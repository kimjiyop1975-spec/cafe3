/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 음료 항목 인터페이스
export interface DrinkItem {
  id: string;
  name: string;
  price: number;
}

// 사이즈 옵션 인터페이스
export interface SizeOption {
  id: 'S' | 'M' | 'L';
  name: string;
  extraPrice: number;
}

// 추가 옵션 인터페이스
export interface AddOnOption {
  id: string;
  name: string;
  extraPrice: number;
}

// 주문 접수 데이터 인터페이스
export interface CafeOrder {
  id: string;
  customerName: string;      // 이름
  phoneNumber: string;       // 전화번호
  drinkName: string;         // 음료 이름
  drinkPrice: number;        // 음료 단가
  size: 'S' | 'M' | 'L';     // 사이즈
  sizeExtraPrice: number;    // 사이즈 추가금
  options: string[];         // 선택된 추가 옵션 이름 목록
  optionsExtraPrice: number; // 옵션 총 추가금
  quantity: number;          // 수량 (1~10)
  specialRequests: string;   // 요청사항
  totalPrice: number;        // 총 결제 금액
  status: '접수완료' | '제조중' | '픽업대기' | '완료'; // 주문 상태
  createdAt: string;         // 주문 접수 일시
}
