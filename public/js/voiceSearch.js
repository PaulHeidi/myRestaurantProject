const voiceBtn = document.getElementById('voice-btn');
const input = document.getElementById('search-input');

if ('webkitSpeechRecognition' in window) {
  const rec = new webkitSpeechRecognition();
  rec.lang = 'en-AU';
  rec.continuous = false;

  voiceBtn.onclick = () => rec.start();

  rec.onresult = (event) => {
    const text = event.results[0][0].transcript;
    input.value = text;

    // Trigger search automatically
    document.getElementById('search-btn').click();
  };
} else {
  console.warn("Voice recognition not supported.");
}

