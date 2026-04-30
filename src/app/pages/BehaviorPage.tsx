import React from 'react';
import { Users, Activity, Eye, Compass } from 'lucide-react';

export function BehaviorPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Eye className="text-indigo-600" />
          顧客行為感知
        </h1>
        <p className="text-slate-500 mt-2">
          即時分析顧客在店內的動線與停留熱點，掌握消費意圖。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: '今日平均停留時間', value: '12.5 分鐘', icon: <Activity size={20} className="text-blue-500" /> },
          { label: '熱門區域', value: '生鮮區 (45%)', icon: <Compass size={20} className="text-amber-500" /> },
          { label: '活躍客群', value: '25-34歲', icon: <Users size={20} className="text-emerald-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              {stat.icon}
            </div>
            <div>
              <div className="text-sm text-slate-500 mb-1">{stat.label}</div>
              <div className="text-xl font-bold text-slate-800">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Eye size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">熱力圖與動線分析載入中...</h3>
          <p className="text-slate-400 mt-2">系統正在整合即時攝影機數據</p>
        </div>
      </div>
    </div>
  );
}
