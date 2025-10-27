.PHONY: all update_postfix test setup clean

TEST_PORT := 52480

REPO_DIR := $(shell pwd)
BASE_URL := https://shapoco.github.io/rc-combinator/

BIN_DIR := $(REPO_DIR)/bin
APP_DIST_DIR := $(REPO_DIR)/docs
APP_TS_DIR := $(REPO_DIR)/src/ui/ts
APP_WASM_DIR := $(REPO_DIR)/src/lib/cpp_wasm

CMD_UPDATE_POSTFIX := python3 $(BIN_DIR)/update_url_postfix.py

all: build update_postfix

build:
	@make --no-print-directory -C $(APP_TS_DIR) build
	@make --no-print-directory -C $(APP_WASM_DIR) build

update_postfix:
	$(CMD_UPDATE_POSTFIX) --base_dir $(APP_DIST_DIR) --base_url $(BASE_URL) --file rccomb_core.js
	$(CMD_UPDATE_POSTFIX) --base_dir $(APP_DIST_DIR) --base_url $(BASE_URL) --file clock/index.html
	$(CMD_UPDATE_POSTFIX) --base_dir $(APP_DIST_DIR) --base_url $(BASE_URL) --file nowasm.html
	$(CMD_UPDATE_POSTFIX) --base_dir $(APP_DIST_DIR) --base_url $(BASE_URL) --file index.html

clean:
	@make --no-print-directory -C $(APP_TS_DIR) clean
	@make --no-print-directory -C $(APP_WASM_DIR) clean

test:
	python3 -m http.server -d $(APP_DIST_DIR) $(TEST_PORT)

setup:
	cd $(BIN_DIR) && ./setup_emsdk.sh
	cd $(APP_TS_DIR) && npm install -D tsdown typescript

