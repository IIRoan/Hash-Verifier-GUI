#!/bin/bash
RUST_LOG=debug RUST_BACKTRACE=1 APPIMAGE_EXTRACT_AND_RUN=1 bunx tauri build
