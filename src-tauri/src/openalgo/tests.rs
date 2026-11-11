//! HTTP tests: the real client against a local wiremock server. Nothing here
//! can reach a real OpenAlgo server or broker.

use std::io::Read;
use std::net::TcpListener;
use std::thread;
use std::time::Duration;

use reqwest::Client;
use serde_json::{Value, json};
use wiremock::matchers::{any, body_json, header, method, path, query_param_is_missing};
use wiremock::{Mock, MockServer, ResponseTemplate};

use super::models::{Action, Exchange, Product};
use super::{Connection, OpenAlgo, Order, OrderResult, PingResult};
use crate::error::{AppError, ErrorKind};

const API_KEY: &str = "test-api-key";
/// Generous enough for a refused connection, which takes about two seconds
/// on Windows because it retries the handshake.
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(10);
/// Far shorter than the mock server's delay, so the request must time out.
const SHORT_TIMEOUT: Duration = Duration::from_millis(300);

fn client(timeout: Duration) -> Client {
    Client::builder().timeout(timeout).build().unwrap()
}

fn connection(host_url: &str, api_key: &str) -> Connection {
    Connection {
        host_url: host_url.to_owned(),
        api_key: api_key.to_owned(),
    }
}

fn order(symbol: &str, action: Action, quantity: u32) -> Order {
    Order {
        symbol: symbol.to_owned(),
        exchange: Exchange::Nse,
        product: Product::Mis,
        action,
        quantity,
    }
}

async fn place_with(
    http: &Client,
    connection: &Connection,
    order: &Order,
) -> Result<OrderResult, AppError> {
    OpenAlgo::new(http, connection)?
        .place_smart_order(order)
        .await
}

async fn place(host_url: &str, order: &Order) -> Result<OrderResult, AppError> {
    place_with(
        &client(DEFAULT_TIMEOUT),
        &connection(host_url, API_KEY),
        order,
    )
    .await
}

async fn ping_with(http: &Client, connection: &Connection) -> Result<PingResult, AppError> {
    OpenAlgo::new(http, connection)?.ping().await
}

async fn ping(host_url: &str) -> Result<PingResult, AppError> {
    ping_with(&client(DEFAULT_TIMEOUT), &connection(host_url, API_KEY)).await
}

/// A mock server that answers every request with `response`.
async fn server_replying(response: ResponseTemplate) -> MockServer {
    let server = MockServer::start().await;
    Mock::given(any())
        .respond_with(response)
        .mount(&server)
        .await;
    server
}

fn json_reply(status: u16, body: Value) -> ResponseTemplate {
    ResponseTemplate::new(status).set_body_json(body)
}

fn text_reply(status: u16, body: &str) -> ResponseTemplate {
    ResponseTemplate::new(status).set_body_string(body)
}

/// A local URL that refuses connections: the port was free a moment ago.
fn refusing_host_url() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    format!("http://127.0.0.1:{port}")
}

/// A local URL whose server reads the start of one request, then hangs up
/// without replying.
fn hanging_up_host_url() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        stream.read_exact(&mut [0; 16]).unwrap();
    });
    format!("http://127.0.0.1:{port}")
}

fn smart_order_body(action: &str, quantity: &str) -> Value {
    json!({
        "apikey": API_KEY,
        "strategy": "FastScalper",
        "symbol": "SBIN",
        "action": action,
        "exchange": "NSE",
        "pricetype": "MARKET",
        "product": "MIS",
        "quantity": quantity,
        "position_size": "0"
    })
}

#[tokio::test]
async fn each_order_button_sends_the_v0_1_0_body() {
    // The four buttons of the order pad. Exits send quantity 0, which tells
    // OpenAlgo to close the open position.
    let buttons = [
        ("long entry", Action::Buy, 10, "BUY", "10"),
        ("long exit", Action::Sell, 0, "SELL", "0"),
        ("short entry", Action::Sell, 10, "SELL", "10"),
        ("short exit", Action::Buy, 0, "BUY", "0"),
    ];
    for (button, action, quantity, wire_action, wire_quantity) in buttons {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/v1/placesmartorder"))
            .and(header("content-type", "application/json"))
            .and(body_json(smart_order_body(wire_action, wire_quantity)))
            .respond_with(json_reply(
                200,
                json!({ "status": "success", "orderid": "1" }),
            ))
            .expect(1)
            .mount(&server)
            .await;

        let result = place(&server.uri(), &order("SBIN", action, quantity)).await;

        assert_eq!(
            result.map(|r| r.order_id),
            Ok(Some("1".to_owned())),
            "{button}"
        );
        server.verify().await;
    }
}

