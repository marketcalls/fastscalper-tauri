#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Deserialize;
use reqwest::Client;

#[derive(Deserialize)]
struct TradeDetails {
  action: String,
  symbol: String,
  quantity: String,
  api_key: String,
  exchange: String,
  product: String,
  host_url: String,
}

#[tauri::command]
async fn place_order(trade_details: TradeDetails) -> Result<String, String> {
  let client = Client::new();
  let payload = serde_json::json!({
    "apikey": trade_details.api_key,
    "strategy": "FastScalper",
    "symbol": trade_details.symbol,
    "action": trade_details.action,
    "exchange": trade_details.exchange,
    "pricetype": "MARKET",
    "product": trade_details.product,
    "quantity": trade_details.quantity,
    "position_size": "0"
  });

  let endpoint = format!("{}/api/v1/placesmartorder", trade_details.host_url);

  let response = client
    .post(&endpoint)
    .json(&payload)
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let response_text = response.text().await.map_err(|e| e.to_string())?;
  Ok(response_text)
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![place_order])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}