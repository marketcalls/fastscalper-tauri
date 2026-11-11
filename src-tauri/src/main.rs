// Hides the extra console window on Windows release builds. Do not remove.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    fastscalper_lib::run();
}