#[tokio::test]
async fn inputs_are_trimmed_before_sending() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/v1/placesmartorder"))
        .and(body_json(smart_order_body("BUY", "1")))
        .respond_with(json_reply(
            200,
            json!({ "status": "success", "orderid": "1" }),
        ))
        .expect(1)
        .mount(&server)
        .await;
    let padded = connection(&format!("  {}/  ", server.uri()), &format!(" {API_KEY}\t"));

    let result = place_with(
        &client(DEFAULT_TIMEOUT),
        &padded,
        &order(" SBIN ", Action::Buy, 1),
    )
    .await;

    assert!(result.is_ok(), "{result:?}");
}

#[tokio::test]
async fn ping_sends_only_the_api_key() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/v1/ping"))
        .and(header("content-type", "application/json"))
        .and(body_json(json!({ "apikey": API_KEY })))
        .respond_with(json_reply(
            200,
            json!({ "status": "success", "data": { "broker": "zerodha", "message": "pong" } }),
        ))
        .expect(1)
        .mount(&server)
        .await;

    let result = ping(&server.uri()).await;

    assert_eq!(
        result,
        Ok(PingResult {
            broker: "zerodha".to_owned(),
            message: "pong".to_owned(),
        })
    );
}

#[tokio::test]
async fn host_url_sub_path_is_kept_and_query_dropped() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/openalgo/api/v1/ping"))
        .and(query_param_is_missing("tab"))
        .respond_with(json_reply(200, json!({ "status": "success", "data": {} })))
        .expect(3)
        .mount(&server)
        .await;

    for suffix in ["/openalgo", "/openalgo/", "/openalgo/?tab=1"] {
        let result = ping(&format!("{}{suffix}", server.uri())).await;
        assert!(result.is_ok(), "{suffix}: {result:?}");
    }
    server.verify().await;
}

#[tokio::test]
async fn exit_without_a_position_succeeds_without_an_order_id() {
    let message = "No OpenPosition Found. Not placing Exit order.";
    let server = server_replying(json_reply(
        200,
        json!({ "status": "success", "message": message }),
    ))
    .await;

    let result = place(&server.uri(), &order("SBIN", Action::Sell, 0)).await;

    assert_eq!(
        result,
        Ok(OrderResult {
            status: "success".to_owned(),
            order_id: None,
            message: Some(message.to_owned()),
        })
    );
}

#[tokio::test]
async fn numeric_order_id_is_returned_as_text() {
    let server = server_replying(json_reply(
        200,
        json!({ "status": "success", "orderid": 250_408_000_989_443_u64 }),
    ))
    .await;

    let result = place(&server.uri(), &order("SBIN", Action::Buy, 1)).await;

    assert_eq!(result.unwrap().order_id.as_deref(), Some("250408000989443"));
}

#[tokio::test]
async fn error_statuses_with_a_json_message_are_api_errors() {
    let cases = [
        (400, "Invalid symbol"),
        (403, "Invalid openalgo apikey"),
        (500, "An unexpected error occurred"),
    ];
    for (status, message) in cases {
        let server = server_replying(json_reply(
            status,
            json!({ "status": "error", "message": message }),
        ))
        .await;

        let result = place(&server.uri(), &order("SBIN", Action::Buy, 1)).await;

        assert_eq!(result, Err(AppError::api(status, message)));
    }
}

#[tokio::test]
async fn error_envelope_with_a_success_status_is_an_api_error() {
    let server = server_replying(json_reply(
        200,
        json!({ "status": "error", "message": "Market closed" }),
    ))
    .await;

    let result = place(&server.uri(), &order("SBIN", Action::Buy, 1)).await;

    assert_eq!(result, Err(AppError::api(200, "Market closed")));
}

