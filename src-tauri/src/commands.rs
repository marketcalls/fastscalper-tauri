//! Tauri commands exposed to the frontend. Keep these thin: parse, delegate,
//! return. Business rules live in [`crate::openalgo`].

use reqwest::Client;
use tauri::State;

use crate::error::AppError;
use crate::openalgo::{Connection, OpenAlgo, Order, OrderResult, PingResult};

/// Places a MARKET smart order. Invoked as `place_order({ connection, order })`.
#[tauri::command]
pub async fn place_order(
    http: State<'_, Client>,
    connection: Connection,
    order: Order,
) -> Result<OrderResult, AppError> {
    OpenAlgo::new(&http, &connection)?
        .place_smart_order(&order)
        .await
}

/// Verifies the server and API key. Invoked as `test_connection({ connection })`.
#[tauri::command]
pub async fn test_connection(
    http: State<'_, Client>,
    connection: Connection,
) -> Result<PingResult, AppError> {
    OpenAlgo::new(&http, &connection)?.ping().await
}
