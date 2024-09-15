#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use serde::Deserialize;
use reqwest::Client;
use std::time::Duration;

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
    let client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

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
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if status.is_success() {
        Ok(response_text)
    } else {
        Err(format!("API request failed. Status: {}, Body: {}", status, response_text))
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![place_order])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}