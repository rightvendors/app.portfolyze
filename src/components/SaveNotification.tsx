import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

interface SaveNotificationProps {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'loading';
  onHide: () => void;
}

const SaveNotification: React.FC<SaveNotificationProps> = ({ show, message, type, onHide }) => {
  useEffect(() => {
    if (show && type !== 'loading') {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, type, onHide]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'loading':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'loading':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg border ${getBgColor()} shadow-lg transition-all duration-300`}>
      {getIcon()}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default SaveNotification; 