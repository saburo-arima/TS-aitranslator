import React, { useState, useEffect } from 'react';
import { TranslatorPage } from './TranslatorPage';
import { SettingsModal } from './SettingsModal';

const App: React.FC = () => {
  console.log('App component rendering...');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [error, setError] = useState<string | null>(null);
  
  // テーマの設定を読み込む
  useEffect(() => {
    console.log('App useEffect running...');
    
    const loadTheme = async () => {
      try {
        console.log('Loading theme...');
        
        if (!window.electronAPI) {
          console.error('electronAPI is not available in window object');
          setError('electronAPI is not available. This might be due to preload script not loading correctly.');
          return;
        }
        
        const savedTheme = await window.electronAPI.getTheme() as 'light' | 'dark' | 'system';
        console.log('Theme loaded:', savedTheme);
        setTheme(savedTheme || 'system');
        applyTheme(savedTheme || 'system');
      } catch (error) {
        console.error('テーマの設定の読み込みに失敗しました:', error);
        setError(`テーマの設定の読み込みに失敗しました: ${(error as Error).message}`);
      }
    };
    
    loadTheme();
    
    // 設定画面を開くイベントのリスナーを設定
    let unsubscribe = () => {};
    try {
      if (window.electronAPI) {
        unsubscribe = window.electronAPI.onOpenSettings(() => {
          setIsSettingsOpen(true);
        });
      }
    } catch (error) {
      console.error('設定画面を開くイベントリスナーの設定に失敗しました:', error);
    }
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // テーマを適用する
  const applyTheme = (newTheme: string) => {
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };
  
  // テーマの変更を保存する
  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    if (window.electronAPI) {
      await window.electronAPI.saveTheme(newTheme);
    }
  };
  
  if (error) {
    return (
      <div className="container" style={{ padding: '2rem', color: 'red' }}>
        <h2>エラーが発生しました</h2>
        <p>{error}</p>
        <p>アプリケーションを再起動してください。問題が解決しない場合は開発者にお問い合わせください。</p>
      </div>
    );
  }
  
  return (
    <div className="container">
      <TranslatorPage onOpenSettings={() => setIsSettingsOpen(true)} />
      
      {isSettingsOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsOpen(false)} 
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}
    </div>
  );
};

export default App; 