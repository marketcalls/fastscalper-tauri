//! Request and response types for the subset of OpenAlgo that FastScalper uses.
//!
//! Types read from the frontend use camelCase to match `src/api/types.ts`.
//! Wire payloads use the exact field names OpenAlgo expects.

use std::fmt;

use reqwest::Url;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Action {
    Buy,
    Sell,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Exchange {
    Nse,
    Nfo,
    Cds,
    Bse,
    Bfo,
    Bcd,
    Mcx,
    Ncdex,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Product {
    Cnc,
    Nrml,
    Mis,
}

/// Where the OpenAlgo server lives and the key used to call it.
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub host_url: String,
    pub api_key: String,
}

impl Connection {
    /// Parses the host URL into a base that endpoint paths can be appended to.
    ///
    /// Surrounding whitespace is ignored and the result always ends with a
    /// slash, so a sub-path such as `/openalgo` is kept. Any query or fragment
    /// is dropped because an endpoint path appended after it would be lost.
    pub fn base_url(&self) -> Result<Url, AppError> {
        let host = self.host_url.trim();
        if host.is_empty() {
            return Err(AppError::validation(
                "Host URL is missing. Add it in Settings.",
            ));
        }
        let invalid = || {
            AppError::validation(format!(
                "Host URL \"{host}\" must be a full address such as http://127.0.0.1:5000"
            ))
        };
        let mut url = Url::parse(host).map_err(|_| invalid())?;
        if !matches!(url.scheme(), "http" | "https") {
            return Err(invalid());
        }
        url.set_query(None);
        url.set_fragment(None);
        let directory = format!("{}/", url.path().trim_end_matches('/'));
        url.set_path(&directory);
        Ok(url)
    }

    /// Returns the trimmed API key, or a validation error when it is empty.
    pub fn api_key(&self) -> Result<&str, AppError> {
        let key = self.api_key.trim();
        if key.is_empty() {
            return Err(AppError::validation(
                "API key is missing. Add it in Settings.",
            ));
        }
        Ok(key)
    }
}

/// Written by hand so the API key can never reach a log or panic message.
impl fmt::Debug for Connection {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Connection")
            .field("host_url", &self.host_url)
            .field("api_key", &"<redacted>")
            .finish()
    }
}

/// A market order from the UI. `quantity == 0` closes the open position.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Order {
    pub symbol: String,
    pub exchange: Exchange,
    pub product: Product,
    pub action: Action,
    pub quantity: u32,
}

impl Order {
    /// Returns the trimmed symbol, or a validation error when it is empty.
    pub fn symbol(&self) -> Result<&str, AppError> {
        let symbol = self.symbol.trim();
        if symbol.is_empty() {
            return Err(AppError::validation("Symbol is missing"));
        }
        Ok(symbol)
    }
}

/// Body of `POST /api/v1/placesmartorder`. Field names and string-typed
/// numbers match what FastScalper v0.1.0 sent; do not change them casually.
#[derive(Serialize)]
pub(super) struct SmartOrderPayload<'a> {
    pub apikey: &'a str,
    pub strategy: &'static str,
    pub symbol: &'a str,
    pub action: Action,
    pub exchange: Exchange,
    pub pricetype: &'static str,
    pub product: Product,
    pub quantity: String,
    pub position_size: &'static str,
}

