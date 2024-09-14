const { invoke } = window.__TAURI__.tauri;

document.getElementById('leButton').addEventListener('click', () => trade('BUY', true));
document.getElementById('lxButton').addEventListener('click', () => trade('SELL', false));
document.getElementById('seButton').addEventListener('click', () => trade('SELL', true));
document.getElementById('sxButton').addEventListener('click', () => trade('BUY', false));
document.getElementById('settingsButton').addEventListener('click', openSettings);

let settings = {
  apiKey: 'xxxxxx',
  exchange: 'NSE',
  product: 'MIS',
};

// Load settings from localStorage if available
if (localStorage.getItem('fastscalperSettings')) {
  settings = JSON.parse(localStorage.getItem('fastscalperSettings'));
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
  };

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
  modal.classList.remove('hidden', 'flex');
  modal.classList.add('flex');

  // Populate current settings
  document.getElementById('apiKey').value = settings.apiKey;
  document.getElementById('exchange').value = settings.exchange;
  document.getElementById('product').value = settings.product;
}

document.getElementById('saveSettings').addEventListener('click', () => {
  settings.apiKey = document.getElementById('apiKey').value;
  settings.exchange = document.getElementById('exchange').value;
  settings.product = document.getElementById('product').value;

  // Save settings to localStorage
  localStorage.setItem('fastscalperSettings', JSON.stringify(settings));

  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
});

document.getElementById('cancelSettings').addEventListener('click', () => {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
});

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