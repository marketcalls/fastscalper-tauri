//! The single error type returned by every command.
//!
//! Serialised to the frontend as `{ kind, message, status? }`, matching
//! `CommandError` in `src/api/types.ts`.

use serde::Serialize;

/// Broad category of failure, so the UI can react without parsing text.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ErrorKind {
    /// The request was rejected before anything was sent.
    Validation,
    /// The server could not be reached or did not answer in time.
    Network,
    /// The server answered with an error status or an error payload.
    Api,
    /// The server answered with something that is not the expected JSON.
    Decode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, thiserror::Error)]
#[serde(rename_all = "camelCase")]
#[error("{message}")]
pub struct AppError {
    pub kind: ErrorKind,
    pub message: String,
    /// HTTP status code, present only when the server responded.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<u16>,
}

impl AppError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Validation, message, None)
    }

    pub fn network(message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Network, message, None)
    }

    pub fn api(status: u16, message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Api, message, Some(status))
    }

    pub fn decode(status: u16, message: impl Into<String>) -> Self {
        Self::new(ErrorKind::Decode, message, Some(status))
    }

    fn new(kind: ErrorKind, message: impl Into<String>, status: Option<u16>) -> Self {
        Self {
            kind,
            message: message.into(),
            status,
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::*;

    fn to_json(error: &AppError) -> Value {
        serde_json::to_value(error).expect("AppError always serialises")
    }

    #[test]
    fn errors_without_a_response_omit_the_status_key() {
        assert_eq!(
            to_json(&AppError::validation("Symbol is missing")),
            json!({ "kind": "validation", "message": "Symbol is missing" })
        );
        assert_eq!(
            to_json(&AppError::network("timed out")),
            json!({ "kind": "network", "message": "timed out" })
        );
    }

    #[test]
    fn errors_from_a_response_carry_the_http_status() {
        assert_eq!(
            to_json(&AppError::api(403, "Invalid openalgo apikey")),
            json!({ "kind": "api", "message": "Invalid openalgo apikey", "status": 403 })
        );
        assert_eq!(
            to_json(&AppError::decode(200, "Unexpected reply from OpenAlgo")),
            json!({ "kind": "decode", "message": "Unexpected reply from OpenAlgo", "status": 200 })
        );
    }

    #[test]
    fn display_is_the_plain_message() {
        assert_eq!(AppError::api(500, "boom").to_string(), "boom");
    }
}
