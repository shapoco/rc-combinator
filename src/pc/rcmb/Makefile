.PHONY: all  build run clean

all: build

BUILD_DIR := ./build

BIN_DIR := ./bin
BIN := $(BIN_DIR)/rcmb

RCMB_DIR := ../../lib/cpp
RCMB_INC_DIR := $(RCMB_DIR)/include
RCMB_SRC_DIR := $(RCMB_DIR)/src
RCMB_HPP_FILES := \
	$(wildcard $(RCMB_INC_DIR)/rcmb/*.hpp)
RCMB_CPP_FILES := \
	$(wildcard $(RCMB_SRC_DIR)/*.cpp)
RCMB_OBJ := $(BUILD_DIR)/rcmb_lib.o

APP_SRC_DIR := src
APP_CPP_FILES := \
	$(wildcard $(APP_SRC_DIR)/*.cpp)
APP_OBJ := $(BUILD_DIR)/rcmb_app.o

OBJ_FILES := \
	$(RCMB_OBJ) \
	$(APP_OBJ)

CXXFLAGS := \
	-std=c++20 \
	-I$(RCMB_INC_DIR) \
	-O2 \
	-Wall

EXTRA_DEPENDENCIES := \
	Makefile

build: $(BIN)

$(BIN): $(OBJ_FILES) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $(OBJ_FILES)

$(RCMB_OBJ): $(RCMB_CPP_FILES) $(RCMB_HPP_FILES) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(RCMB_CPP_FILES)

$(APP_OBJ): $(APP_CPP_FILES) $(RCMB_HPP_FILES) $(EXTRA_DEPENDENCIES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(APP_CPP_FILES)

run: $(BIN)
	./$(BIN)

clean:
	rm -rf $(BIN_DIR)
	rm -rf $(BUILD_DIR)
