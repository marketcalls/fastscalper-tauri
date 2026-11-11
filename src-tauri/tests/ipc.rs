//! IPC tests: the commands invoked through Tauri's mock runtime with the
//! exact argument JSON that `src/api/commands.ts` sends, against a local
//! wiremock server. Nothing here can reach a real OpenAlgo server or broker.
//!
//! These live in an integration test because they drive the app from the
//! outside, exactly as the webview does. That also lets `build.rs` give this
//! executable the Windows manifest Tauri needs, without touching the app.

use serde_json::{Value, json};
use tauri::ipc::{CallbackFn, InvokeBody};
use tauri::test::{
    INVOKE_KEY, MockRuntime, get_ipc_response, mock_builder, mock_context, noop_assets,
};
use tauri::webview::InvokeRequest;
use tauri::{App, WebviewWindow, WebviewWindowBuilder};
use wiremock::matchers::{any, body_json, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

/// The mock app and its window. The app is kept alive alongside the window.
struct Harness {
    _app: App<MockRuntime>,
    window: WebviewWindow<MockRuntime>,
}

impl Harness {
    fn new() -> Self {
        let app = fastscalper_lib::with_commands(mock_builder(), reqwest::Client::new())
            .build(mock_context(noop_assets()))
            .expect("mock app builds");
        let window = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .expect("mock window builds");
        Self { _app: app, window }
    }

    /// Calls `command` the way `invoke(command, args)` does in the frontend.
    /// Returns the resolved value or the rejection, both as JSON.
    fn invoke(&self, command: &str, args: Value) -> Result<Value, Value> {
        let origin = if cfg!(windows) {
            "http://tauri.localhost"
        } else {
            "tauri://localhost"
        };
        let request = InvokeRequest {
            cmd: command.to_owned(),
            callback: CallbackFn(0),
            error: CallbackFn(1),
            url: origin.parse().expect("valid origin"),
            body: InvokeBody::Json(args),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.to_owned(),
        };
        get_ipc_response(&self.window, request)
            .map(|body| body.deserialize::<Value>().expect("command returns JSON"))
    }
}

/// Starts a mock server with one mock mounted. The tests are synchronous
/// because `get_ipc_response` blocks, so the setup runs to completion here.
fn server_with(mock: Mock) -> MockServer {
    tauri::async_runtime::block_on(async {
        let server = MockServer::start().await;
        mock.mount(&server).await;
        server
    })
}

fn received_request_count(server: &MockServer) -> usize {
    tauri::async_runtime::block_on(server.received_requests())
        .expect("request recording is on")
        .len()
}

fn connection(host_url: &str, api_key: &str) -> Value {
    json!({ "hostUrl": host_url, "apiKey": api_key })
}

fn order(action: &str) -> Value {
    json!({ "symbol": "SBIN", "exchange": "NSE", "product": "MIS", "action": action, "quantity": 10 })
}

#[test]
fn place_order_accepts_the_frontend_arguments() {
    let server = server_with(
        Mock::given(method("POST"))
            .and(path("/api/v1/placesmartorder"))
            .and(body_json(json!({
                "apikey": "key",
                "strategy": "FastScalper",
                "symbol": "SBIN",
                "action": "BUY",
                "exchange": "NSE",
                "pricetype": "MARKET",
                "product": "MIS",
                "quantity": "10",
                "position_size": "0"
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(json!({ "status": "success", "orderid": "250408000989443" })),
            ),
    );

    let response = Harness::new().invoke(
        "place_order",
        json!({ "connection": connection(&server.uri(), "key"), "order": order("BUY") }),
    );

    assert_eq!(
        response,
        Ok(json!({ "status": "success", "orderId": "250408000989443" }))
    );
}

#[test]
fn test_connection_accepts_the_frontend_arguments() {
    let server = server_with(
        Mock::given(method("POST"))
            .and(path("/api/v1/ping"))
            .and(body_json(json!({ "apikey": "key" })))
            .respond_with(ResponseTemplate::new(200).set_body_json(
                json!({ "status": "success", "data": { "broker": "zerodha", "message": "pong" } }),
            )),
    );

    let response = Harness::new().invoke(
        "test_connection",
        json!({ "connection": connection(&server.uri(), "key") }),
    );

    assert_eq!(
        response,
        Ok(json!({ "broker": "zerodha", "message": "pong" }))
    );
}

#[test]
fn validation_rejection_has_no_status() {
    let server = server_with(Mock::given(any()).respond_with(ResponseTemplate::new(200)));

    let response = Harness::new().invoke(
        "place_order",
        json!({ "connection": connection(&server.uri(), "  "), "order": order("SELL") }),
    );

    assert_eq!(
        response,
        Err(json!({ "kind": "validation", "message": "API key is missing. Add it in Settings." }))
    );
    assert_eq!(received_request_count(&server), 0);
}

#[test]
fn api_rejection_carries_the_http_status() {
    let server = server_with(
        Mock::given(any()).respond_with(
            ResponseTemplate::new(403)
                .set_body_json(json!({ "status": "error", "message": "Invalid openalgo apikey" })),
        ),
    );

    let response = Harness::new().invoke(
        "test_connection",
        json!({ "connection": connection(&server.uri(), "wrong") }),
    );

    assert_eq!(
        response,
        Err(json!({ "kind": "api", "message": "Invalid openalgo apikey", "status": 403 }))
    );
}

/// Documents a limit of the contract: Tauri rejects arguments that do not
/// deserialise before the command runs, with a plain string rather than a
/// `{ kind, message }` object. The typed frontend never sends such values.
#[test]
fn malformed_arguments_are_rejected_by_tauri_as_a_plain_string() {
    let server = server_with(Mock::given(any()).respond_with(ResponseTemplate::new(200)));

    let response = Harness::new().invoke(
        "place_order",
        json!({ "connection": connection(&server.uri(), "key"), "order": order("buy") }),
    );

    let Err(Value::String(message)) = response else {
        panic!("expected a string rejection, got {response:?}");
    };
    assert!(message.contains("`order`"), "{message}");
    assert_eq!(received_request_count(&server), 0);
}
