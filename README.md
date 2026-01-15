# 📖 Reading Extension

An AI-powered Chrome extension that helps you understand what you read on the web. Select any text and get instant explanations powered by Google's Gemini AI.

## ✨ Features

- 🤖 **AI-Powered Explanations**: Get instant explanations for any selected text
- 💬 **Interactive Chat**: Ask follow-up questions about the content
- 🌐 **Full Page Context**: AI understands the context of the entire page
- 🎨 **Beautiful UI**: Modern, sleek interface with smooth animations
- 🔐 **Privacy-First**: Your API key is stored locally and never sent to our servers

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get Your Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 3. Run Development Server

```bash
npm run dev
```

### 4. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `build/chrome-mv3-dev` folder

### 5. Configure API Key

1. Click the extension icon in Chrome toolbar
2. Paste your Google AI API key in the settings
3. Click "Save Key"

## 📖 How to Use

1. Navigate to any webpage
2. Select any text you want to understand
3. A reading indicator will appear above your selection
4. Click the indicator to open the AI chat panel
5. Get instant explanations and ask follow-up questions!

## 🛠️ Development

This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!
