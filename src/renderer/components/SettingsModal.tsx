import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  theme, 
  onThemeChange 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [proxyEnabled, setProxyEnabled] = useState(false);
  const [proxyHost, setProxyHost] = useState('');
  const [proxyPort, setProxyPort] = useState('8080');
  const [proxyUsername, setProxyUsername] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // APIキーを読み込む
        const savedApiKey = await window.electronAPI.getApiKey();
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }
        
        // プロキシ設定を読み込む
        const proxyConfig = await window.electronAPI.getProxyConfig();
        if (proxyConfig) {
          setProxyEnabled(proxyConfig.enabled);
          setProxyHost(proxyConfig.host || '');
          setProxyPort(proxyConfig.port?.toString() || '8080');
          setProxyUsername(proxyConfig.username || '');
          setProxyPassword(proxyConfig.password || '');
        }
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // 設定を保存する
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      // APIキーを保存
      await window.electronAPI.saveApiKey(apiKey);
      
      // プロキシ設定を保存
      await window.electronAPI.saveProxyConfig({
        enabled: proxyEnabled,
        host: proxyHost,
        port: parseInt(proxyPort, 10) || 8080,
        username: proxyUsername,
        password: proxyPassword
      });
      
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      setSaveError(`設定の保存に失敗しました: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };
  
  // 設定をキャンセルして閉じる
  const handleCancel = () => {
    onClose();
  };
  
  return (
    <div className="settings-modal">
      <div className="settings-content">
        <h2 className="settings-title">設定</h2>
        
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label" htmlFor="apiKey">
              OpenAI APIキー
            </label>
            <input
              id="apiKey"
              className="form-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <small>
              API キーは<a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noreferrer">OpenAIウェブサイト</a>から取得できます。
            </small>
          </div>
          
          <div className="form-group">
            <label className="form-label" htmlFor="theme">
              テーマ
            </label>
            <select
              id="theme"
              className="form-input"
              value={theme}
              onChange={(e) => onThemeChange(e.target.value as 'light' | 'dark' | 'system')}
            >
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="system">システム設定に従う</option>
            </select>
          </div>
          
          <div className="form-group">
            <div>
              <input
                id="proxyEnabled"
                type="checkbox"
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
              />
              <label htmlFor="proxyEnabled">
                プロキシを使用する
              </label>
            </div>
            
            {proxyEnabled && (
              <div className="proxy-settings">
                <div className="proxy-fields">
                  <div className="form-group">
                    <label className="form-label" htmlFor="proxyHost">
                      ホスト
                    </label>
                    <input
                      id="proxyHost"
                      className="form-input"
                      type="text"
                      value={proxyHost}
                      onChange={(e) => setProxyHost(e.target.value)}
                      placeholder="例: proxy.example.com"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="proxyPort">
                      ポート
                    </label>
                    <input
                      id="proxyPort"
                      className="form-input"
                      type="number"
                      value={proxyPort}
                      onChange={(e) => setProxyPort(e.target.value)}
                      min="1"
                      max="65535"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="proxyUsername">
                      ユーザー名（オプション）
                    </label>
                    <input
                      id="proxyUsername"
                      className="form-input"
                      type="text"
                      value={proxyUsername}
                      onChange={(e) => setProxyUsername(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label" htmlFor="proxyPassword">
                      パスワード（オプション）
                    </label>
                    <input
                      id="proxyPassword"
                      className="form-input"
                      type="password"
                      value={proxyPassword}
                      onChange={(e) => setProxyPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {saveError && <p className="error-message">{saveError}</p>}
          {saveSuccess && <p className="success-message">設定を保存しました！</p>}
          
          <div className="form-actions">
            <button className="button" onClick={handleCancel}>
              キャンセル
            </button>
            <button
              className="primary-button"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <span className="loader"></span> : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 