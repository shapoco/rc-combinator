.PHONY: all build clean

REPO_DIR := ../..

BUILD_DIR := build

RCCOMB_DIR := ../cpp
RCCOMB_INC_DIR := $(RCCOMB_DIR)/include
RCCOMB_SRC_DIR := $(RCCOMB_DIR)/src

MODULE_NAME := rccomb_core
MODULE_SRC_DIR := src
MODULE_WASM := $(BUILD_DIR)/$(MODULE_NAME).wasm
MODULE_JS := $(BUILD_DIR)/$(MODULE_NAME).js

DOCS_DIR := $(REPO_DIR)/docs
DOCS_MODULE_WASM := $(DOCS_DIR)/$(MODULE_NAME).wasm
DOCS_MODULE_JS := $(DOCS_DIR)/$(MODULE_NAME).js

all: build

build: $(DOCS_MODULE_JS)

CPP_FILES := \
	$(wildcard $(RCCOMB_SRC_DIR)/*.cpp)  \
	$(wildcard $(MODULE_SRC_DIR)/*.cpp)

DEPENDENCIES := \
	$(CPP_FILES) \
	$(wildcard $(RCCOMB_INC_DIR)/rccomb/*.hpp) \
	$(wildcard $(RCCOMB_SRC_DIR)/*.cpp) \
	Makefile

CXXFLAGS := \
	-std=c++20 \
	-fwasm-exceptions \
	-I$(RCCOMB_INC_DIR) \
	-O3 \
	-Wall \
	--bind \
	-s MODULARIZE=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s EXPORT_NAME="createModule" \
	-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
	-s EXPORTED_FUNCTIONS='["_malloc","_free"]' 

#	-s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","FS","malloc","free"]'
#	-s EXPORTED_FUNCTIONS='["_malloc","_free"]' \

$(DOCS_MODULE_JS): $(MODULE_JS)
	@mkdir -p $(DOCS_DIR)
	@cp $(MODULE_WASM) $(DOCS_MODULE_WASM)
	@cp $(MODULE_JS) $(DOCS_MODULE_JS)

$(MODULE_JS): $(DEPENDENCIES)
	@mkdir -p $(BUILD_DIR)
	emcc $(CXXFLAGS) -o $(MODULE_JS) $(CPP_FILES)

clean:
	@rm -rf $(BUILD_DIR)
