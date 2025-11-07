# .PHONY: all images fonts launch-openocd clean distclean
.PHONY: all build clean distclean

REPO_DIR = ..
INC_DIR = include
SRC_DIR = src
BUILD_DIR = build
BIN_DIR = bin/$(BOARD)

#BOARD := pico
BOARD := pico2
APP_NAME := rcmb_clock

BIN_NAME = $(APP_NAME).uf2
ELF_NAME = $(APP_NAME).elf
BIN = $(BIN_DIR)/$(BIN_NAME)
ELF = $(BIN_DIR)/$(ELF_NAME)

DEPENDENCY_LIST=\
	$(wildcard $(SRC_DIR)/*.*) \
	$(wildcard $(INC_DIR)/*.*) \
	$(wildcard $(INC_DIR)/**/*.*)

EXTRA_DEPENDENCY_LIST=\
	Makefile \
	CMakeLists.txt

all: build

build: $(BIN)

$(BIN): $(DEPENDENCY_LIST) $(EXTRA_DEPENDENCY_LIST)
	mkdir -p $(BUILD_DIR)
	cd $(BUILD_DIR) \
		&& cmake -DPICO_BOARD=$(BOARD) -DCMAKE_BUILD_TYPE=Debug .. \
		&& make -j
	mkdir -p $(BIN_DIR)
	cp $(BUILD_DIR)/$(BIN_NAME) $(BIN)
	cp $(BUILD_DIR)/$(ELF_NAME) $(ELF)
	@echo "------------------------------"
	@grep "todo" -r include/ src/ || echo "no TODOs"
	@echo "------------------------------"
	@echo -n "UF2 File: "
	@du -h $(BIN)
	@echo -n "ELF File: "
	@du -h $(ELF)

$(ELF): $(BIN)

ifneq ("$(wildcard debug.mk)", "")
include debug.mk
else ifneq ("$(shell which cmd.exe)", "")
include debug/wsl/debug.sample.mk
endif

objclean:
	rm -f \
		$(BUILD_DIR)/*.uf2 \
		$(BUILD_DIR)/*.elf

clean: objclean
	rm -rf $(BUILD_DIR)

distclean: clean
	rm -rf $(BIN_DIR)
