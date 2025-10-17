.PHONY: all build test setup

REPO_DIR := $(shell pwd)
TEST_PORT := 52480

APP_NAME := rc-combinator
APP_TS_DIR := src/ts
APP_SRC_DIR := $(APP_TS_DIR)/src
APP_BUILD_DIR := $(APP_TS_DIR)/dist
APP_TS_LIST := $(wildcard $(APP_SRC_DIR)/*.ts)
APP_DIST_DIR := $(REPO_DIR)/docs
APP_JS := $(APP_DIST_DIR)/$(APP_NAME).js

EXTRA_DEPENDENCIES := \
	$(APP_TS_DIR)/tsdown.config.ts \
	Makefile

all: build

build: $(APP_JS)

$(APP_JS): $(APP_TS_LIST) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(dir $@)
	cd $(APP_TS_DIR) && npx tsdown
	cp $(APP_BUILD_DIR)/*.mjs $(APP_DIST_DIR)/.

test:
	python3 -m http.server -d $(APP_DIST_DIR) $(TEST_PORT)

setup:
	cd $(APP_TS_DIR) && npm install -D tsdown typescript
