import React from 'react';

/**
 * Zoop Web Main Layout Container
 * 
 * Domain Separation:
 * - app.zoop.com (User & Org Management)
 * - admin.zoop.com (Internal Zoop Platform Operations)
 */
export const App: React.FC = () => {
  return (
    <div>
      <header>
        <h1>Zoop Web</h1>
      </header>
      <main>
        {/* Module components rendered here based on route/domain */}
      </main>
    </div>
  );
};

export default App;
