.PHONY: all command clock_json

REPO_DIR := $(shell cd ../../.. ; pwd)

DIST_DIR := $(REPO_DIR)/docs/clock

E1_JSON := $(DIST_DIR)/topologies_e1.json
E3_JSON := $(DIST_DIR)/topologies_e3.json
E6_JSON := $(DIST_DIR)/topologies_e6.json
E12_JSON := $(DIST_DIR)/topologies_e12.json
E24_JSON := $(DIST_DIR)/topologies_e24.json

VALUES := 1000,2000,3000,4000,5000,6000,7000,8000,9000,10000,11000,12000,13000,14000,15000,16000,17000,18000,19000,20000,21000,22000,23000,24000,25000,26000,27000,28000,29000,30000,31000,32000,33000,34000,35000,36000,37000,38000,39000,40000,41000,42000,43000,44000,45000,46000,47000,48000,49000,50000,51000,52000,53000,54000,55000,56000,57000,58000,59000

RCMB_DIR := ../../pc/rcmb
RCMB_CMD := $(RCMB_DIR)/bin/rcmb
RCMB_DEPENDENCIES := \
	$(wildcard $(RCMB_DIR)/src/*.cpp)

clock_json: $(E1_JSON) $(E3_JSON) $(E6_JSON) $(E12_JSON) $(E24_JSON)

$(RCMB_CMD): $(RCMB_DEPENDENCIES)
	make --no-print-directory -C $(RCMB_DIR) all

$(E1_JSON): $(RCMB_CMD) Makefile
	@mkdir -p $(DIST_DIR)
	$(RCMB_CMD) r -s e1 -t $(VALUES) -n 12 -e 0 > $@

$(E3_JSON): $(RCMB_CMD) Makefile
	@mkdir -p $(DIST_DIR)
	$(RCMB_CMD) r -s e3 -t $(VALUES) -n 6 -e 0 > $@

$(E6_JSON): $(RCMB_CMD) Makefile
	@mkdir -p $(DIST_DIR)
	$(RCMB_CMD) r -s e6 -t $(VALUES) -n 5 -e 0 > $@

$(E12_JSON): $(RCMB_CMD) Makefile
	@mkdir -p $(DIST_DIR)
	$(RCMB_CMD) r -s e12 -t $(VALUES) -n 4 -e 0 > $@

$(E24_JSON): $(RCMB_CMD) Makefile
	@mkdir -p $(DIST_DIR)
	$(RCMB_CMD) r -s e24 -t $(VALUES) -n 2 -e 0 > $@
