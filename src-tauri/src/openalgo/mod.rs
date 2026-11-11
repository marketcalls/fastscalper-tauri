//! Minimal client for the OpenAlgo REST API: <https://docs.openalgo.in>.
//!
//! [`OpenAlgo`] sends requests and reports transport failures; the private
//! `reply` module decides what each response means.

mod models;
mod reply;
#[cfg(test)]
mod tests;

pub use models::{Connection, Order, OrderResult, PingResult};

use std::error::Error as _;
use std::time::Duration;

use reqwest::{Client, Url};
use serde::Serialize;

use crate::error::AppError;
use models::{PingPayload, SmartOrderPayload};
use reply::Envelope;

/// Strategy tag OpenAlgo records against every order placed by this app.
const STRATEGY: &str = "FastScalper";
/// Fail fast when the server is down; no order has been sent yet.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
/// Generous total timeout: an order may still be in flight at the broker.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Builds the shared HTTP client. Created once at startup and reused.
pub fn build_http_client() -> reqwest::Result<Client> {
    Client::builder()
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
}

/// The OpenAlgo endpoints this app calls.
#[derive(Clone, Copy)]
enum Endpoint {
    Ping,
    PlaceSmartOrder,
}

impl Endpoint {
    /// Path relative to the host URL, which may itself include a sub-path.
    fn path(self) -> &'static str {
        match self {
            Self::Ping => "api/v1/ping",
            Self::PlaceSmartOrder => "api/v1/placesmartorder",
        }
    }
}

/// An authenticated handle to one OpenAlgo server.
pub struct OpenAlgo<'a> {
    http: &'a Client,
    base_url: Url,
    api_key: &'a str,
}

impl<'a> OpenAlgo<'a> {
    /// Validates the connection details. Nothing is sent over the network.
    ///
    /// The caller supplies the HTTP client, so the app shares one client
    /// (see [`build_http_client`]) and tests can use shorter timeouts.
    pub fn new(http: &'a Client, connection: &'a Connection) -> Result<Self, AppError> {
        Ok(Self {
            http,
            base_url: connection.base_url()?,
            api_key: connection.api_key()?,
        })
    }

    /// Places a MARKET smart order with `position_size` 0, as v0.1.0 did.
    pub async fn place_smart_order(&self, order: &Order) -> Result<OrderResult, AppError> {
        let payload = SmartOrderPayload {
            apikey: self.api_key,
            strategy: STRATEGY,
            symbol: order.symbol()?,
            action: order.action,
            exchange: order.exchange,
            pricetype: "MARKET",
            product: order.product,
            quantity: order.quantity.to_string(),
            position_size: "0",
        };
        let envelope = self.post(Endpoint::PlaceSmartOrder, &payload).await?;
        Ok(OrderResult::from(envelope))
    }

    /// Calls `/api/v1/ping`, which succeeds only for a live broker session.
    pub async fn ping(&self) -> Result<PingResult, AppError> {
        let payload = PingPayload {
            apikey: self.api_key,
        };
        let envelope = self.post(Endpoint::Ping, &payload).await?;
        Ok(PingResult::from(envelope))
    }

    async fn post<B: Serialize>(&self, endpoint: Endpoint, body: &B) -> Result<Envelope, AppError> {
        let url = format!("{}{}", self.base_url, endpoint.path());
        let response = self
            .http
            .post(url)
            .json(body)
            .send()
            .await
            .map_err(|error| self.transport_error(endpoint, &error))?;
        let status = response.status();
        let text = response
            .text()
            .await
            .map_err(|error| self.transport_error(endpoint, &error))?;
        reply::interpret(status, &text)
    }

    /// Describes a failure to send a request or to read its reply.
    ///
    /// Placing an order is not idempotent. Only a failed connection proves
    /// nothing was sent; after any other failure the user is told to check
    /// the order book before retrying rather than risk a duplicate position.
    fn transport_error(&self, endpoint: Endpoint, error: &reqwest::Error) -> AppError {
        // Checked before `is_timeout`, which a connect timeout also matches.
        if error.is_connect() {
            return AppError::network(format!(
                "Could not connect to OpenAlgo at {}. {}",
                self.base_url,
                root_cause(error)
            ));
        }
        let problem = if error.is_timeout() {
            "OpenAlgo did not reply in time".to_owned()
        } else {
            format!("The connection to OpenAlgo failed: {}", root_cause(error))
        };
        match endpoint {
            Endpoint::Ping => AppError::network(problem),
            Endpoint::PlaceSmartOrder => AppError::network(format!(
                "{problem}. The order may still have been placed. Check the order book before retrying."
            )),
        }
    }
}

/// The innermost error message. reqwest's own message is a generic "error
/// sending request"; the cause names the real problem, such as a refused
/// connection or an unknown host.
fn root_cause(error: &reqwest::Error) -> String {
    std::iter::successors(error.source(), |&cause| cause.source())
        .last()
        .map_or_else(|| error.to_string(), ToString::to_string)
}
