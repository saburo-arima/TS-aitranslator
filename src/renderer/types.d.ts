interface ElectronAPI {
  // 翻訳
  translateText: (text: string) => Promise<{
    translatedText?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    error?: string;
  }>;
  
  // 設定関連
  saveApiKey: (apiKey: string) => Promise<{ success: boolean }>;
  getApiKey: () => Promise<string>;
  saveProxyConfig: (config: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
  }) => Promise<{ success: boolean }>;
  getProxyConfig: () => Promise<{
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
  }>;
  saveTheme: (theme: string) => Promise<{ success: boolean }>;
  getTheme: () => Promise<string>;
  
  // クリップボード関連
  copyToClipboard: (text: string) => Promise<{ success: boolean }>;
  pasteFromClipboard: () => Promise<string>;
  
  // イベントリスナー
  onOpenSettings: (callback: () => void) => () => void;
}

interface Window {
  electronAPI: ElectronAPI;
}

interface TranslationHistory {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
} 