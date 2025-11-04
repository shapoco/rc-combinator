.PHONY: all build setup clean

REPO_DIR := $(shell cd ../../../.. ; pwd)

APP_NAME := rc-combinator
APP_DIR := .
APP_SRC_DIR := $(APP_DIR)/src
APP_BUILD_DIR := $(APP_DIR)/dist
APP_TS_LIST := $(wildcard $(APP_SRC_DIR)/*.ts)
APP_DIST_DIR := $(REPO_DIR)/docs/worker
APP_DIST_MJS := $(APP_DIST_DIR)/index.mjs

LIB_DIR := ../../../lib/ts
LIB_SRC_DIR := $(LIB_DIR)/src
LIB_TS_LIST := $(wildcard $(LIB_SRC_DIR)/*.ts)

EXTRA_DEPENDENCIES := \
	Makefile

all: build

build: $(APP_DIST_MJS)

$(APP_DIST_MJS): $(APP_TS_LIST) $(LIB_TS_LIST) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(dir $@)
	cd $(APP_DIR) && npx tsdown
	cp $(APP_BUILD_DIR)/*.mjs $(APP_DIST_DIR)/.
# ローカルでの動作確認時の CORS 関連問題回避のため Node.js への依存を削除
	sed -i 's/^import\b/\/\/import/' $(APP_DIST_MJS)
	sed -i 's/var __require = /var __require = null; \/\//' $(APP_DIST_MJS)

setup:
	npm install -D tsdown typescript

clean:
	@rm -rf $(APP_BUILD_DIR)
	@rm -f $(APP_DIST_MJS)
