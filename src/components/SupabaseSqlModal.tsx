/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SUPABASE_SQL_SCRIPT } from '../data/cafeData.ts';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase.ts';
import {
  Copy,
  Check,
  Database,
  Terminal,
  FileCode2,
  ExternalLink,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'sql' | 'columns' | 'guide'>('connection');

  // Supabase URL & Anon Key 입력 상태
  const [urlInput, setUrlInput] = useState<string>('');
  const [keyInput, setKeyInput] = useState<string>('');
  const [configSource, setConfigSource] = useState<'env' | 'storage' | 'none'>('none');

  // 연결 테스트 상태
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 모달이 열릴 때 현재 설정값 불러오기
  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrlInput(config.url || '');
      setKeyInput(config.anonKey || '');
      setConfigSource(config.source);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // SQL 클립보드 복사 함수
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = SUPABASE_SQL_SCRIPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // 연결 저장 및 테스트 핸들러
  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    const cleanKey = keyInput.trim();

    if (!cleanUrl || !cleanKey) {
      setTestResult({
        success: false,
        message: 'Supabase URL과 Anon Key를 모두 입력해주세요.',
      });
      return;
    }

    // 설정 저장
    saveSupabaseConfig(cleanUrl, cleanKey);
    setConfigSource('storage');
    setIsTesting(true);
    setTestResult(null);

    // 연결 및 테이블 테스트
    const res = await testSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);

    if (res.success && onConfigUpdated) {
      onConfigUpdated();
    }
  };

  // 설정 초기화
  const handleResetConfig = () => {
    clearSupabaseConfig();
    setUrlInput('');
    setKeyInput('');
    setConfigSource('none');
    setTestResult({
      success: false,
      message: '설정이 초기화되었습니다. 로컬 샘플 데이터 모드로 동작합니다.',
    });
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#ffffff] w-full max-w-[580px] max-h-[92vh] rounded-2xl shadow-2xl border border-[#ebdccf] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 bg-[#f8f3ed] border-b border-[#ebdccf] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#6b4226] text-white rounded-xl shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#4a2e1b] flex items-center gap-2">
                Supabase 연동 & SQL 설정
                {configSource !== 'none' ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                    {configSource === 'env' ? '.env 연결' : '브라우저 저장'}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                    미연결 (로컬 모드)
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#8c674b]">
                API 키 연동, 테이블 스키마 생성 및 실시간 주문 연동
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c674b] hover:text-[#4a2e1b] p-1.5 rounded-lg hover:bg-[#ece2d6] transition-colors cursor-pointer"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-[#ebdccf] bg-[#faf6f0] text-xs font-semibold px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('connection')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'connection'
                ? 'border-[#6b4226] text-[#6b4226] bg-white rounded-t-lg'
                : 'border-transparent text-[#7a6452] hover:text-[#4a2e1b]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            API 키 연동
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sql'
                ? 'border-[#6b4226] text-[#6b4226] bg-white rounded-t-lg'
                : 'border-transparent text-[#7a6452] hover:text-[#4a2e1b]'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            SQL 쿼리문
          </button>
          <button
            onClick={() => setActiveTab('columns')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'columns'
                ? 'border-[#6b4226] text-[#6b4226] bg-white rounded-t-lg'
                : 'border-transparent text-[#7a6452] hover:text-[#4a2e1b]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            컬럼 구조
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-[#6b4226] text-[#6b4226] bg-white rounded-t-lg'
                : 'border-transparent text-[#7a6452] hover:text-[#4a2e1b]'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            연동 가이드
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 1. API 키 연동 탭 */}
          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#fdfaf5] border border-[#ecd9c7] rounded-xl text-xs text-[#6b4226] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  <span>⚡</span> 간편 연동 안내
                </p>
                <p>
                  Supabase 대시보드의 <strong>Project Settings → API</strong>에서 <strong>Project URL</strong>과 <strong>anon public API 키</strong>를 복사하여 아래에 입력하세요.
                </p>
                <p className="text-[11px] text-[#8c674b]">
                  * 입력하신 정보는 브라우저 로컬 저장소 또는 프로젝트 루트의 <code className="bg-[#ebdccf] px-1 py-0.5 rounded font-mono">.env.local</code> 파일에 안전하게 보관됩니다.
                </p>
              </div>

              <form onSubmit={handleSaveAndTest} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#4a2e1b] mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 bg-white border border-[#d9c4b1] rounded-xl text-xs text-[#3d2716] focus:outline-none focus:ring-2 focus:ring-[#6b4226] focus:border-transparent font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4a2e1b] mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 bg-white border border-[#d9c4b1] rounded-xl text-xs text-[#3d2716] focus:outline-none focus:ring-2 focus:ring-[#6b4226] focus:border-transparent font-mono"
                    required
                  />
                </div>

                {/* 테스트 결과 피드백 */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed font-medium">{testResult.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#6b4226] hover:bg-[#804e2d] active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        연결 확인 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        연결 테스트 및 저장
                      </>
                    )}
                  </button>

                  {configSource === 'storage' && (
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="flex items-center gap-1 py-2.5 px-3 bg-[#fdf2f2] hover:bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                      title="저장된 키 초기화"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      초기화
                    </button>
                  )}
                </div>
              </form>

              <div className="pt-2 border-t border-[#ebdccf] text-xs text-[#8c674b] space-y-1">
                <p className="font-semibold text-[#4a2e1b]">📌 테이블 생성이 아직 안 되셨나요?</p>
                <p>
                  상단 <button onClick={() => setActiveTab('sql')} className="text-[#6b4226] font-bold underline cursor-pointer">[SQL 쿼리문]</button> 탭을 눌러 SQL을 복사한 후, Supabase 대시보드의 SQL Editor에서 실행하시면 테이블과 정책이 자동 생성됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 2. SQL 쿼리문 탭 */}
          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6b4226]">
                <span className="font-medium">
                  아래 쿼리를 복사하여 Supabase SQL Editor에 붙여넣고 실행하세요.
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-[#6b4226] hover:bg-[#804e2d] text-white rounded-lg font-bold shadow-xs transition-all cursor-pointer text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#86efac]" />
                      복사 완료!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      SQL 전체 복사
                    </>
                  )}
                </button>
              </div>

              {/* 코드 블록 */}
              <pre className="p-4 bg-[#231e1a] text-[#ebdccf] text-xs font-mono rounded-xl overflow-x-auto leading-relaxed border border-[#3b322c] selection:bg-[#6b4226] max-h-[340px]">
                <code>{SUPABASE_SQL_SCRIPT}</code>
              </pre>
            </div>
          )}

          {/* 3. 컬럼 구조 설명 탭 */}
          {activeTab === 'columns' && (
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-[#4a2e1b] text-sm flex items-center gap-1">
                <span>📋</span> cafe_orders 테이블 컬럼 상세
              </h3>
              <div className="border border-[#ebdccf] rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f0e8df] text-[#4a2e1b] font-bold">
                    <tr>
                      <th className="p-2.5 border-b border-[#ebdccf]">컬럼명</th>
                      <th className="p-2.5 border-b border-[#ebdccf]">타입</th>
                      <th className="p-2.5 border-b border-[#ebdccf]">주문서 대응 항목</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ebdccf] bg-white text-[#5c4033]">
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">customer_name</td>
                      <td className="p-2">VARCHAR(50)</td>
                      <td className="p-2">1. 이름 (필수)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">phone_number</td>
                      <td className="p-2">VARCHAR(20)</td>
                      <td className="p-2">2. 전화번호</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">drink_name</td>
                      <td className="p-2">VARCHAR(50)</td>
                      <td className="p-2">3. 선택된 음료명</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">drink_price</td>
                      <td className="p-2">INTEGER</td>
                      <td className="p-2">3. 음료 기본 단가 (3,500원 등)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">size</td>
                      <td className="p-2">VARCHAR(10)</td>
                      <td className="p-2">4. 사이즈 (S, M, L)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">options</td>
                      <td className="p-2">TEXT[] (배열)</td>
                      <td className="p-2">5. 추가 옵션 목록 (샷, 크림 등)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">quantity</td>
                      <td className="p-2">INTEGER</td>
                      <td className="p-2">6. 수량 (1~10)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">special_requests</td>
                      <td className="p-2">TEXT</td>
                      <td className="p-2">7. 요청사항</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">total_price</td>
                      <td className="p-2">INTEGER</td>
                      <td className="p-2">최종 실시간 예상/결제 금액</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-[#6b4226]">order_status</td>
                      <td className="p-2">VARCHAR(20)</td>
                      <td className="p-2">주문 상태 (접수완료, 제조중, 픽업대기, 완료)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. 사용 방법 가이드 탭 */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-[#5c4033] leading-relaxed">
              <div className="p-3.5 bg-[#fdfaf5] border border-[#ebdccf] rounded-xl space-y-2">
                <h4 className="font-bold text-[#4a2e1b] text-sm flex items-center gap-1.5">
                  <span>💡</span> Supabase 연결 3단계 완벽 가이드
                </h4>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Supabase 프로젝트 생성:</strong>{' '}
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6b4226] font-bold underline inline-flex items-center gap-0.5"
                    >
                      supabase.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    에 로그인 후 새 프로젝트를 생성합니다.
                  </li>
                  <li>
                    <strong>SQL 쿼리 실행:</strong> 상단의 <strong>[SQL 쿼리문]</strong> 탭에서 <strong>SQL 전체 복사</strong>를 누른 뒤, Supabase 대시보드의 <strong>SQL Editor → New Query</strong>에 붙여넣고 초록색 <strong>Run</strong> 버튼을 클릭합니다.
                    <div className="text-[11px] text-[#8c674b] mt-0.5">
                      (cafe_orders 테이블, cafe_menu 테이블, RLS 권한 및 Realtime 설정이 일괄 적용됩니다.)
                    </div>
                  </li>
                  <li>
                    <strong>API 키 입력:</strong> Supabase 좌측 톱니바퀴 아이콘 <strong>Project Settings → API</strong>에서 <strong>Project URL</strong>과 <strong>anon public API key</strong>를 복사하여 <strong>[API 키 연동]</strong> 탭에 입력하고 저장을 누릅니다.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="p-3 bg-[#f8f3ed] border-t border-[#ebdccf] flex items-center justify-between">
          {activeTab === 'sql' ? (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 py-2 px-4 bg-[#6b4226] hover:bg-[#804e2d] text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#86efac]" />
                  클립보드에 복사되었습니다!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  SQL 쿼리문 복사하기
                </>
              )}
            </button>
          ) : (
            <div className="text-xs text-[#8c674b]">
              바이브 카페 × Supabase 연동 지원
            </div>
          )}
          <button
            onClick={onClose}
            className="py-2 px-4 bg-[#e8ded3] hover:bg-[#d9cdbf] text-[#4a2e1b] rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
