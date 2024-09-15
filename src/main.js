const { invoke } = window.__TAURI__.tauri;

document.getElementById('leButton').addEventListener('click', () => trade('BUY', true));
document.getElementById('lxButton').addEventListener('click', () => trade('SELL', false));
document.getElementById('seButton').addEventListener('click', () => trade('SELL', true));
document.getElementById('sxButton').addEventListener('click', () => trade('BUY', false));
document.getElementById('settingsButton').addEventListener('click', openSettings);

let settings = {
  apiKey: '',
  exchange: 'NSE',
  product: 'MIS',
  voiceAlerts: false,
  hostUrl: 'http://127.0.0.1:5000',
};

// Load settings from localStorage if available
if (localStorage.getItem('fastscalperSettings')) {
  settings = JSON.parse(localStorage.getItem('fastscalperSettings'));
}

function speakAlert(text) {
  if (settings.voiceAlerts) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }
}

function trade(action, isEntry) {
  const symbol = document.getElementById('symbol').value;
  const quantity = document.getElementById('quantity').value;

  const tradeDetails = {
    action,
    symbol,
    quantity: isEntry ? quantity : '0',
    api_key: settings.apiKey,
    exchange: settings.exchange,
    product: settings.product,
    host_url: settings.hostUrl,
  };

  // Voice alerts for button presses
  if (action === 'BUY' && isEntry) speakAlert("Buy Order");
  else if (action === 'SELL' && !isEntry) speakAlert("Buy Exit");
  else if (action === 'SELL' && isEntry) speakAlert("Short Order");
  else if (action === 'BUY' && !isEntry) speakAlert("Short Exit");

  invoke('place_order', { tradeDetails })
    .then((response) => {
      // Handle response (e.g., show a success message)
      alert(`Order Response: ${response}`);
    })
    .catch((error) => {
      console.error('Error placing order:', error);
      alert(`Error placing order: ${error}`);
    });
}

function openSettings() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'flex';

  // Populate current settings
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('exchange').value = settings.exchange;
  document.getElementById('product').value = settings.product;
  document.getElementById('voiceAlerts').checked = settings.voiceAlerts;
  document.getElementById('hostUrl').value = settings.hostUrl;
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = 'none';
}

document.getElementById('okSettings').addEventListener('click', () => {
  settings.apiKey = document.getElementById('apiKey').value;
  settings.exchange = document.getElementById('exchange').value;
  settings.product = document.getElementById('product').value;
  settings.voiceAlerts = document.getElementById('voiceAlerts').checked;
  settings.hostUrl = document.getElementById('hostUrl').value;

  // Save settings to localStorage
  localStorage.setItem('fastscalperSettings', JSON.stringify(settings));

  closeSettings();
});

document.getElementById('cancelSettings').addEventListener('click', closeSettings);

// Populate exchange and product options
const exchanges = ['NSE', 'NFO', 'CDS', 'BSE', 'BFO', 'BCD', 'MCX', 'NCDEX'];
const products = ['CNC', 'NRML', 'MIS'];

const exchangeSelect = document.getElementById('exchange');
exchanges.forEach((exchange) => {
  const option = document.createElement('option');
  option.value = exchange;
  option.textContent = exchange;
  exchangeSelect.appendChild(option);
});

const productSelect = document.getElementById('product');
products.forEach((product) => {
  const option = document.createElement('option');
  option.value = product;
  option.textContent = product;
  productSelect.appendChild(option);
});

// Set initial values from settings
exchangeSelect.value = settings.exchange;
productSelect.value = settings.product;

// Close the modal if clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('settingsModal');
  if (event.target == modal) {
    closeSettings();
  }
};

// Add keydown event listener to close modal on Escape key press
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeSettings();
  }
});