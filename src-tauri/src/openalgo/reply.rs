//! Decides what an OpenAlgo reply means: a success [`Envelope`] or an
//! [`AppError`] with a short, readable message.
//!
//! OpenAlgo answers with `{"status": "success" | "error", ...}`. A proxy in
//! front of a self-hosted server can answer with anything (an HTML 502 page,
//! plain text, nothing), so such bodies are summarised, never shown verbatim.

use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::Value;

use super::models::{OrderResult, PingResult};
use crate::error::AppError;

/// Longest piece of server-supplied text shown to the user, in characters.
/// Stops a large error page or a verbose broker message flooding the UI.
const MAX_SERVER_TEXT_CHARS: usize = 300;

/// The JSON object OpenAlgo wraps every reply in. Every field is optional so
/// that a partial object, such as Flask's own `{"message": ...}` for a 404,
/// still yields its message.
#[derive(Debug, Deserialize)]
pub(super) struct Envelope {
    #[serde(default)]
    status: String,
    message: Option<Value>,
    orderid: Option<Value>,
    data: Option<Value>,
}

impl Envelope {
    fn is_success(&self) -> bool {
        self.status.eq_ignore_ascii_case("success")
    }
}

/// Interprets one reply. Success needs both a 2xx status and
/// `"status": "success"`, because OpenAlgo can report an error inside a 200.
pub(super) fn interpret(status: StatusCode, body: &str) -> Result<Envelope, AppError> {
    let code = status.as_u16();
    match serde_json::from_str::<Envelope>(body) {
        Ok(envelope) if status.is_success() && envelope.is_success() => Ok(envelope),
        // A 2xx JSON reply without a status is not an OpenAlgo envelope.
        Ok(envelope) if status.is_success() && envelope.status.is_empty() => {
            Err(unexpected_reply(code, body))
        }
        Ok(envelope) => {
            let message = envelope.message.as_ref().and_then(message_text);
            Err(AppError::api(
                code,
                message.unwrap_or_else(|| {
                    format!("OpenAlgo reported an error ({})", http_status_text(status))
                }),
            ))
        }
        Err(_) if status.is_success() => Err(unexpected_reply(code, body)),
        Err(_) => Err(AppError::api(
            code,
            with_excerpt(
                format!("OpenAlgo returned {}", http_status_text(status)),
                body,
            ),
        )),
    }
}

impl From<Envelope> for OrderResult {
    fn from(envelope: Envelope) -> Self {
        Self {
            order_id: envelope.orderid.as_ref().and_then(scalar_text),
            message: envelope.message.as_ref().and_then(message_text),
            status: envelope.status,
        }
    }
}

impl From<Envelope> for PingResult {
    /// OpenAlgo puts the ping details under `data`: `{"broker": ..., "message": "pong"}`.
    fn from(envelope: Envelope) -> Self {
        let field = |name: &str| {
            envelope
                .data
                .as_ref()
                .and_then(|data| data.get(name))
                .and_then(scalar_text)
                .unwrap_or_default()
        };
        Self {
            broker: field("broker"),
            message: field("message"),
        }
    }
}

fn unexpected_reply(code: u16, body: &str) -> AppError {
    AppError::decode(
        code,
        with_excerpt("Unexpected reply from OpenAlgo".to_owned(), body),
    )
}

/// `HTTP 502 Bad Gateway`, or just `HTTP 599` for codes without a standard reason.
fn http_status_text(status: StatusCode) -> String {
    match status.canonical_reason() {
        Some(reason) => format!("HTTP {} {reason}", status.as_u16()),
        None => format!("HTTP {}", status.as_u16()),
    }
}

/// Appends a one-line excerpt of a body that is not an OpenAlgo envelope.
/// Markup (typically a proxy's HTML error page) and empty bodies would add
/// noise rather than meaning, so they are left out.
fn with_excerpt(summary: String, body: &str) -> String {
    let body = body.trim();
    if body.is_empty() || body.starts_with('<') {
        summary
    } else {
        format!("{summary}: {}", one_line(body))
    }
}

