import React, { useState, useRef } from 'react';
import { BucketSummary } from '../types/portfolio';
import { TrendingUp, TrendingDown, Target, Edit3, Check, X } from 'lucide-react';

interface InvestmentBucketsTableProps {
  buckets: BucketSummary[];
  onUpdateBucketTarget: (bucketName: string, targetAmount: number) => void;
  onUpdateBucketPurpose: (bucketName: string, purpose: string) => void;
}

const InvestmentBucketsTable: React.FC<InvestmentBucketsTableProps> = ({ 
  buckets, 
  onUpdateBucketTarget,
  onUpdateBucketPurpose
}) => {
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [editingPurpose, setEditingPurpose] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState({
    bucketName: 150,
    purpose: 200,
    targetAmount: 120,
    currentValue: 140,
    progressPercent: 120,
    shortfallAmount: 140,
    annualYield: 120,
    xirr: 100
  });

  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column as keyof typeof columnWidths]
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizing) return;
    
    const diff = e.clientX - resizing.startX;
    const newWidth = Math.max(80, resizing.startWidth + diff);
    
    setColumnWidths(prev => ({
      ...prev,
      [resizing.column]: newWidth
    }));
  };

  const handleMouseUp = () => {
    setResizing(null);
  };

  React.useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizing]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const handleEditTarget = (bucketName: string, currentTarget: number) => {
    setEditingTarget(bucketName);
    setEditValue(currentTarget.toString());
  };

  const handleSaveTarget = (bucketName: string) => {
    const newTarget = parseFloat(editValue) || 0;
    onUpdateBucketTarget(bucketName, newTarget);
    setEditingTarget(null);
    setEditValue('');
  };

  const handleEditPurpose = (bucketName: string, currentPurpose: string) => {
    setEditingPurpose(bucketName);
    setEditValue(currentPurpose);
  };

  const handleSavePurpose = (bucketName: string) => {
    onUpdateBucketPurpose(bucketName, editValue);
    setEditingPurpose(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingTarget(null);
    setEditingPurpose(null);
    setEditValue('');
  };

  const getBucketDisplayName = (bucketName: string) => {
    // Convert bucket1a -> Bucket 1A, bucket2 -> Bucket 2, etc.
    if (bucketName.startsWith('bucket')) {
      const suffix = bucketName.replace('bucket', '');
      if (suffix.length === 2) {
        // bucket1a -> Bucket 1A
        const number = suffix.charAt(0);
        const letter = suffix.charAt(1).toUpperCase();
        return `Bucket ${number}${letter}`;
      } else if (suffix.length === 1) {
        // bucket2 -> Bucket 2
        return `Bucket ${suffix}`;
      }
    }
    return bucketName;
  };

  const renderProgressBar = (bucket: BucketSummary) => {
    const progressPercent = Math.min(bucket.progressPercent, 100);
    const isOverTarget = bucket.progressPercent > 100;
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              isOverTarget ? 'bg-orange-500' : 
              progressPercent >= 80 ? 'bg-green-500' : 
              progressPercent >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
            }`}
            style={{ 
              width: `${Math.min(progressPercent, 100)}%`,
              animation: 'progressFill 1.5s ease-out'
            }}
          />
          {isOverTarget && (
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 opacity-20"
              style={{ width: '100%' }}
            />
          )}
        </div>
        <span className={`text-xs font-medium min-w-[45px] ${
          isOverTarget ? 'text-orange-600' : 
          progressPercent >= 80 ? 'text-green-600' : 
          progressPercent >= 50 ? 'text-blue-600' : 'text-yellow-600'
        }`}>
          {bucket.progressPercent.toFixed(1)}%
        </span>
      </div>
    );
  };

  const renderHeaderCell = (label: string, field: string) => (
    <div 
      className="relative h-10 px-3 text-xs font-semibold text-gray-700 bg-gray-100 border-r border-gray-300 flex items-center"
      style={{ width: columnWidths[field as keyof typeof columnWidths] }}
    >
      {label}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 opacity-0 hover:opacity-100"
        onMouseDown={(e) => handleMouseDown(e, field)}
      />
    </div>
  );

  const totals = buckets.reduce((acc, bucket) => ({
    targetAmount: acc.targetAmount + bucket.targetAmount,
    currentValue: acc.currentValue + bucket.currentValue,
    shortfallAmount: acc.shortfallAmount + Math.max(0, bucket.targetAmount - bucket.currentValue)
  }), { targetAmount: 0, currentValue: 0, shortfallAmount: 0 });

  const totalProgressPercent = totals.targetAmount > 0 ? 
    (totals.currentValue / totals.targetAmount) * 100 : 0;

  // Calculate bucket group progress for circular rings
  const bucket1Buckets = buckets.filter(b => b.bucketName.startsWith('bucket1'));
  const bucket2Bucket = buckets.find(b => b.bucketName === 'bucket2');
  const bucket3Bucket = buckets.find(b => b.bucketName === 'bucket3');

  const bucket1Target = bucket1Buckets.reduce((sum, b) => sum + b.targetAmount, 0);
  const bucket1Current = bucket1Buckets.reduce((sum, b) => sum + b.currentValue, 0);
  const bucket1Progress = bucket1Target > 0 ? (bucket1Current / bucket1Target) * 100 : 0;

  const bucket2Target = bucket2Bucket?.targetAmount || 0;
  const bucket2Current = bucket2Bucket?.currentValue || 0;
  const bucket2Progress = bucket2Target > 0 ? (bucket2Current / bucket2Target) * 100 : 0;

  const bucket3Target = bucket3Bucket?.targetAmount || 0;
  const bucket3Current = bucket3Bucket?.currentValue || 0;
  const bucket3Progress = bucket3Target > 0 ? (bucket3Current / bucket3Target) * 100 : 0;

  const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  return (
    <div className="p-4 bg-white">
      <style jsx>{`
        @keyframes progressFill {
          from { width: 0%; }
          to { width: var(--progress-width); }
        }
        
        @keyframes liquidRise {
          0% { height: 0%; }
          100% { height: var(--final-height, 100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .progress-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-800">Folyze Investment Buckets Progress</h2>
          <p className="text-xs text-gray-600">Track your investment goals by Folyze bucket allocation</p>
        </div>
      </div>

      {/* Liquid Fill Progress Indicators */}
      <div className="mb-6 p-6 rounded-lg border border-gray-200" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="flex justify-center items-center gap-16">
          {/* Bucket 1 Ring (Combined 1A-1E) */}
          <div className="flex flex-col items-center">
            {/* Goal at top */}
            <div className="mb-3 text-center">
              <div className="text-xs text-gray-500">Goal: ₹{(bucket1Target / 100000).toFixed(1)}L</div>
            </div>
            
            <div className="relative w-32 h-32">
              {/* Outer diamond layer (border) */}
              <div 
                className="absolute inset-0 w-32 h-32 bg-gray-300"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Inner diamond layer (background) */}
              <div 
                className="absolute inset-1 w-30 h-30 bg-white"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Liquid fill container */}
              <div 
                className="absolute inset-1 w-30 h-30"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              >
                {/* Liquid fill - bottom to top */}
                <div 
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#4a196d] to-[#6b2d8a]"
                  style={{ 
                    height: `${Math.min(bucket1Progress, 100)}%`,
                    transition: 'height 2s ease-out'
                  }}
                />
              </div>
              
              {/* Percentage text overlay */}
              <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {bucket1Progress.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Current and bucket name at bottom */}
            <div className="mt-3 text-center">
              <div className="text-xs font-medium text-gray-700">Folyze Bucket 1 - Short Term Goals</div>
            </div>
          </div>

          {/* Bucket 2 Ring */}
          <div className="flex flex-col items-center">
            {/* Goal at top */}
            <div className="mb-3 text-center">
              <div className="text-xs text-gray-500">Goal: ₹{(bucket2Target / 100000).toFixed(1)}L</div>
            </div>
            
            <div className="relative w-32 h-32">
              {/* Outer diamond layer (border) */}
              <div 
                className="absolute inset-0 w-32 h-32 bg-gray-300"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Inner diamond layer (background) */}
              <div 
                className="absolute inset-1 w-30 h-30 bg-white"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Liquid fill container */}
              <div 
                className="absolute inset-1 w-30 h-30"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              >
                {/* Liquid fill - bottom to top */}
                <div 
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-orange-600 to-orange-400"
                  style={{ 
                    height: `${Math.min(bucket2Progress, 100)}%`,
                    transition: 'height 2s ease-out 0.5s'
                  }}
                />
              </div>
              
              {/* Percentage text overlay */}
              <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {bucket2Progress.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Current and bucket name at bottom */}
            <div className="mt-3 text-center">
              <div className="text-xs font-medium text-gray-700">Folyze Bucket 2 - Financial Freedom</div>
            </div>
          </div>

          {/* Bucket 3 Ring */}
          <div className="flex flex-col items-center">
            {/* Goal at top */}
            <div className="mb-3 text-center">
              <div className="text-xs text-gray-500">Goal: ₹{(bucket3Target / 100000).toFixed(1)}L</div>
            </div>
            
            <div className="relative w-32 h-32">
              {/* Outer diamond layer (border) */}
              <div 
                className="absolute inset-0 w-32 h-32 bg-gray-300"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Inner diamond layer (background) */}
              <div 
                className="absolute inset-1 w-30 h-30 bg-white"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              />
              
              {/* Liquid fill container */}
              <div 
                className="absolute inset-1 w-30 h-30"
                style={{
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                }}
              >
                {/* Liquid fill - bottom to top */}
                <div 
                  className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#236c6c] to-[#2d8a8a]"
                  style={{ 
                    height: `${Math.min(bucket3Progress, 100)}%`,
                    transition: 'height 2s ease-out 1s'
                  }}
                />
              </div>
              
              {/* Percentage text overlay */}
              <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-white drop-shadow-lg">
                  {bucket3Progress.toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Current and bucket name at bottom */}
            <div className="mt-3 text-center">
              <div className="text-xs font-medium text-gray-700">Folyze Bucket 3 - Wealth Compounder</div>
            </div>
          </div>
        </div>
      </div>

      {/* Excel-like Table */}
      <div className="border border-gray-300 rounded overflow-auto bg-white" style={{ maxHeight: '70vh' }} ref={tableRef}>
        <div style={{ width: `${tableWidth}px`, minWidth: '100%' }}>
          {/* Header */}
          <div className="flex bg-gray-100 border-b-2 border-gray-300 sticky top-0">
            {renderHeaderCell('Bucket Name', 'bucketName')}
            {renderHeaderCell('Purpose', 'purpose')}
            {renderHeaderCell('Goal ₹', 'targetAmount')}
            {renderHeaderCell('Current ₹', 'currentValue')}
            {renderHeaderCell('% Achieved', 'progressPercent')}
            {renderHeaderCell('Shortfall ₹', 'shortfallAmount')}
            {renderHeaderCell('Annual Yield', 'annualYield')}
            {renderHeaderCell('XIRR', 'xirr')}
          </div>

          {/* Totals Row */}
          <div className="flex bg-blue-50 border-b-2 border-gray-300 sticky top-10">
            <div className="h-8 px-3 text-xs font-bold text-gray-700 border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.bucketName + columnWidths.purpose }}>
              TOTALS
            </div>
            <div className="h-8 px-3 text-xs font-bold text-blue-600 border-r border-gray-300 flex items-center justify-end" 
                 style={{ width: columnWidths.targetAmount }}>
              {formatCurrency(totals.targetAmount)}
            </div>
            <div className="h-8 px-3 text-xs font-bold text-green-600 border-r border-gray-300 flex items-center justify-end" 
                 style={{ width: columnWidths.currentValue }}>
              {formatCurrency(totals.currentValue)}
            </div>
            <div className={`h-8 px-3 text-xs font-bold border-r border-gray-300 flex items-center justify-end ${
              totalProgressPercent >= 80 ? 'text-green-600' : 
              totalProgressPercent >= 50 ? 'text-blue-600' : 'text-yellow-600'
            }`} style={{ width: columnWidths.progressPercent }}>
              {totalProgressPercent.toFixed(1)}%
            </div>
            <div className="h-8 px-3 text-xs font-bold text-orange-600 border-r border-gray-300 flex items-center justify-end" 
                 style={{ width: columnWidths.shortfallAmount }}>
              {formatCurrency(totals.shortfallAmount)}
            </div>
            <div className="h-8 px-3 text-xs border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.annualYield }}>
            </div>
            <div className="h-8 px-3 text-xs border-r border-gray-300 flex items-center" 
                 style={{ width: columnWidths.xirr }}>
            </div>
          </div>

          {/* Data Rows */}
          {buckets.map((bucket, index) => (
            <div key={bucket.bucketName} className="flex hover:bg-gray-50 border-b border-gray-200">
              {/* Bucket Name */}
              <div className="h-10 px-3 text-xs border-r border-gray-300 bg-white flex items-center font-medium"
                   style={{ width: columnWidths.bucketName }}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    bucket.bucketName.includes('1A') ? 'bg-blue-500' :
                    bucket.bucketName.includes('1B') ? 'bg-green-500' :
                    bucket.bucketName.includes('1C') ? 'bg-yellow-500' :
                    bucket.bucketName.includes('1D') ? 'bg-purple-500' :
                    bucket.bucketName.includes('1E') ? 'bg-pink-500' :
                    bucket.bucketName.includes('2') ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`}></div>
                  {getBucketDisplayName(bucket.bucketName)}
                </div>
              </div>
              
              {/* Purpose */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center"
                   style={{ width: columnWidths.purpose, height: 'auto' }}>
                {editingPurpose === bucket.bucketName && !['bucket2', 'bucket3'].includes(bucket.bucketName) ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full text-xs border border-blue-300 rounded px-1 py-0.5"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSavePurpose(bucket.bucketName);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      placeholder="Enter purpose..."
                    />
                    <button
                      onClick={() => handleSavePurpose(bucket.bucketName)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : ['bucket2', 'bucket3'].includes(bucket.bucketName) ? (
                  <div className="w-full p-1 text-gray-700 italic">
                    {bucket.purpose}
                  </div>
                ) : (
                  <div 
                    className="w-full cursor-pointer hover:bg-blue-50 p-1 rounded flex items-center justify-between"
                    onClick={() => handleEditPurpose(bucket.bucketName, bucket.purpose)}
                  >
                    <span className={bucket.purpose ? '' : 'text-gray-400 italic'}>
                      {bucket.purpose || 'Click to add purpose...'}
                    </span>
                    <Edit3 size={12} className="text-gray-400 hover:text-blue-600" />
                  </div>
                )}
              </div>
              
              {/* Goal Amount */}
              <div className="h-10 px-3 text-xs border-r border-gray-300 bg-white flex items-center justify-between"
                   style={{ width: columnWidths.targetAmount }}>
                {editingTarget === bucket.bucketName ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full text-xs border border-blue-300 rounded px-1 py-0.5"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTarget(bucket.bucketName);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <button
                      onClick={() => handleSaveTarget(bucket.bucketName)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium">{formatCurrency(bucket.targetAmount)}</span>
                    <button
                      onClick={() => handleEditTarget(bucket.bucketName, bucket.targetAmount)}
                      className="text-gray-400 hover:text-blue-600 ml-1"
                    >
                      <Edit3 size={12} />
                    </button>
                  </>
                )}
              </div>
              
              {/* Current Value */}
              <div className="h-10 px-3 text-xs border-r border-gray-300 bg-white flex items-center justify-end font-medium text-green-600"
                   style={{ width: columnWidths.currentValue }}>
                {formatCurrency(bucket.currentValue)}
              </div>
              
              {/* % Achieved */}
              <div className={`min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end font-medium ${
                bucket.progressPercent >= 80 ? 'text-green-600' : 
                bucket.progressPercent >= 50 ? 'text-blue-600' : 'text-yellow-600'
              }`} style={{ width: columnWidths.progressPercent, height: 'auto' }}>
                {bucket.progressPercent.toFixed(1)}%
              </div>
              
              {/* Shortfall Amount */}
              <div className="min-h-10 px-3 py-2 text-xs border-r border-gray-300 bg-white flex items-center justify-end font-medium text-orange-600"
                   style={{ width: columnWidths.shortfallAmount, height: 'auto' }}>
                {formatCurrency(Math.max(0, bucket.targetAmount - bucket.currentValue))}
              </div>
              
              {/* Annual Yield */}
              <div className={`h-10 px-3 text-xs border-r border-gray-300 bg-white flex items-center justify-end ${
                bucket.annualYield >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.annualYield }}>
                {formatPercent(bucket.annualYield)}
              </div>
              
              {/* XIRR */}
              <div className={`h-10 px-3 text-xs border-r border-gray-300 bg-white flex items-center justify-end ${
                bucket.xirr >= 0 ? 'text-green-600' : 'text-red-600'
              }`} style={{ width: columnWidths.xirr }}>
                {formatPercent(bucket.xirr)}
              </div>
            </div>
          ))}
          
          {buckets.length === 0 && (
            <div className="h-20 flex items-center justify-center text-gray-500 text-sm">
              No bucket data to display. Add trades with bucket allocations to see results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentBucketsTable;