import React from 'react';
import { Users, Clock, AlertTriangle, Monitor } from 'lucide-react';

export function QueuePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Monitor className="text-indigo-600" />
          結帳區排隊監測
        </h1>
        <p className="text-slate-500 mt-2">
          即時監測各收銀台排隊人數與等待時間，並自動預警調度人力。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: '當前總排隊人數', value: '18 人', icon: <Users size={20} className="text-indigo-500" /> },
          { label: '平均等待時間', value: '3.2 分鐘', icon: <Clock size={20} className="text-blue-500" /> },
          { label: '預警狀態', value: '正常', icon: <AlertTriangle size={20} className="text-emerald-500" /> },
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
          <Monitor size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">影像辨識即時畫面</h3>
          <p className="text-slate-400 mt-2">YOLOv8 邊緣運算模型持續監控中...</p>
        </div>
      </div>
    </div>
  );
}
