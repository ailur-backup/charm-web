WASM_DIR = wasm
BUILD_DIR = build
BUILD_WASM_DIR = $(BUILD_DIR)/static/wasm
PKG_DIR = $(WASM_DIR)/pkg
PUBLIC_DIR = public
JS_FILE = charm_web.js
WASM_FILE = charm_web_bg.wasm
HTTP_SERVER = httpserver -d $(BUILD_DIR) -p 8080

all: build copy

build:
	@echo "Building WASM package..."
	wasm-pack build --target web $(WASM_DIR)

copy:
	@echo "Copying files..."
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_WASM_DIR)
	cp $(PUBLIC_DIR)/* $(BUILD_DIR) -r
	cp $(PKG_DIR)/$(JS_FILE) $(BUILD_WASM_DIR)/
	cp $(PKG_DIR)/$(WASM_FILE) $(BUILD_WASM_DIR)/

server:
	@echo "Starting HTTP server..."
	$(HTTP_SERVER)

.PHONY: all build copy
