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

  let response = client
    .post("http://127.0.0.1:5000/api/v1/placesmartorder")
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