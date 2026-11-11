use std::env;
use std::path::Path;

fn main() {
    embed_manifest_in_windows_tests();
    tauri_build::build();
}

/// Lets the integration tests in `tests/`, which start Tauri's mock runtime,
/// run on Windows.
///
/// Tauri imports Common Controls v6 functions, which resolve only when the
/// executable declares that dependency in an application manifest.
/// `tauri_build` embeds one in the app binary but not in test executables,
/// which then fail to start with `STATUS_ENTRYPOINT_NOT_FOUND`. Tauri works
/// around this the same way for its own tests. The app binary is unaffected.
fn embed_manifest_in_windows_tests() {
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_env = env::var("CARGO_CFG_TARGET_ENV").unwrap_or_default();
    if target_os != "windows" || target_env != "msvc" {
        return;
    }
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("set by Cargo");
    let manifest = Path::new(&manifest_dir).join("tests/windows-app-manifest.xml");
    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
    println!(
        "cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}",
        manifest.display()
    );
}
