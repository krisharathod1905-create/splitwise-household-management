# QueueLess Government Office

QueueLess helps citizens check government-office queues and book virtual tokens.

## QueueLess Mitra assistant

The site-wide QueueLess Mitra assistant supports multilingual text, optional browser voice input and read-aloud, and a choice of simple, standard, or senior-friendly replies. It can check the signed-in citizen's own active token through the existing authenticated token APIs. Verified token details are shown directly from QueueLess and are excluded from AI conversation history. The assistant does not let users book or cancel tokens through chat.

### Configure AI replies

1. Copy `server/.env.example` to `server/.env` if you have not already configured the server.
2. Add an OpenAI API key to the **server-only** environment:

   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=your_enabled_text_model
   ```

   Set `OPENAI_MODEL` to a cost-effective text model enabled for your OpenAI account; QueueLess intentionally does not assume that a particular model is available to your account. API usage may incur charges under your OpenAI plan; check current pricing and quotas in your OpenAI account. Never put the key in the client environment, browser code, or a public repository.
3. Install server dependencies and start the backend:

   ```powershell
   npm install --prefix server
   npm run dev --prefix server
   ```
4. In another terminal, start the client:

   ```powershell
   npm install --prefix client
   npm run dev --prefix client
   ```

If the AI key is missing, rejected, rate-limited, over quota, or the provider is unavailable, the assistant clearly labels its response as demo guidance and uses a small built-in set of non-live QueueLess answers. It never invents token data, wait times, office policies, or completed actions.

### Languages and voice

The assistant can auto-detect Gujarati, Hindi, English, Hinglish, and Gujarati-English mixed text, or use a manually selected language. AI availability and accuracy depend on the configured model. Browser speech recognition and speech synthesis are used where supported; support, recognition quality, and available voices vary by browser and device. Speech features do not require an OpenAI speech API. Browser speech recognition may process audio according to the browser provider's policy; QueueLess does not receive or save voice recordings. Text chat remains available when voice is unsupported.

The assistant does not collect a user's age. Citizens can choose a respectful reply style themselves. A sign-in is required to check private token status; the existing backend restricts token details to the token owner (or authorized staff/admin).

## Document verification

Admins can configure required or optional documents and instructions for each office service. Citizens can upload, replace, and track PDF, JPG, and PNG files while booking or from token details; missing files do not prevent token issuance. Staff see only submissions from offices assigned to them and services supported by their counters. Review decisions and replacement requests are recorded in audit logs and surfaced as in-app notifications.

The server accepts files up to 10 MB and checks their file signatures. Development files are written under `server/private-documents` by default (override with `DOCUMENT_STORAGE_PATH`); this directory is excluded from Git. Files are never exposed through a public static directory. All downloads and previews require authentication and are checked against citizen ownership or staff office/service assignments.

`DOCUMENT_RETENTION_DAYS` controls daily deletion of expired file contents (default: 90 days); review metadata is retained. Back up or securely remove the private storage directory according to your deployment's data-retention policy. The local disk backend is intended for development or a single persistent server. Before production, replace it with a private object-storage adapter and provide backups, encryption at rest, malware scanning, and access policies. The feature does not send documents to the AI assistant or an external OCR provider.
