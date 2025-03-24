import { app, BrowserWindow, ipcMain, clipboard, Menu, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as url from 'url';
import { OpenAI } from 'openai';
import Store from 'electron-store';
import * as crypto from 'crypto-js';

// 暗号化のためのシークレットキー生成（マシン固有の値を使用）
const getMachineSecret = (): string => {
  const machineId = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0].model}`;
  return crypto.SHA256(machineId).toString();
};

// 暗号化・復号化のためのユーティリティ関数
const encrypt = (text: string): string => {
  return crypto.AES.encrypt(text, getMachineSecret()).toString();
};

const decrypt = (ciphertext: string): string => {
  try {
    const bytes = crypto.AES.decrypt(ciphertext, getMachineSecret());
    return bytes.toString(crypto.enc.Utf8);
  } catch (error) {
    console.error('復号化エラー:', error);
    return '';
  }
};

interface StoreSchema {
  encryptedApiKey: string; // APIキーを暗号化して保存
  proxyConfig: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
  };
  theme: 'light' | 'dark' | 'system';
}

// 設定を保存するためのストアを初期化
const store = new Store<StoreSchema>({
  schema: {
    encryptedApiKey: {
      type: 'string',
      default: ''
    },
    proxyConfig: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: false },
        host: { type: 'string', default: '' },
        port: { type: 'number', default: 8080 },
        username: { type: 'string', default: '' },
        password: { type: 'string', default: '' }
      },
      default: {
        enabled: false,
        host: '',
        port: 8080,
        username: '',
        password: ''
      }
    },
    theme: {
      type: 'string',
      enum: ['light', 'dark', 'system'],
      default: 'system'
    }
  }
});

// APIキーの取得（復号化）
const getApiKey = (): string => {
  const encryptedApiKey = store.get('encryptedApiKey');
  if (!encryptedApiKey) return '';
  return decrypt(encryptedApiKey);
};

// APIキーの保存（暗号化）
const setApiKey = (apiKey: string): void => {
  const encryptedApiKey = encrypt(apiKey);
  store.set('encryptedApiKey', encryptedApiKey);
};

// メインウィンドウの参照をグローバルに保持
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // ブラウザウィンドウの作成
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true
    },
    show: false, // 読み込みが完了してから表示
    backgroundColor: '#f5f5f5'
  });

  // 開発ツールを常に開く
  mainWindow.webContents.openDevTools();

  // HTMLファイルの読み込み
  const startUrl = url.format({
    pathname: path.join(__dirname, 'renderer', 'index.html'),
    protocol: 'file:',
    slashes: true
  });

  console.log('Loading URL:', startUrl);
  console.log('preload.js path:', path.join(__dirname, 'preload.js'));
  console.log('__dirname:', __dirname);
  console.log('Resolved HTML path:', path.join(__dirname, 'renderer', 'index.html'));
  
  // ウェブコンテンツの読み込みエラーを監視
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // HTMLの準備完了イベント
  mainWindow.webContents.on('dom-ready', () => {
    console.log('DOM is ready');
    
    // ページ内のコンソールログをメインプロセスに転送
    mainWindow?.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`Renderer (${sourceId}:${line}): ${message}`);
    });
  });

  mainWindow.loadURL(startUrl);

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 読み込み完了時に表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // メニューの作成
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '設定',
          click: () => {
            mainWindow?.webContents.send('open-settings');
          }
        },
        { type: 'separator' },
        {
          label: '終了',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す' },
        { role: 'redo', label: 'やり直す' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り' },
        { role: 'copy', label: 'コピー' },
        { role: 'paste', label: '貼り付け' },
        { role: 'delete', label: '削除' },
        { type: 'separator' },
        { role: 'selectAll', label: 'すべて選択' }
      ]
    },
    {
      label: '表示',
      submenu: [
        { role: 'reload', label: '再読み込み' },
        { role: 'forceReload', label: '強制再読み込み' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'ズームをリセット' },
        { role: 'zoomIn', label: '拡大' },
        { role: 'zoomOut', label: '縮小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'フルスクリーン切替' }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'バージョン情報',
          click: () => {
            showAboutDialog();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function showAboutDialog() {
  const version = app.getVersion();
  const electronVersion = process.versions.electron;
  const chromeVersion = process.versions.chrome;
  const nodeVersion = process.versions.node;
  const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;

  const aboutWindow = new BrowserWindow({
    width: 400,
    height: 300,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow || undefined,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  aboutWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <title>バージョン情報</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 20px;
            background-color: #f5f5f5;
            text-align: center;
          }
          h1 {
            margin-bottom: 5px;
            font-size: 18px;
          }
          p {
            margin: 5px 0;
            font-size: 14px;
            color: #555;
          }
        </style>
      </head>
      <body>
        <h1>AI Translator</h1>
        <p>バージョン: ${version}</p>
        <p>Electron: ${electronVersion}</p>
        <p>Chrome: ${chromeVersion}</p>
        <p>Node.js: ${nodeVersion}</p>
        <p>OS: ${osInfo}</p>
      </body>
    </html>
  `);

  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

