.PHONY: all  build run clean

all: build

BIN_DIR := ./bin
BIN := $(BIN_DIR)/rcmb

RCMB_DIR := ../../lib/cpp
RCMB_INC_DIR := $(RCMB_DIR)/include
RCMB_SRC_DIR := $(RCMB_DIR)/src
RCMB_HPP_FILES := \
	$(wildcard $(RCMB_INC_DIR)/rcmb/*.hpp)
RCMB_CPP_FILES := \
	$(wildcard $(RCMB_SRC_DIR)/*.cpp)

APP_SRC_DIR := src
APP_CPP_FILES := \
	$(wildcard $(APP_SRC_DIR)/*.cpp)

BUILD_DIR := ./build

CXXFLAGS := \
	-std=c++20 \
	-I$(RCMB_INC_DIR) \
	-DRCMB_DEBUG \
	-O2 \
	-Wall

build: $(BIN)

$(BIN): $(BUILD_DIR)/rcmb.o $(BUILD_DIR)/test.o
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $^

$(BUILD_DIR)/rcmb.o: $(RCMB_CPP_FILES) $(RCMB_HPP_FILES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(RCMB_CPP_FILES)

$(BUILD_DIR)/test.o: $(APP_CPP_FILES) $(RCMB_HPP_FILES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(APP_CPP_FILES)

run: $(BIN)
	./$(BIN)

clean:
	rm -rf $(BIN_DIR)
	rm -rf $(BUILD_DIR)