#[tokio::test]
async fn non_json_error_bodies_are_summarised() {
    let html = "<html><head><title>502 Bad Gateway</title></head><body><center>nginx</center></body></html>";
    let server = server_replying(text_reply(502, html)).await;
    assert_eq!(
        ping(&server.uri()).await,
        Err(AppError::api(502, "OpenAlgo returned HTTP 502 Bad Gateway"))
    );

    let server = server_replying(text_reply(503, "Service Unavailable")).await;
    assert_eq!(
        ping(&server.uri()).await,
        Err(AppError::api(
            503,
            "OpenAlgo returned HTTP 503 Service Unavailable: Service Unavailable"
        ))
    );
}

#[tokio::test]
async fn non_json_success_is_a_decode_error() {
    let server = server_replying(text_reply(
        200,
        "<!doctype html><title>Router login</title>",
    ))
    .await;

    let result = place(&server.uri(), &order("SBIN", Action::Buy, 1)).await;

    assert_eq!(
        result,
        Err(AppError::decode(200, "Unexpected reply from OpenAlgo"))
    );
}

#[tokio::test]
async fn connection_refused_is_a_network_error() {
    let host_url = refusing_host_url();

    let error = place(&host_url, &order("SBIN", Action::Buy, 1))
        .await
        .unwrap_err();

    assert_eq!(error.kind, ErrorKind::Network);
    assert_eq!(error.status, None);
    assert!(
        error
            .message
            .starts_with(&format!("Could not connect to OpenAlgo at {host_url}/. ")),
        "{}",
        error.message
    );
    // Nothing was sent, so there is no reason to warn about a possible order.
    assert!(!error.message.contains("order book"), "{}", error.message);
}

#[tokio::test]
async fn order_timeout_warns_that_the_order_may_have_been_placed() {
    let slow = json_reply(200, json!({ "status": "success" })).set_delay(Duration::from_secs(5));
    let server = server_replying(slow).await;

    let result = place_with(
        &client(SHORT_TIMEOUT),
        &connection(&server.uri(), API_KEY),
        &order("SBIN", Action::Buy, 1),
    )
    .await;

    assert_eq!(
        result,
        Err(AppError::network(
            "OpenAlgo did not reply in time. The order may still have been placed. \
             Check the order book before retrying."
        ))
    );
}

#[tokio::test]
async fn ping_timeout_is_a_network_error() {
    let slow = json_reply(200, json!({ "status": "success" })).set_delay(Duration::from_secs(5));
    let server = server_replying(slow).await;

    let result = ping_with(&client(SHORT_TIMEOUT), &connection(&server.uri(), API_KEY)).await;

    assert_eq!(
        result,
        Err(AppError::network("OpenAlgo did not reply in time"))
    );
}

#[tokio::test]
async fn order_cut_off_after_sending_warns_that_it_may_have_been_placed() {
    let host_url = hanging_up_host_url();

    let error = place(&host_url, &order("SBIN", Action::Buy, 1))
        .await
        .unwrap_err();

    assert_eq!(error.kind, ErrorKind::Network);
    assert!(
        error
            .message
            .starts_with("The connection to OpenAlgo failed: "),
        "{}",
        error.message
    );
    assert!(
        error.message.ends_with(
            ". The order may still have been placed. Check the order book before retrying."
        ),
        "{}",
        error.message
    );
}

#[tokio::test]
async fn invalid_input_never_reaches_the_server() {
    let server = server_replying(json_reply(200, json!({ "status": "success" }))).await;
    let http = client(DEFAULT_TIMEOUT);
    let good_connection = connection(&server.uri(), API_KEY);
    let blank_key = connection(&server.uri(), " ");
    let good_order = order("SBIN", Action::Buy, 1);
    let blank_symbol = order("  ", Action::Buy, 1);

    let error = place_with(&http, &good_connection, &blank_symbol)
        .await
        .unwrap_err();
    assert_eq!(error.kind, ErrorKind::Validation);
    let error = place_with(&http, &blank_key, &good_order)
        .await
        .unwrap_err();
    assert_eq!(error.kind, ErrorKind::Validation);
    let error = ping_with(&http, &blank_key).await.unwrap_err();
    assert_eq!(error.kind, ErrorKind::Validation);

    assert!(server.received_requests().await.unwrap().is_empty());
}
