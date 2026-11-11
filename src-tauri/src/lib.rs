//! FastScalper backend: a thin, validated bridge from the UI to OpenAlgo.
//!
//! The webview never talks to the network directly. It calls the Tauri
//! commands in `commands`, which validate input and forward it to the
//! OpenAlgo REST API through `openalgo::OpenAlgo`.

mod commands;
mod error;
mod openalgo;

/// Builds and runs the desktop application.
pub fn run() {
    let http = openalgo::build_http_client().expect("failed to initialise the HTTP client");
    let builder = tauri::Builder::default().plugin(tauri_plugin_store::Builder::default().build());

    with_commands(builder, http)
        .run(tauri::generate_context!())
        .expect("error while running the FastScalper application");
}

/// Registers the IPC commands and the HTTP client they share.
///
/// Public only so the IPC tests in `tests/ipc.rs` can apply the app's real
/// wiring to Tauri's mock runtime.
pub fn with_commands<R: tauri::Runtime>(
    builder: tauri::Builder<R>,
    http: reqwest::Client,
) -> tauri::Builder<R> {
    builder
        .manage(http)
        .invoke_handler(tauri::generate_handler![
            commands::place_order,
            commands::test_connection
        ])
}
