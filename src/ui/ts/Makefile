.PHONY: all build clean

REPO_DIR := $(shell cd ../../.. ; pwd)

APP_NAME := rc-combinator
APP_TS_DIR := .
APP_SRC_DIR := $(APP_TS_DIR)/src
APP_BUILD_DIR := $(APP_TS_DIR)/dist
APP_TS_LIST := $(wildcard $(APP_SRC_DIR)/*.ts)
APP_DIST_DIR := $(REPO_DIR)/docs
APP_JS := $(APP_DIST_DIR)/index.mjs

EXTRA_DEPENDENCIES := \
	Makefile

all: build

build: $(APP_JS)

$(APP_JS): $(APP_TS_LIST) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(dir $@)
	cd $(APP_TS_DIR) && npx tsdown
	cp $(APP_BUILD_DIR)/*.mjs $(APP_DIST_DIR)/.

clean:
	@rm -rf $(APP_BUILD_DIR)
	@rm -f $(APP_JS)
