.PHONY: all build clean

REPO_DIR := $(shell cd ../../.. ; pwd)

BUILD_DIR := build

RCMB_DIR := ../cpp
RCMB_INC_DIR := $(RCMB_DIR)/include
RCMB_SRC_DIR := $(RCMB_DIR)/src

MODULE_NAME := rcmb_wasm
MODULE_SRC_DIR := src
MODULE_WASM := $(BUILD_DIR)/$(MODULE_NAME).wasm
MODULE_JS := $(BUILD_DIR)/$(MODULE_NAME).js

DIST_DIR := $(REPO_DIR)/docs/worker
DIST_WASM := $(DIST_DIR)/$(MODULE_NAME).wasm
#DIST_JS := $(DIST_DIR)/$(MODULE_NAME).js

all: build

build: $(MODULE_WASM)

CPP_FILES := \
	$(wildcard $(RCMB_SRC_DIR)/*.cpp)  \
	$(wildcard $(MODULE_SRC_DIR)/*.cpp)

DEPENDENCIES := \
	$(CPP_FILES) \
	$(wildcard $(RCMB_INC_DIR)/rcmb/*.hpp) \
	$(wildcard $(RCMB_SRC_DIR)/*.cpp) \
	Makefile

CXXFLAGS := \
	-std=c++20 \
	-I$(RCMB_INC_DIR) \
	-O3 \
	-Wall \
	--bind \
	-s MODULARIZE=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s EXPORT_NAME="createRcmbWasm"

#	-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
#	-s EXPORTED_FUNCTIONS='["_malloc","_free"]' 
#	-fwasm-exceptions

$(MODULE_WASM): $(DEPENDENCIES)
	@mkdir -p $(BUILD_DIR)
	emcc $(CXXFLAGS) -o $(MODULE_JS) $(CPP_FILES)
	cp $(MODULE_WASM) $(DIST_WASM)

clean:
	@rm -rf $(BUILD_DIR)
