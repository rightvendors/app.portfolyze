import React from 'react';

const EnvTest: React.FC = () => {
  const envVars = {
    VITE_NAV_API_BASE: import.meta.env.VITE_NAV_API_BASE,
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };

  const allEnvVars = import.meta.env ? Object.keys(import.meta.env) : [];

  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', margin: '10px', borderRadius: '8px' }}>
      <h3>Environment Variables Test</h3>
      <div>
        <h4>Specific Variables:</h4>
        <pre>{JSON.stringify(envVars, null, 2)}</pre>
      </div>
      <div>
        <h4>All Environment Variables:</h4>
        <pre>{JSON.stringify(allEnvVars, null, 2)}</pre>
      </div>
      <div>
        <h4>Import Meta Object:</h4>
        <pre>{JSON.stringify(import.meta, null, 2)}</pre>
      </div>
    </div>
  );
};

export default EnvTest;