/// Body of `POST /api/v1/ping`. OpenAlgo rejects any extra field.
#[derive(Serialize)]
pub(super) struct PingPayload<'a> {
    pub apikey: &'a str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrderResult {
    pub status: String,
    /// Absent when OpenAlgo accepted the request without placing an order,
    /// for example an exit when there is no open position.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub broker: String,
    pub message: String,
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::error::ErrorKind;

    fn connection(host_url: &str, api_key: &str) -> Connection {
        Connection {
            host_url: host_url.to_owned(),
            api_key: api_key.to_owned(),
        }
    }

    fn order(symbol: &str) -> Order {
        Order {
            symbol: symbol.to_owned(),
            exchange: Exchange::Nse,
            product: Product::Mis,
            action: Action::Buy,
            quantity: 1,
        }
    }

    #[test]
    fn base_url_normalises_to_a_directory() {
        let cases = [
            ("http://127.0.0.1:5000", "http://127.0.0.1:5000/"),
            ("  http://127.0.0.1:5000/  ", "http://127.0.0.1:5000/"),
            (
                "https://algo.example.com/openalgo",
                "https://algo.example.com/openalgo/",
            ),
            (
                "https://algo.example.com/openalgo///",
                "https://algo.example.com/openalgo/",
            ),
            ("HTTP://LOCALHOST:5000", "http://localhost:5000/"),
            (
                "http://127.0.0.1:5000/?debug=1#top",
                "http://127.0.0.1:5000/",
            ),
        ];
        for (input, expected) in cases {
            let url = connection(input, "key").base_url().unwrap();
            assert_eq!(url.as_str(), expected, "input {input:?}");
        }
    }

    #[test]
    fn base_url_rejects_missing_or_unusable_hosts() {
        let cases = [
            "",
            "   ",
            "127.0.0.1:5000",
            "localhost:5000",
            "ftp://host",
            "http://",
        ];
        for input in cases {
            let error = connection(input, "key").base_url().unwrap_err();
            assert_eq!(error.kind, ErrorKind::Validation, "input {input:?}");
        }
    }

    #[test]
    fn base_url_error_names_the_bad_value() {
        let error = connection(" localhost:5000 ", "key")
            .base_url()
            .unwrap_err();
        assert_eq!(
            error.message,
            "Host URL \"localhost:5000\" must be a full address such as http://127.0.0.1:5000"
        );
    }

    #[test]
    fn api_key_is_trimmed_and_required() {
        assert_eq!(
            connection("http://h", "  abc123 \n").api_key(),
            Ok("abc123")
        );
        let error = connection("http://h", " \t ").api_key().unwrap_err();
        assert_eq!(error.kind, ErrorKind::Validation);
        assert_eq!(error.message, "API key is missing. Add it in Settings.");
    }

    #[test]
    fn debug_output_redacts_the_api_key() {
        let printed = format!("{:?}", connection("http://h", "secret-key"));
        assert!(!printed.contains("secret-key"), "{printed}");
        assert!(printed.contains("<redacted>"), "{printed}");
    }

    #[test]
    fn symbol_is_trimmed_and_required() {
        assert_eq!(order("  SBIN  ").symbol(), Ok("SBIN"));
        let error = order("   ").symbol().unwrap_err();
        assert_eq!(error, AppError::validation("Symbol is missing"));
    }

    #[test]
    fn connection_reads_camel_case_fields() {
        let parsed: Connection =
            serde_json::from_value(json!({ "hostUrl": "http://h", "apiKey": "k" })).unwrap();
        assert_eq!(
            (parsed.host_url.as_str(), parsed.api_key.as_str()),
            ("http://h", "k")
        );

        let snake_case = json!({ "host_url": "http://h", "api_key": "k" });
        assert!(serde_json::from_value::<Connection>(snake_case).is_err());
    }

    #[test]
    fn order_reads_camel_case_fields_and_uppercase_enums() {
        let parsed: Order = serde_json::from_value(json!({
            "symbol": "NIFTY24DECFUT",
            "exchange": "NFO",
            "product": "NRML",
            "action": "SELL",
            "quantity": 75
        }))
        .unwrap();
        assert_eq!(parsed.exchange, Exchange::Nfo);
        assert_eq!(parsed.product, Product::Nrml);
        assert_eq!(parsed.action, Action::Sell);
        assert_eq!(parsed.quantity, 75);
    }

    #[test]
    fn order_rejects_values_the_ui_must_never_send() {
        let valid = json!({
            "symbol": "SBIN", "exchange": "NSE", "product": "MIS", "action": "BUY", "quantity": 1
        });
        let mutations = [
            ("action", json!("buy")),
            ("exchange", json!("nse")),
            ("product", json!("BO")),
            ("quantity", json!(-1)),
            ("quantity", json!(1.5)),
            ("quantity", json!("1")),
        ];
        for (field, value) in mutations {
            let mut input = valid.clone();
            input[field] = value.clone();
            assert!(
                serde_json::from_value::<Order>(input).is_err(),
                "{field} = {value} should be rejected"
            );
        }
    }

    #[test]
    fn every_ui_exchange_and_product_is_accepted() {
        // Mirrors EXCHANGES and PRODUCTS in src/api/types.ts.
        for exchange in ["NSE", "NFO", "CDS", "BSE", "BFO", "BCD", "MCX", "NCDEX"] {
            assert!(
                serde_json::from_value::<Exchange>(json!(exchange)).is_ok(),
                "{exchange}"
            );
        }
        for product in ["CNC", "NRML", "MIS"] {
            assert!(
                serde_json::from_value::<Product>(json!(product)).is_ok(),
                "{product}"
            );
        }
    }

    #[test]
    fn smart_order_payload_matches_the_v0_1_0_wire_format() {
        let payload = SmartOrderPayload {
            apikey: "k",
            strategy: "FastScalper",
            symbol: "SBIN",
            action: Action::Buy,
            exchange: Exchange::Nse,
            pricetype: "MARKET",
            product: Product::Mis,
            quantity: "10".to_owned(),
            position_size: "0",
        };
        assert_eq!(
            serde_json::to_value(&payload).unwrap(),
            json!({
                "apikey": "k",
                "strategy": "FastScalper",
                "symbol": "SBIN",
                "action": "BUY",
                "exchange": "NSE",
                "pricetype": "MARKET",
                "product": "MIS",
                "quantity": "10",
                "position_size": "0"
            })
        );
    }

    #[test]
    fn ping_payload_sends_only_the_api_key() {
        let payload = PingPayload { apikey: "k" };
        assert_eq!(
            serde_json::to_value(&payload).unwrap(),
            json!({ "apikey": "k" })
        );
    }

    #[test]
    fn order_result_uses_camel_case_and_omits_missing_fields() {
        let placed = OrderResult {
            status: "success".to_owned(),
            order_id: Some("250408000989443".to_owned()),
            message: None,
        };
        assert_eq!(
            serde_json::to_value(&placed).unwrap(),
            json!({ "status": "success", "orderId": "250408000989443" })
        );

        let skipped = OrderResult {
            status: "success".to_owned(),
            order_id: None,
            message: Some("No OpenPosition Found. Not placing Exit order.".to_owned()),
        };
        assert_eq!(
            serde_json::to_value(&skipped).unwrap(),
            json!({ "status": "success", "message": "No OpenPosition Found. Not placing Exit order." })
        );
    }
}
