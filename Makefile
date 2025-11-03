.PHONY: all update_postfix test setup clean

TEST_PORT := 52480

REPO_DIR := $(shell pwd)
BASE_URL := https://shapoco.github.io/rc-combinator/

BIN_DIR := $(REPO_DIR)/bin
DIST_DIR := $(REPO_DIR)/docs
UI_TS_DIR := $(REPO_DIR)/src/ui/ts
WORKER_TS_DIR := $(REPO_DIR)/src/worker/ts
LIB_WASM_DIR := $(REPO_DIR)/src/lib/cpp_wasm

CMD_UPDATE_POSTFIX := python3 $(BIN_DIR)/update_url_postfix.py

all: build update_postfix

build:
	make --no-print-directory -C $(LIB_WASM_DIR) build
	make --no-print-directory -C $(WORKER_TS_DIR) build
	make --no-print-directory -C $(UI_TS_DIR) build

update_postfix:
	$(CMD_UPDATE_POSTFIX) --base_dir $(DIST_DIR) --base_url $(BASE_URL) --file clock/index.html
	$(CMD_UPDATE_POSTFIX) --base_dir $(DIST_DIR) --base_url $(BASE_URL) --file index.html
	$(CMD_UPDATE_POSTFIX) --base_dir $(DIST_DIR) --base_url $(BASE_URL) --file ui/index.mjs
	$(CMD_UPDATE_POSTFIX) --base_dir $(DIST_DIR) --base_url $(BASE_URL) --file worker/index.mjs
clean:
	@make --no-print-directory -C $(UI_TS_DIR) clean
	@make --no-print-directory -C $(LIB_WASM_DIR) clean

test:
	python3 -m http.server -d $(DIST_DIR) $(TEST_PORT)
#	cd $(DIST_DIR) ; $(BIN_DIR)/test_server.sh $(TEST_PORT)

setup:
	cd $(BIN_DIR) && ./setup_emsdk.sh
	@make --no-print-directory -C $(UI_TS_DIR) setup
	@make --no-print-directory -C $(WORKER_TS_DIR) setup