// アプリケーションの初期化が完了したら実行
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOSではドックアイコンをクリックしたときにウィンドウがない場合は
    // 新しいウィンドウを作成する
    if (mainWindow === null) {
      createWindow();
    }
  });

  // OpenAI APIを使って翻訳を行う
  ipcMain.handle('translate-text', async (_, text: string) => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        return { error: 'APIキーが設定されていません。設定画面でAPIキーを設定してください。' };
      }

      // 3000文字以上はエラー
      if (text.length > 3000) {
        return { error: '翻訳できるテキストは3000文字までです。' };
      }

      // プロキシ設定の取得
      const proxyConfig = store.get('proxyConfig');

      let fetchOptions = {};
      
      // プロキシ設定が有効の場合
      if (proxyConfig && proxyConfig.enabled && proxyConfig.host) {
        const proxyUrl = `http://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
        fetchOptions = {
          proxy: proxyUrl
        };
      }

      // OpenAI APIクライアントの初期化
      const openai = new OpenAI({
        apiKey,
        fetch: fetchOptions ? (url, options) => {
          return fetch(url, { ...options, ...fetchOptions });
        } : undefined
      });

      // 入力言語の判定（簡易的な方法）
      const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
      const targetLanguage = isJapanese ? '英語' : '日本語';

      // システムプロンプトの設定
      const systemPrompt = `あなたは高性能な翻訳AIです。与えられたテキストを${targetLanguage}に翻訳してください。
      - 元の文脈や意味を保ちながら、自然な${targetLanguage}に翻訳してください。
      - 専門用語や固有名詞は適切に処理してください。
      - 翻訳結果のみを返してください。説明は不要です。`;

      // GPT-4を使って翻訳
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      // 翻訳結果を返す
      return { 
        translatedText: completion.choices[0].message.content,
        sourceLanguage: isJapanese ? '日本語' : '英語',
        targetLanguage: isJapanese ? '英語' : '日本語'
      };
    } catch (error) {
      console.error('Translation error:', error);
      return { error: `翻訳エラー: ${(error as Error).message}` };
    }
  });

  // API設定の保存
  ipcMain.handle('save-api-key', (_, apiKey: string) => {
    setApiKey(apiKey);
    return { success: true };
  });

  // API設定の取得
  ipcMain.handle('get-api-key', () => {
    return getApiKey();
  });

  // プロキシ設定の保存
  ipcMain.handle('save-proxy-config', (_, config) => {
    store.set('proxyConfig', config);
    return { success: true };
  });

  // プロキシ設定の取得
  ipcMain.handle('get-proxy-config', () => {
    return store.get('proxyConfig');
  });

  // テーマ設定の保存
  ipcMain.handle('save-theme', (_, theme: string) => {
    store.set('theme', theme);
    return { success: true };
  });

  // テーマ設定の取得
  ipcMain.handle('get-theme', () => {
    return store.get('theme');
  });

  // クリップボードにコピー
  ipcMain.handle('copy-to-clipboard', (_, text: string) => {
    clipboard.writeText(text);
    return { success: true };
  });

  // クリップボードから貼り付け
  ipcMain.handle('paste-from-clipboard', () => {
    return clipboard.readText();
  });
});

// 全てのウィンドウが閉じられたら終了
app.on('window-all-closed', () => {
  // macOSでは、ユーザーがCmd + Qで明示的に終了するまで
  // アプリケーションとそのメニューバーは有効なままにするのが一般的
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// このメソッドはElectronが初期化を完了し、
// ブラウザウィンドウを作成する準備ができたときに呼ばれます。
// 一部のAPIはこのイベントが発生した後にのみ使用できます。
app.on('ready', () => {
  // 準備完了後の処理
}); 