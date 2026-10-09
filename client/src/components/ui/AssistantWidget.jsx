import { useEffect, useRef, useState } from "react";
import { FiX, FiMessageCircle, FiSend, FiMic, FiVolume2, FiVolumeX, FiPause, FiPlay, FiStopCircle } from "react-icons/fi";
import { useAuth } from "@/contexts/AuthContext";
import { assistantApi, tokenApi } from "@/lib/api";

const languages = [
  { value: "auto", label: "Auto-detect", locale: "" },
  { value: "gu", label: "Gujarati", locale: "gu-IN" },
  { value: "hi", label: "Hindi", locale: "hi-IN" },
  { value: "en", label: "English", locale: "en-IN" },
  { value: "hinglish", label: "Hinglish", locale: "hi-IN" },
  { value: "gujlish", label: "Gujarati + English", locale: "gu-IN" },
  { value: "other", label: "Another language", locale: "" },
];

const tones = [
  { value: "simple", label: "Simple language" },
  { value: "standard", label: "Standard" },
  { value: "senior", label: "Senior-friendly" },
];

const verifiedTokenReply = ({ tokenNumber, status, office, service, wait, language }) => {
  const cleanStatus = status.replaceAll("_", " ");
  if (language === "Hindi") {
    return `आपका टोकन ${tokenNumber} ${office} में ${service ? `${service} सेवा के लिए ` : ""}${cleanStatus} स्थिति में है।${wait === null ? " वर्तमान प्रतीक्षा समय की पुष्टि नहीं हो सकी। कृपया टोकन पेज देखें।" : ` नया अनुमानित प्रतीक्षा समय लगभग ${wait} मिनट है।`}`;
  }
  if (language === "Gujarati") {
    return `તમારું ટોકન ${tokenNumber} ${office} ખાતે ${service ? `${service} સેવા માટે ` : ""}${cleanStatus} સ્થિતિમાં છે.${wait === null ? " હાલના રાહ સમયની પુષ્ટિ થઈ શકી નથી. કૃપા કરીને ટોકન પેજ જુઓ." : ` તાજો અંદાજિત રાહ સમય આશરે ${wait} મિનિટ છે.`}`;
  }
  if (language === "Hinglish") {
    return `Aapka token ${tokenNumber} ${office} par ${service ? `${service} service ke liye ` : ""}${cleanStatus} status mein hai.${wait === null ? " Current waiting time verify nahi ho saka. Token page check kijiye." : ` Latest estimated wait lagbhag ${wait} minute hai.`}`;
  }
  if (language === "Gujarati + English") {
    return `તમારું token ${tokenNumber} ${office} ખાતે ${service ? `${service} service માટે ` : ""}${cleanStatus} statusમાં છે.${wait === null ? " હાલનો waiting time verify થઈ શક્યો નથી. કૃપા કરીને token page જુઓ." : ` તાજો estimated wait આશરે ${wait} મિનિટ છે.`}`;
  }
  return `Your token ${tokenNumber} is currently ${cleanStatus} at ${office}${service ? ` for ${service}` : ""}.${wait === null ? " I can’t verify a current waiting-time estimate right now; check the token page for updates." : ` The latest estimated wait is about ${wait} minutes.`}`;
};

