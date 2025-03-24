import React, { useState, useEffect, useRef } from 'react';

interface TranslatorPageProps {
  onOpenSettings: () => void;
}

export const TranslatorPage: React.FC<TranslatorPageProps> = ({ onOpenSettings }) => {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCopyIndicator, setShowCopyIndicator] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  
  const sourceTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // API設定確認
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const apiKey = await window.electronAPI.getApiKey();
        setIsApiKeySet(!!apiKey);
        
        // APIキーが設定されていない場合は設定画面を表示
        if (!apiKey) {
          onOpenSettings();
        }
      } catch (error) {
        console.error('APIキーの確認に失敗しました:', error);
      }
    };
    
    checkApiKey();
  }, [onOpenSettings]);
  
  // キーボードショートカットの設定 (Ctrl + c連打で貼り付け)
  useEffect(() => {
    let lastCopyTime = 0;
    const copyThreshold = 500; // ミリ秒
    
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl + c が押されたかを確認
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const now = Date.now();
        
        // 一定時間内に再度Ctrl + cが押されたかを確認
        if (now - lastCopyTime < copyThreshold) {
          e.preventDefault();
          
          try {
            // クリップボードから内容を取得して入力欄に貼り付ける
            const clipboardText = await window.electronAPI.pasteFromClipboard();
            if (clipboardText) {
              setSourceText(clipboardText);
            }
          } catch (error) {
            console.error('クリップボードからの貼り付けに失敗しました:', error);
          }
        }
        
        lastCopyTime = now;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // 翻訳実行
  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('翻訳するテキストを入力してください。');
      return;
    }
    
    if (!isApiKeySet) {
      setError('APIキーが設定されていません。設定画面で設定してください。');
      onOpenSettings();
      return;
    }
    
    setIsTranslating(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.translateText(sourceText);
      
      if (result.error) {
        setError(result.error);
      } else {
        setTranslatedText(result.translatedText || '');
        setSourceLanguage(result.sourceLanguage || '');
        setTargetLanguage(result.targetLanguage || '');
      }
    } catch (error) {
      setError(`翻訳中にエラーが発生しました: ${(error as Error).message}`);
    } finally {
      setIsTranslating(false);
    }
  };
  
  // 入力クリア
  const handleClear = () => {
    setSourceText('');
    setTranslatedText('');
    setError(null);
    
    // 入力欄にフォーカス
    if (sourceTextAreaRef.current) {
      sourceTextAreaRef.current.focus();
    }
  };
  
  // 翻訳結果をクリップボードにコピー
  const handleCopy = async () => {
    if (!translatedText) return;
    
    try {
      await window.electronAPI.copyToClipboard(translatedText);
      
      // コピー成功インジケータを表示
      setShowCopyIndicator(true);
      setTimeout(() => {
        setShowCopyIndicator(false);
      }, 1500);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
    }
  };
  
  // クリップボードから貼り付け
  const handlePaste = async () => {
    try {
      const clipboardText = await window.electronAPI.pasteFromClipboard();
      if (clipboardText) {
        setSourceText(clipboardText);
      }
    } catch (error) {
      console.error('クリップボードからの貼り付けに失敗しました:', error);
    }
  };
  
  // 入力テキスト変更時の処理
  const handleSourceTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(e.target.value);
    
    // 自動翻訳のタイマーをリセット
    if (translateTimeoutRef.current) {
      clearTimeout(translateTimeoutRef.current);
    }
  };
  
  return (
    <>
      <div className="header">
        <div className="app-title">AI Translator</div>
        <button className="icon-button" onClick={onOpenSettings}>
          設定
        </button>
      </div>
      
      <div className="translation-container">
        <div className="translation-area">
          <div className="source-target-header">
            <span className="lang-label">
              {sourceLanguage ? `入力 (${sourceLanguage})` : '入力'}
            </span>
            <div>
              <button className="icon-button" onClick={handlePaste}>
                貼り付け
              </button>
              <button className="icon-button" onClick={handleClear}>
                クリア
              </button>
            </div>
          </div>
          
          <textarea
            ref={sourceTextAreaRef}
            className="text-area"
            value={sourceText}
            onChange={handleSourceTextChange}
            placeholder="翻訳するテキストを入力してください..."
            spellCheck={false}
          />
        </div>
        
        <div className="actions-bar">
          <button 
            className="primary-button" 
            onClick={handleTranslate} 
            disabled={isTranslating || !sourceText.trim()}
          >
            {isTranslating ? <span className="loader"></span> : '翻訳'}
          </button>
        </div>
        
        <div className="translation-area">
          <div className="source-target-header">
            <span className="lang-label">
              {targetLanguage ? `翻訳結果 (${targetLanguage})` : '翻訳結果'}
            </span>
            {translatedText && (
              <button className="icon-button" onClick={handleCopy}>
                コピー
              </button>
            )}
          </div>
          
          <div className="result-area">
            {translatedText}
            {showCopyIndicator && (
              <div className="copy-indicator visible">
                コピーしました
              </div>
            )}
          </div>
          
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </>
  );
}; 