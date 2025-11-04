.PHONY: all  build run clean

all: build

BIN := test.out

RCCOMB_INC_DIR := ../include
RCCOMB_SRC_DIR := ../src
RCCOMB_HPP_FILES := \
	$(wildcard $(RCCOMB_INC_DIR)/rcmb/*.hpp)
RCCOMB_CPP_FILES := \
	$(wildcard $(RCCOMB_SRC_DIR)/*.cpp)

APP_SRC_DIR := .
APP_CPP_FILES := \
	$(wildcard $(APP_SRC_DIR)/*.cpp)

BUILD_DIR := ./build

CXXFLAGS := \
	-std=c++20 \
	-I$(RCCOMB_INC_DIR) \
	-DRCCOMB_DEBUG \
	-O2 \
	-Wall

build: $(BIN)

$(BIN): $(BUILD_DIR)/rcmb.o $(BUILD_DIR)/test.o
	$(CXX) $(CXXFLAGS) -o $@ $^

$(BUILD_DIR)/rcmb.o: $(RCCOMB_CPP_FILES) $(RCCOMB_HPP_FILES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(RCCOMB_CPP_FILES)

$(BUILD_DIR)/test.o: $(APP_CPP_FILES) $(RCCOMB_HPP_FILES)
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) -c -o $@ $(APP_CPP_FILES)

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(BIN)
	rm -f $(BUILD_DIR)/*.o