/// Renders OpenAlgo's `message` as one readable line. It is usually a string,
/// but request validation errors arrive as a map of field names to lists of
/// problems, such as `{"quantity": ["Not a valid integer."]}`.
fn message_text(value: &Value) -> Option<String> {
    fn flatten(value: &Value) -> String {
        match value {
            Value::Null => String::new(),
            Value::String(text) => text.clone(),
            Value::Array(items) => items.iter().map(flatten).collect::<Vec<_>>().join(" "),
            Value::Object(fields) => fields
                .iter()
                .map(|(name, problem)| format!("{name}: {}", flatten(problem)))
                .collect::<Vec<_>>()
                .join("; "),
            other => other.to_string(),
        }
    }
    let line = one_line(&flatten(value));
    (!line.is_empty()).then_some(line)
}

/// Reads an identifier OpenAlgo may send as either a string or a number.
fn scalar_text(value: &Value) -> Option<String> {
    let text = match value {
        Value::String(text) => text.trim().to_owned(),
        Value::Number(number) => number.to_string(),
        _ => return None,
    };
    (!text.is_empty()).then_some(text)
}

/// Collapses runs of whitespace (including newlines) to single spaces and
/// truncates to [`MAX_SERVER_TEXT_CHARS`], marking the cut with `...`.
fn one_line(text: &str) -> String {
    let line = text.split_whitespace().collect::<Vec<_>>().join(" ");
    match line.char_indices().nth(MAX_SERVER_TEXT_CHARS) {
        Some((cut, _)) => format!("{}...", &line[..cut]),
        None => line,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorKind;

    fn ok(body: &str) -> Envelope {
        interpret(StatusCode::OK, body).unwrap()
    }

    fn err(status: u16, body: &str) -> AppError {
        interpret(StatusCode::from_u16(status).unwrap(), body).unwrap_err()
    }

    #[test]
    fn order_reply_with_string_order_id() {
        let result = OrderResult::from(ok(r#"{"status":"success","orderid":"250408000989443"}"#));
        assert_eq!(
            result,
            OrderResult {
                status: "success".to_owned(),
                order_id: Some("250408000989443".to_owned()),
                message: None,
            }
        );
    }

    #[test]
    fn order_reply_with_numeric_order_id() {
        let result = OrderResult::from(ok(r#"{"status":"success","orderid":250408000989443}"#));
        assert_eq!(result.order_id.as_deref(), Some("250408000989443"));
    }

    #[test]
    fn order_reply_without_order_id_keeps_the_message() {
        let body =
            r#"{"status":"success","message":"No OpenPosition Found. Not placing Exit order."}"#;
        let result = OrderResult::from(ok(body));
        assert_eq!(result.order_id, None);
        assert_eq!(
            result.message.as_deref(),
            Some("No OpenPosition Found. Not placing Exit order.")
        );
    }

    #[test]
    fn null_or_blank_order_ids_count_as_absent() {
        for orderid in ["null", r#""""#, r#""   ""#, "{}"] {
            let body = format!(r#"{{"status":"success","orderid":{orderid}}}"#);
            assert_eq!(
                OrderResult::from(ok(&body)).order_id,
                None,
                "orderid {orderid}"
            );
        }
    }

    #[test]
    fn success_status_is_case_insensitive_and_extra_fields_are_ignored() {
        let result = OrderResult::from(ok(r#"{"status":"Success","orderid":"1","mode":"live"}"#));
        assert_eq!(result.status, "Success");
        assert_eq!(result.order_id.as_deref(), Some("1"));
    }

    #[test]
    fn ping_reply_reads_broker_and_message_from_data() {
        let body = r#"{"status":"success","data":{"broker":"zerodha","message":"pong"}}"#;
        assert_eq!(
            PingResult::from(ok(body)),
            PingResult {
                broker: "zerodha".to_owned(),
                message: "pong".to_owned(),
            }
        );
    }

    #[test]
    fn ping_reply_without_data_yields_empty_fields() {
        let result = PingResult::from(ok(r#"{"status":"success"}"#));
        assert_eq!((result.broker.as_str(), result.message.as_str()), ("", ""));
    }

    #[test]
    fn error_envelope_inside_a_200_is_an_api_error() {
        let error = err(200, r#"{"status":"error","message":"Insufficient funds"}"#);
        assert_eq!(error, AppError::api(200, "Insufficient funds"));
    }

    #[test]
    fn error_envelope_without_a_message_falls_back_to_the_status() {
        assert_eq!(
            err(200, r#"{"status":"error"}"#),
            AppError::api(200, "OpenAlgo reported an error (HTTP 200 OK)")
        );
        assert_eq!(
            err(500, r#"{"status":"error","message":"   "}"#),
            AppError::api(
                500,
                "OpenAlgo reported an error (HTTP 500 Internal Server Error)"
            )
        );
    }

    #[test]
    fn field_validation_errors_are_flattened_to_one_line() {
        let body = r#"{"status":"error","message":{
            "quantity":["Not a valid integer."],
            "symbol":["Missing data for required field.","Too short."]
        }}"#;
        assert_eq!(
            err(400, body).message,
            "quantity: Not a valid integer.; symbol: Missing data for required field. Too short."
        );
    }

    #[test]
    fn json_message_without_a_status_is_still_shown() {
        let body = r#"{"message":"The requested URL was not found on the server."}"#;
        assert_eq!(
            err(404, body),
            AppError::api(404, "The requested URL was not found on the server.")
        );
    }

    #[test]
    fn plain_text_error_bodies_are_excerpted() {
        assert_eq!(
            err(503, "  upstream connect error\n\n  or disconnect  "),
            AppError::api(
                503,
                "OpenAlgo returned HTTP 503 Service Unavailable: upstream connect error or disconnect"
            )
        );
    }

    #[test]
    fn html_and_empty_error_bodies_are_left_out() {
        let html = "<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>";
        assert_eq!(
            err(502, html),
            AppError::api(502, "OpenAlgo returned HTTP 502 Bad Gateway")
        );
        assert_eq!(
            err(500, ""),
            AppError::api(500, "OpenAlgo returned HTTP 500 Internal Server Error")
        );
    }

    #[test]
    fn non_standard_status_codes_have_no_reason_phrase() {
        assert_eq!(
            err(599, "oops"),
            AppError::api(599, "OpenAlgo returned HTTP 599: oops")
        );
    }

    #[test]
    fn huge_bodies_are_truncated() {
        let body = "x".repeat(10_000);
        let message = err(500, &body).message;
        let prefix = "OpenAlgo returned HTTP 500 Internal Server Error: ";
        assert_eq!(
            message,
            format!("{prefix}{}...", "x".repeat(MAX_SERVER_TEXT_CHARS))
        );
    }

    #[test]
    fn truncation_never_splits_a_multibyte_character() {
        let body = "\u{20b9}".repeat(MAX_SERVER_TEXT_CHARS + 1);
        let message = err(500, &body).message;
        assert!(message.ends_with(&format!("{}...", "\u{20b9}".repeat(3))));
    }

    #[test]
    fn non_json_success_is_a_decode_error() {
        assert_eq!(
            err(200, "OK"),
            AppError::decode(200, "Unexpected reply from OpenAlgo: OK")
        );
        assert_eq!(
            err(200, "<!doctype html><html></html>"),
            AppError::decode(200, "Unexpected reply from OpenAlgo")
        );
        assert_eq!(
            err(204, ""),
            AppError::decode(204, "Unexpected reply from OpenAlgo")
        );
    }

    #[test]
    fn json_success_without_a_status_is_a_decode_error() {
        for body in ["{}", "[]", r#""success""#, r#"{"orderid":"1"}"#] {
            let error = err(200, body);
            assert_eq!(error.kind, ErrorKind::Decode, "body {body}");
            assert_eq!(error.status, Some(200), "body {body}");
        }
    }
}
