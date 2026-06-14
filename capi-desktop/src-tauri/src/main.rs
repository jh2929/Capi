// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(target_os = "linux"))]
use std::io::Write;

fn main() {
    #[cfg(not(target_os = "linux"))]
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("Capi v0.1.1 — Error inesperado\n\n{info:?}");
        let _ = writeln!(std::io::stderr(), "{msg}");
        #[cfg(target_os = "windows")]
        rfd::MessageDialog::new()
            .set_title("Capi - Error")
            .set_description(&msg)
            .set_level(rfd::MessageLevel::Error)
            .show();
    }));
    capi_desktop_lib::run()
}
