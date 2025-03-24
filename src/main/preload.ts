import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script is running...');

// レンダラープロセスに公開するAPIの定義
contextBridge.exposeInMainWorld('electronAPI', {
  // 翻訳
  translateText: (text: string) => ipcRenderer.invoke('translate-text', text),
  
  // 設定関連
  saveApiKey: (apiKey: string) => ipcRenderer.invoke('save-api-key', apiKey),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  saveProxyConfig: (config: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
  }) => ipcRenderer.invoke('save-proxy-config', config),
  getProxyConfig: () => ipcRenderer.invoke('get-proxy-config'),
  saveTheme: (theme: string) => ipcRenderer.invoke('save-theme', theme),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  
  // クリップボード関連
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  pasteFromClipboard: () => ipcRenderer.invoke('paste-from-clipboard'),
  
  // イベントリスナー
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', callback);
    return () => {
      ipcRenderer.removeListener('open-settings', callback);
    };
  }
});

// プリロードされたことをコンソールに記録
console.log('Preload script completed, exposed window.electronAPI');

// DOMロードイベントをリッスン
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded from preload script');
}); 