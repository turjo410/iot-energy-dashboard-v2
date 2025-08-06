// components/widgets/InteractiveWidget.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Download, Settings } from 'lucide-react';

interface InteractiveWidgetProps {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
  onConfigure?: () => void;
}

export const InteractiveWidget: React.FC<InteractiveWidgetProps> = ({
  title,
  children,
  onExport,
  onConfigure
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
        isExpanded ? 'fixed inset-4 z-50' : 'relative'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              {onConfigure && (
                <button
                  onClick={onConfigure}
                  className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
              
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 text-gray-500 hover:text-purple-500 transition-colors"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Widget Content */}
      <div className={`p-4 ${isExpanded ? 'h-full overflow-auto' : ''}`}>
        {children}
      </div>

      {/* Backdrop for expanded state */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </motion.div>
  );
};
