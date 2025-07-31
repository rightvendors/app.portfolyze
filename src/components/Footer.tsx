import React, { useState, Suspense } from 'react';
import LazyImage from './LazyImage';

// Lazy load components
const ContactForm = React.lazy(() => import('./ContactForm'));
const Privacy = React.lazy(() => import('./Privacy'));
const TermsOfUse = React.lazy(() => import('./TermsOfUse'));

const Footer: React.FC = () => {
  const [showContact, setShowContact] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <LazyImage src="/Original on transparent.png" alt="Portfolyze Logo" className="h-8" />
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
            <button 
              onClick={() => setShowPrivacy(true)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Privacy
            </button>
            <button 
              onClick={() => setShowTerms(true)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Terms of use
            </button>
          </div>
        </div>
      </footer>

      {/* Contact Modal */}
      <Suspense fallback={null}>
        <ContactForm isOpen={showContact} onClose={() => setShowContact(false)} />
      </Suspense>

      {/* Privacy Modal */}
      <Suspense fallback={null}>
        {showPrivacy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setShowPrivacy(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Privacy />
            </div>
          </div>
        )}
      </Suspense>

      {/* Terms of Use Modal */}
      <Suspense fallback={null}>
        {showTerms && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setShowTerms(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L6 6l12 12" />
                </svg>
              </button>
              <TermsOfUse />
            </div>
          </div>
        )}
      </Suspense>
    </>
  );
};

export default Footer;