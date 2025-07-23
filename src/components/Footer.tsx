import React, { useState, Suspense } from 'react';
import LazyImage from './LazyImage';

// Lazy load ContactForm
const ContactForm = React.lazy(() => import('./ContactForm'));

const Footer: React.FC = () => {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <LazyImage src="/Original on transparent copy.png" alt="Portfolyze Logo" className="h-8" />
            </div>
          </div>
          
          {/* Footer Links */}
          <div className="flex justify-center items-center space-x-6 pt-4 border-t border-gray-800">
            <span className="text-xs text-gray-500">© 2025 Portfolyze</span>
            <button
              onClick={() => setShowContact(true)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Contact us
            </button>
            <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Privacy
            </button>
            <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Terms of use
            </button>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <Suspense fallback={null}>
        <ContactForm isOpen={showContact} onClose={() => setShowContact(false)} />
      </Suspense>
    </>
  );
};

export default Footer;