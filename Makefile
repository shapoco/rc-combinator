.PHONY: all update_postfix test setup clean

TEST_PORT := 52480

REPO_DIR := $(shell pwd)
BIN_DIR := $(REPO_DIR)/bin
APP_DIST_DIR := $(REPO_DIR)/docs
APP_TS_DIR := $(REPO_DIR)/src/ts
APP_WASM_DIR := $(REPO_DIR)/src/wasm

CMD_UPDATE_POSTFIX := python3 $(BIN_DIR)/update_url_postfix.py

all:
	@make --no-print-directory -C $(APP_TS_DIR) build
	@make --no-print-directory -C $(APP_WASM_DIR) build

update_postfix:
	$(CMD_UPDATE_POSTFIX) --dir $(APP_DIST_DIR) --file docs/index.html
	$(CMD_UPDATE_POSTFIX) --dir $(APP_DIST_DIR) --file docs/wasm-beta.html
	$(CMD_UPDATE_POSTFIX) --dir $(APP_DIST_DIR) --file docs/clock/index.html

clean:
	@make --no-print-directory -C $(APP_TS_DIR) clean
	@make --no-print-directory -C $(APP_WASM_DIR) clean

test:
	python3 -m http.server -d $(APP_DIST_DIR) $(TEST_PORT)

setup:
	cd $(BIN_DIR) && ./setup_emsdk.sh
	cd $(APP_TS_DIR) && npm install -D tsdown typescript

