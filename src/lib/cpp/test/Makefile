.PHONY: all  build run clean

all: build

BIN := test.out

RCCOMB_INC_DIR := ../include
RCCOMB_SRC_DIR := ../src

APP_SRC_DIR := .

HPP_FILES := \
	$(wildcard $(RCCOMB_INC_DIR)/rccomb/*.hpp)
CPP_FILES := \
	$(wildcard $(RCCOMB_SRC_DIR)/*.cpp)  \
	$(wildcard $(APP_SRC_DIR)/*.cpp)

CXXFLAGS := \
	-std=c++20 \
	-I$(RCCOMB_INC_DIR) \
	-DRCCOMB_DEBUG \
	-O2 \
	-Wall

build: $(BIN)

$(BIN): $(CPP_FILES) $(HPP_FILES)
	$(CXX) $(CXXFLAGS) -o $@ $^

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(BIN)
