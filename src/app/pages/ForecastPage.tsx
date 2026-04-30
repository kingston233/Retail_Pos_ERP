import React from 'react';
import { TrendingUp, BarChart2, Lightbulb, Target } from 'lucide-react';

export function ForecastPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" />
          銷售預測與決策
        </h1>
        <p className="text-slate-500 mt-2">
          基於歷史數據與外部環境因素，預測未來銷量並提供進貨決策建議。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: '下週預測營收', value: 'NT$ 342,500', icon: <BarChart2 size={20} className="text-blue-500" /> },
          { label: '熱銷品類預測', value: '生鮮食品', icon: <Target size={20} className="text-rose-500" /> },
          { label: '建議補貨商品', value: '12 項', icon: <Lightbulb size={20} className="text-amber-500" /> },
          { label: '預測準確率', value: '94.2%', icon: <TrendingUp size={20} className="text-emerald-500" /> },
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
          <TrendingUp size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">AI 決策引擎運算中...</h3>
          <p className="text-slate-400 mt-2">正在載入圖表與數據模型</p>
        </div>
      </div>
    </div>
  );
}