export default function AssistantWidget() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("auto");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [otherLocale, setOtherLocale] = useState("");
  const [tone, setTone] = useState("standard");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const [speakingStatus, setSpeakingStatus] = useState("idle");
  const [voiceNotice, setVoiceNotice] = useState("");
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const toggleRef = useRef(null);
  const recognitionRef = useRef(null);
  const language = languages.find((item) => item.value === languageCode);
  const languageName = languageCode === "other" ? otherLanguage.trim() : languageCode === "auto" ? "auto" : language.label;

  const getVoiceLocale = () => {
    const requestedLocale = languageCode === "other" ? otherLocale.trim() : language?.locale;
    if (!requestedLocale) return navigator.language;
    try {
      return Intl.getCanonicalLocales(requestedLocale)[0];
    } catch {
      setVoiceNotice("That voice language code is not valid. Using your browser's default language instead.");
      return navigator.language;
    }
  };

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        recognitionRef.current?.abort();
        window.speechSynthesis?.cancel();
        setIsListening(false);
        setSpeakingStatus("idle");
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const closeAssistant = () => {
    setIsOpen(false);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
    setIsListening(false);
    setSpeakingStatus("idle");
    toggleRef.current?.focus();
  };

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      setVoiceNotice("Read-aloud is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const detectedLocale = /[\u0A80-\u0AFF]/u.test(text)
      ? "gu-IN"
      : /[\u0900-\u097F]/u.test(text)
        ? "hi-IN"
        : languageCode === "auto" && /\b(mera|meri|kaise|kab|hai|kijiye|aapka)\b/iu.test(text)
          ? "hi-IN"
          : getVoiceLocale();
    utterance.lang = languageCode === "auto" ? detectedLocale : getVoiceLocale();
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase().split("-")[0]));
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.onstart = () => setSpeakingStatus("speaking");
    utterance.onend = () => setSpeakingStatus("idle");
    utterance.onerror = () => {
      setSpeakingStatus("idle");
      setVoiceNotice("Your device could not play this language. Try another installed voice.");
    };
    window.speechSynthesis.speak(utterance);
    setVoiceNotice("");
  };

  const sendMessage = async (text) => {
    const content = text.trim();
    if (!content || isLoading || !languageName) return;

    const currentMessage = { role: "user", content };
    const priorMessages = messages.filter((message) => message.mode !== "verified").slice(-10);
    const history = [currentMessage];
    for (let index = priorMessages.length - 1; index >= 0; index -= 1) {
      const candidate = [priorMessages[index], ...history];
      if (new TextEncoder().encode(JSON.stringify(candidate)).byteLength > 9000) break;
      history.unshift(priorMessages[index]);
    }
    setMessages((current) => [...current, { role: "user", content }]);
    setDraft("");
    setIsLoading(true);
    setVoiceNotice("");

    try {
      const response = await assistantApi.chat({ language: languageName, tone, messages: history });
      const { reply, mode, notice } = response.data.data;
      setMessages((current) => [...current, { role: "assistant", content: reply, mode, notice }]);
      if (speakReplies) speak(reply);
    } catch (error) {
      const message = error.response?.data?.message || "I couldn't respond just now. Please check your connection and try again.";
      setMessages((current) => [...current, { role: "assistant", content: message, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice("Voice input is not supported in this browser. Try an up-to-date version of Chrome or Edge.");
      return;
    }

    setVoiceNotice("");
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = getVoiceLocale();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDraft(transcript);
      setVoiceNotice("Speech recognized. Review or edit the message, then choose Send.");
    };
    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access in your browser settings."
        : event.error === "no-speech"
          ? "I didn't hear anything. Please try again."
          : "Voice input stopped. You can type your message instead.";
      setVoiceNotice(message);
    };
    recognition.onend = () => setIsListening(false);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceNotice("Voice input could not start. Check your microphone permissions and try again.");
    }
  };

  const stopListening = () => recognitionRef.current?.stop();
  const cancelListening = () => {
    recognitionRef.current?.abort();
    setIsListening(false);
    setVoiceNotice("Recording cancelled.");
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeakingStatus("idle");
  };

  const appendAssistantMessage = (content, extra = {}) => {
    setMessages((current) => [...current, { role: "assistant", content, ...extra }]);
  };

  const checkMyToken = async () => {
    if (!isAuthenticated) {
      appendAssistantMessage("Please sign in first. Then I can look up your own token securely from your QueueLess account.");
      return;
    }
    setIsLoading(true);
    setVoiceNotice("");
    try {
      const response = await tokenApi.getMyTokens({ limit: 20 });
      const tokens = response.data.data.tokens || [];
      const activeStatuses = new Set(["issued", "checked_in", "called", "in_service"]);
      const ownActiveToken = tokens.find((token) => activeStatuses.has(token.status));
      if (!ownActiveToken) {
        appendAssistantMessage("I couldn’t find an active token in your account. You can book one from the Book Token page.");
        return;
      }

      const detailResponse = await tokenApi.getById(ownActiveToken._id);
      const { token, prediction } = detailResponse.data.data;
      const officeName = token.officeId?.name || "your selected office";
      const serviceName = token.serviceId?.name;
      const wait = Number.isFinite(prediction?.estimatedWaitMinutes) ? prediction.estimatedWaitMinutes : null;
      const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
      const selectedLanguage = languageCode === "auto"
        ? /[\u0A80-\u0AFF]/u.test(lastUserMessage)
          ? /[A-Za-z]/u.test(lastUserMessage) ? "Gujarati + English" : "Gujarati"
          : /[\u0900-\u097F]/u.test(lastUserMessage)
            ? "Hindi"
            : /\b(mera|meri|kaise|kab|hai|kijiye|aapka)\b/iu.test(lastUserMessage)
              ? "Hinglish"
              : "English"
        : language.label;
      const content = verifiedTokenReply({
        tokenNumber: token.tokenNumber,
        status: token.status,
        office: officeName,
        service: serviceName,
        wait,
        language: selectedLanguage,
      });
      appendAssistantMessage(content, { mode: "verified" });
    } catch (error) {
      const message = error.response?.status === 401
        ? "Please sign in to check your token."
        : error.response?.data?.message || "I couldn’t verify your token right now. Please check your QueueLess dashboard.";
      appendAssistantMessage(message, { isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    if (action === "token" || action === "wait") {
      void checkMyToken();
      return;
    }
    if (action === "language") {
      document.getElementById("assistant-language")?.focus();
      return;
    }
    const recentText = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const preferredLanguage = languageCode === "auto"
      ? /[\u0A80-\u0AFF]/u.test(recentText) ? "gu" : /[\u0900-\u097F]/u.test(recentText) ? "hi" : "en"
      : languageCode;
    const questions = {
      booking: preferredLanguage === "hi" ? "मैं वर्चुअल टोकन कैसे बुक करूँ?" : preferredLanguage === "gu" ? "હું વર્ચ્યુઅલ ટોકન કેવી રીતે બુક કરું?" : "How do I book a virtual token?",
    };
    void sendMessage(questions[action]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  return (
    <div className="assistant-widget">
      <section id="assistant-panel" className={`assistant-panel assistant-panel--${tone}`} aria-labelledby="assistant-title" hidden={!isOpen}>
          <header className="assistant-header">
            <div>
              <div className="assistant-brand">
                <span className="assistant-avatar" aria-hidden="true"><FiMessageCircle /></span>
                <span>
                  <h2 id="assistant-title">QueueLess Mitra</h2>
                  <p><span className="assistant-online-dot" /> Ready to help</p>
                </span>
              </div>
            </div>
            <button
              type="button"
              className="assistant-icon-button assistant-close"
              onClick={closeAssistant}
              aria-label="Close assistant"
            >
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div className="assistant-settings">
            <label>
              Language
              <select id="assistant-language" value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
                {languages.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {languageCode === "other" && (
              <>
                <label>
                  Your language
                  <input
                    value={otherLanguage}
                    onChange={(event) => setOtherLanguage(event.target.value)}
                    placeholder="Type a language name"
                    maxLength={60}
                  />
                </label>
                <label>
                  Voice language code (optional)
                  <input
                    value={otherLocale}
                    onChange={(event) => setOtherLocale(event.target.value)}
                    placeholder="For example: sw-KE"
                    maxLength={20}
                  />
                </label>
              </>
            )}
            <label>
              Reply style
              <select value={tone} onChange={(event) => setTone(event.target.value)}>
                {tones.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={`assistant-voice-toggle ${speakReplies ? "is-active" : ""}`}
              onClick={() => {
                setSpeakReplies((enabled) => !enabled);
                if (speakReplies) stopSpeaking();
              }}
              aria-pressed={speakReplies}
            >
              {speakReplies ? <FiVolume2 aria-hidden="true" /> : <FiVolumeX aria-hidden="true" />}
              Read replies aloud
            </button>
          </div>

          <div ref={messagesRef} className="assistant-messages" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && (
              <>
                <p className="assistant-empty">
                  Namaste! Ask me about QueueLess in Gujarati, Hindi, English, or a mix. I’ll do my best to reply in your language.
                </p>
                <div className="assistant-quick-actions" aria-label="Suggested questions">
                  <button type="button" onClick={() => handleQuickAction("token")}>Check my token</button>
                  <button type="button" onClick={() => handleQuickAction("wait")}>Estimated waiting time</button>
                  <button type="button" onClick={() => handleQuickAction("booking")}>How do I book a token?</button>
                  <button type="button" onClick={() => handleQuickAction("language")}>Change language</button>
                </div>
              </>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`assistant-message assistant-message--${message.role}`}>
                <p>{message.content}</p>
                {message.mode === "demo" && <p className="assistant-mode-notice">Demo guidance · {message.notice}</p>}
                {message.mode === "verified" && <p className="assistant-mode-notice">Verified from your QueueLess account</p>}
                {message.role === "assistant" && !message.isError && (
                  <button
                    type="button"
                    className="assistant-read-button"
                    onClick={() => speak(message.content)}
                    aria-label={`Read assistant reply ${index + 1} aloud`}
                  >
                    <FiVolume2 aria-hidden="true" /> Read aloud
                  </button>
                )}
              </div>
            ))}
            {isLoading && <p className="assistant-loading" role="status"><span className="assistant-typing-dots" aria-hidden="true">•••</span> Preparing a helpful reply…</p>}
          </div>

          <form className="assistant-compose" onSubmit={handleSubmit}>
            <label className="assistant-sr-only" htmlFor="assistant-message">Your message</label>
            <textarea
              id="assistant-message"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type or use your voice…"
              rows={2}
              maxLength={2000}
              disabled={isLoading}
            />
            {isListening && (
              <div className="assistant-recording" role="status">
                <span className="assistant-recording-dot" /> Listening — speak now
                <button type="button" onClick={stopListening}>Stop</button>
                <button type="button" onClick={cancelListening}>Cancel recording</button>
              </div>
            )}
            <div className="assistant-actions">
              <button
                type="button"
                className={`assistant-action-button ${isListening ? "is-active" : ""}`}
                onClick={startListening}
                disabled={isLoading || isListening || !languageName}
                aria-label={isListening ? "Listening for your message" : `Start voice recording in ${languageName || "your selected language"}`}
              >
                <FiMic aria-hidden="true" />
                Speak
              </button>
              <button type="submit" className="assistant-send-button" disabled={isLoading || !draft.trim() || !languageName}>
                <FiSend aria-hidden="true" />
                {draft.trim() ? "Review & send" : "Send"}
              </button>
            </div>
          </form>
          <div className="assistant-speech-controls" aria-label="Voice playback controls">
            {speakingStatus === "speaking" && (
              <span className="assistant-speaking-indicator" role="status"><span /> Speaking response…</span>
            )}
            {speakingStatus === "speaking" && (
              <button type="button" onClick={() => { window.speechSynthesis.pause(); setSpeakingStatus("paused"); }}>
                <FiPause aria-hidden="true" /> Pause
              </button>
            )}
            {speakingStatus === "paused" && (
              <button type="button" onClick={() => { window.speechSynthesis.resume(); setSpeakingStatus("speaking"); }}>
                <FiPlay aria-hidden="true" /> Resume
              </button>
            )}
            {speakingStatus !== "idle" && (
              <button type="button" onClick={stopSpeaking}>
                <FiStopCircle aria-hidden="true" /> Stop speaking
              </button>
            )}
          </div>
          <p className="assistant-disclosure">
            AI replies use the server-configured OpenAI API and may incur charges. When unavailable, QueueLess uses basic demo guidance. Browser voice tools may process audio under your browser provider’s policy; QueueLess does not receive or save recordings. Don’t share passwords, OTPs, or ID numbers.
          </p>
          {voiceNotice && <p className="assistant-voice-notice" role="status">{voiceNotice}</p>}
          {!languageName && <p className="assistant-voice-notice" role="status">Enter a language to start chatting.</p>}
      </section>

      <button
        ref={toggleRef}
        type="button"
        className="assistant-launcher"
        onClick={() => {
          if (isOpen) closeAssistant();
          else setIsOpen(true);
        }}
        aria-expanded={isOpen}
        aria-controls="assistant-panel"
        aria-label={isOpen ? "Close QueueLess Assistant" : "Open QueueLess Assistant"}
      >
        {isOpen ? <FiX aria-hidden="true" /> : <FiMessageCircle aria-hidden="true" />}
        <span>{isOpen ? "Close" : "Ask for help"}</span>
      </button>
    </div>
  );
}
