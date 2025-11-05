#include <chrono>
#include <cstdio>
#include <map>
#include <memory>
#include <stack>
#include <vector>

#include <getopt.h>

#include <rcmb/rcmb.hpp>

using namespace rcmb;

enum class output_format_t {
  TEXT,
  JSON,
};

static constexpr char OPT_SERIES = 's';
static constexpr char OPT_TARGET = 't';
static constexpr char OPT_FORMAT = 'f';
static constexpr char OPT_NUM_ELEMS_MIN = 0x82;
static constexpr char OPT_NUM_ELEMS_MAX = 'n';
static constexpr char OPT_TARGET_TOL = 0x84;
static constexpr char OPT_TARGET_TOL_MIN = 0x85;
static constexpr char OPT_TARGET_TOL_MAX = 'e';
static constexpr char OPT_TOTAL_MIN = 0x87;
static constexpr char OPT_TOTAL_MAX = 0x88;
static constexpr char OPT_SERIES_MIN = 'm';
static constexpr char OPT_SERIES_MAX = 'x';

static struct option long_opts[] = {
    {"series", required_argument, 0, OPT_SERIES},
    {"series-min", required_argument, 0, OPT_SERIES_MIN},
    {"series-max", required_argument, 0, OPT_SERIES_MAX},
    {"num-elems-min", required_argument, 0, OPT_NUM_ELEMS_MIN},
    {"num-elems-max", required_argument, 0, OPT_NUM_ELEMS_MAX},
    {"target", required_argument, 0, OPT_TARGET},
    {"target-tol", required_argument, 0, OPT_TARGET_TOL},
    {"target-tol-min", required_argument, 0, OPT_TARGET_TOL_MIN},
    {"target-tol-max", required_argument, 0, OPT_TARGET_TOL_MAX},
    {"total-min", required_argument, 0, OPT_TOTAL_MIN},
    {"total-max", required_argument, 0, OPT_TOTAL_MAX},
    {"format", required_argument, 0, OPT_FORMAT},
    {0, 0, 0, 0},
};

const std::vector<value_t> e1 = {100};
const std::vector<value_t> e3 = {100, 220, 470};
const std::vector<value_t> e6 = {100, 150, 220, 330, 470, 680};
const std::vector<value_t> e12 = {100, 120, 150, 180, 220, 270,
                                  330, 390, 470, 560, 680, 820};
const std::vector<value_t> e24 = {100, 110, 120, 130, 150, 160, 180, 200,
                                  220, 240, 270, 300, 330, 360, 390, 430,
                                  470, 510, 560, 620, 680, 750, 820, 910};

const std::vector<value_t> e48 = {
    100, 105, 110, 115, 121, 127, 133, 140, 147, 154, 162, 169,
    178, 187, 196, 205, 215, 226, 237, 249, 261, 274, 287, 301,
    316, 332, 348, 365, 383, 402, 422, 442, 464, 487, 511, 536,
    562, 590, 619, 649, 681, 715, 750, 787, 825, 866, 909, 953};

const std::vector<value_t> e96 = {
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137,
    140, 143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191,
    196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267,
    274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374,
    383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523,
    536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732,
    750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976};

const std::vector<value_t> e192 = {
    100, 101, 102, 104, 105, 106, 107, 109, 110, 111, 113, 114, 115, 117, 118,
    120, 121, 123, 124, 126, 127, 129, 130, 132, 133, 135, 137, 138, 140, 142,
    143, 145, 147, 149, 150, 152, 154, 156, 158, 160, 162, 164, 165, 167, 169,
    172, 174, 176, 178, 180, 182, 184, 187, 189, 191, 193, 196, 198, 200, 203,
    205, 208, 210, 213, 215, 218, 221, 223, 226, 229, 232, 234, 237, 240, 243,
    246, 249, 252, 255, 258, 261, 264, 267, 271, 274, 277, 280, 284, 287, 291,
    294, 298, 301, 305, 309, 312, 316, 320, 324, 328, 332, 336, 340, 344, 348,
    352, 357, 361, 365, 370, 374, 379, 383, 388, 392, 397, 402, 407, 412, 417,
    422, 427, 432, 437, 442, 448, 453, 459, 464, 470, 475, 481, 487, 493, 499,
    505, 511, 517, 523, 530, 536, 542, 549, 556, 562, 569, 576, 583, 590, 597,
    604, 612, 619, 626, 634, 642, 649, 657, 665, 673, 681, 690, 698, 706, 715,
    723, 732, 741, 750, 759, 768, 777, 787, 796, 806, 816, 825, 835, 845, 856,
    866, 876, 887, 898, 909, 920, 931, 942, 953, 965, 976, 988};

const std::vector<value_t> e24_e48 = {
    100, 105, 110, 115, 120, 121, 127, 130, 133, 140, 147, 150, 154, 160,
    162, 169, 178, 180, 187, 196, 200, 205, 215, 220, 226, 237, 240, 249,
    261, 270, 274, 287, 300, 301, 316, 330, 332, 348, 360, 365, 383, 390,
    402, 422, 430, 442, 464, 470, 487, 510, 511, 536, 560, 562, 590, 619,
    620, 649, 680, 681, 715, 750, 787, 820, 825, 866, 909, 910, 953};

const std::vector<value_t> e24_e96 = {
    100, 102, 105, 107, 110, 113, 115, 118, 120, 121, 124, 127, 130, 133, 137,
    140, 143, 147, 150, 154, 158, 160, 162, 165, 169, 174, 178, 180, 182, 187,
    191, 196, 200, 205, 210, 215, 220, 221, 226, 232, 237, 240, 243, 249, 255,
    261, 267, 270, 274, 280, 287, 294, 300, 301, 309, 316, 324, 330, 332, 340,
    348, 357, 360, 365, 374, 383, 390, 392, 402, 412, 422, 430, 432, 442, 453,
    464, 470, 475, 487, 499, 510, 511, 523, 536, 549, 560, 562, 576, 590, 604,
    619, 620, 634, 649, 665, 680, 681, 698, 715, 732, 750, 768, 787, 806, 820,
    825, 845, 866, 887, 909, 910, 931, 953, 976};

const std::vector<value_t> e24_e192 = {
    100, 101, 102, 104, 105, 106, 107, 109, 110, 111, 113, 114, 115, 117, 118,
    120, 121, 123, 124, 126, 127, 129, 130, 132, 133, 135, 137, 138, 140, 142,
    143, 145, 147, 149, 150, 152, 154, 156, 158, 160, 162, 164, 165, 167, 169,
    172, 174, 176, 178, 180, 182, 184, 187, 189, 191, 193, 196, 198, 200, 203,
    205, 208, 210, 213, 215, 218, 220, 221, 223, 226, 229, 232, 234, 237, 240,
    243, 246, 249, 252, 255, 258, 261, 264, 267, 270, 271, 274, 277, 280, 284,
    287, 291, 294, 298, 300, 301, 305, 309, 312, 316, 320, 324, 328, 330, 332,
    336, 340, 344, 348, 352, 357, 360, 361, 365, 370, 374, 379, 383, 388, 390,
    392, 397, 402, 407, 412, 417, 422, 427, 430, 432, 437, 442, 448, 453, 459,
    464, 470, 475, 481, 487, 493, 499, 505, 510, 511, 517, 523, 530, 536, 542,
    549, 556, 560, 562, 569, 576, 583, 590, 597, 604, 612, 619, 620, 626, 634,
    642, 649, 657, 665, 673, 680, 681, 690, 698, 706, 715, 723, 732, 741, 750,
    759, 768, 777, 787, 796, 806, 816, 820, 825, 835, 845, 856, 866, 876, 887,
    898, 909, 910, 920, 931, 942, 953, 965, 976, 988};

uint32_t test_object_id = 1;
inline uint32_t get_next_object_id() { return test_object_id++; }

class TestTopologyClass;
using TestTopology = std::shared_ptr<TestTopologyClass>;
class TestTopologyClass {
 public:
  uint32_t id;
  bool parallel;
  const int num_leafs;
  std::vector<TestTopology> children;
  TestTopologyClass(bool parallel, int num_leafs,
                    const std::vector<TestTopology>& children)
      : id(get_next_object_id()),
        parallel(parallel),
        num_leafs(num_leafs),
        children(children) {}
  inline bool is_leaf() const { return children.empty(); }
};
static inline TestTopology create_test_topology(
    bool parallel, int num_leafs, const std::vector<TestTopology>& children) {
  return std::make_shared<TestTopologyClass>(parallel, num_leafs, children);
}

class TestCombinationClass;
using TestCombination = std::shared_ptr<TestCombinationClass>;
class TestCombinationClass {
 public:
  TestTopology topology;
  std::vector<TestCombination> children;
  value_t value;
  TestCombinationClass(const TestTopology& topology,
                       const std::vector<TestCombination>& children,
                       value_t value)
      : topology(topology), children(children), value(value) {}
  inline bool is_leaf() const { return topology->is_leaf(); }
  inline std::string to_string() const {
    if (is_leaf()) {
      return std::to_string(value);
    } else {
      std::string s;
      for (size_t i = 0; i < children.size(); i++) {
        const auto& child = children[i];
        if (child->is_leaf()) {
          s += child->to_string();
        } else {
          s += "(" + child->to_string() + ")";
        }
        if (i + 1 < children.size()) {
          s += topology->parallel ? "//" : "--";
        }
      }
      // s += "==>" + std::to_string(value);
      return s;
    }
  }
};
static inline TestCombination create_test_combination(
    const TestTopology& topology, const std::vector<TestCombination>& children,
    value_t value) {
  return std::make_shared<TestCombinationClass>(topology, children, value);
}

std::map<int, std::vector<TestTopology>> topologies;

bool test_search_combinations(ComponentType type, std::vector<value_t>& series,
                              int max_elements, value_t target);
bool test_search_dividers(std::vector<value_t>& series, int max_elements,
                          value_t target, bool verbose = false);
TestCombination test_calc_value(bool bake, ComponentType type,
                                TestTopology& topo, const value_t* leaf_values,
                                int pos, value_t* out_value = nullptr);
std::vector<TestTopology>& test_get_topology(bool parallel, int n);
void test_collect_topologies(bool parallel, std::vector<TestTopology>& topos,
                             const std::vector<int>& poses);

std::vector<std::string> split(std::string str, char delimiter = ',');
output_format_t parse_output_format(const std::string& format_str);

int main_xcmb(ComponentType type, int argc, char** argv);
int main_rdiv(int argc, char** argv);
int main_alt(int argc, char** argv);

std::vector<value_t> get_values_vector(
    const std::string& series,
    value_t min = -std::numeric_limits<value_t>::infinity(),
    value_t max = std::numeric_limits<value_t>::infinity());
std::vector<value_t> get_series_vector(
    const std::vector<value_t>& series,
    value_t min = -std::numeric_limits<value_t>::infinity(),
    value_t max = std::numeric_limits<value_t>::infinity());

int main(int argc, char** argv) {
  if (argc < 2) {
    return main_alt(argc, argv);
  }

  std::string method = argv[1];
  if (method == "test") {
    return main_alt(argc - 1, &argv[1]);
  } else if (method == "r") {
    return main_xcmb(ComponentType::Resistor, argc - 1, &argv[1]);
  } else if (method == "c") {
    return main_xcmb(ComponentType::Capacitor, argc - 1, &argv[1]);
  } else if (method == "d") {
    return main_rdiv(argc - 1, &argv[1]);
  } else {
    printf("Unknown method: '%s'\n", method.c_str());
    return -1;
  }
}

int main_xcmb(ComponentType type, int argc, char** argv) {
  std::string series_str = "e3";
  std::string target_str = "";
  output_format_t output_format = output_format_t::TEXT;
  int num_elems_min = 1;
  int num_elems_max = 3;
  value_t target_tol = VALUE_NONE;
  value_t target_tol_min = VALUE_NONE;
  value_t target_tol_max = VALUE_NONE;
  value_t series_min = VALUE_NONE;
  value_t series_max = VALUE_NONE;

  char short_opts[256];
  snprintf(short_opts, sizeof(short_opts), "%c:%c:%c:%c:%c:%c:%c:", OPT_SERIES,
           OPT_TARGET, OPT_FORMAT, OPT_NUM_ELEMS_MAX, OPT_TARGET_TOL_MAX,
           OPT_SERIES_MIN, OPT_SERIES_MAX);

  int opt;
  while ((opt = getopt_long(argc, argv, short_opts, long_opts, NULL)) != -1) {
    switch (opt) {
      case OPT_SERIES:
        series_str = optarg;
        break;
      case OPT_TARGET:
        target_str = optarg;
        break;
      case OPT_FORMAT:
        output_format = parse_output_format(optarg);
        break;
      case OPT_NUM_ELEMS_MIN:
        num_elems_min = std::stoi(optarg);
        break;
      case OPT_NUM_ELEMS_MAX:
        num_elems_max = std::stoi(optarg);
        break;
      case OPT_TARGET_TOL:
        target_tol = std::stod(optarg);
        break;
      case OPT_TARGET_TOL_MIN:
        target_tol_min = std::stod(optarg) / 100;
        break;
      case OPT_TARGET_TOL_MAX:
        target_tol_max = std::stod(optarg) / 100;
        break;
      case OPT_SERIES_MIN:
        series_min = std::stod(optarg);
        break;
      case OPT_SERIES_MAX:
        series_max = std::stod(optarg);
        break;
      case '?':
        return 1;
    }
  }

  if (value_is_valid(target_tol)) {
    if (value_is_valid(target_tol_min) || value_is_valid(target_tol_max)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    }
    target_tol_min = -target_tol;
    target_tol_max = target_tol;
  } else if (value_is_valid(target_tol_min) || value_is_valid(target_tol_max)) {
    if (value_is_valid(target_tol)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    } else if (!value_is_valid(target_tol_min) ||
               !value_is_valid(target_tol_max)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    }
  } else {
    target_tol_min = -0.5;
    target_tol_max = 0.5;
  }

  if (output_format == output_format_t::JSON) {
    std::printf("[\n");
  }

  std::vector<value_t> target_values = get_values_vector(target_str);
  for (size_t ti = 0; ti < target_values.size(); ti++) {
    value_t target = target_values[ti];

    if (!value_is_valid(series_min)) {
      series_min = target / 1000;
    }
    if (!value_is_valid(series_max)) {
      series_max = target * 1000;
    }

    std::vector<value_t> value_vector =
        get_values_vector(series_str, series_min, series_max);
    if (value_vector.empty()) {
      std::fprintf(stderr, "*ERROR: No values in the specified range.\n");
      return -1;
    }
    ValueList value_list(value_vector);

    value_t target_min = target * (1 - target_tol_max);
    value_t target_max = target * (1 + target_tol_max);
    ValueSearchArgs vsa(type, value_list, num_elems_min, num_elems_max, target,
                        target_min, target_max);
    std::vector<Combination> combs;
    result_t res = search_combinations(vsa, combs);
    if (res != result_t::SUCCESS) {
      std::fprintf(stderr, "*ERROR: search_combinations failed: %s\n",
                   result_to_string(res));
      return -1;
    }

    if (output_format == output_format_t::JSON) {
      std::printf("  [\n");
      for (size_t i = 0; i < combs.size(); i++) {
        const auto& comb = combs[i];
        std::printf("    %s", comb->to_json_string().c_str());
        if (i + 1 < combs.size()) {
          std::printf(",\n");
        } else {
          std::printf("\n");
        }
      }
      std::printf("  ]");

      if (ti + 1 < target_values.size()) {
        std::printf(",\n");
      } else {
        std::printf("\n");
      }
    } else if (output_format == output_format_t::TEXT) {
      std::printf("Target: %g\n", target);
      for (size_t i = 0; i < combs.size(); i++) {
        const auto& comb = combs[i];
        std::string line = value_to_json_string(comb->value);
        if (!comb->is_leaf()) {
          line += " <-- " + comb->to_string();
        }
        std::printf("  %s\n", line.c_str());
      }
    }
  }

  if (output_format == output_format_t::JSON) {
    std::printf("]\n");
  }
  return 0;
}

int main_rdiv(int argc, char** argv) {
  std::string series_str = "e3";
  std::string target_str = "";
  output_format_t output_format = output_format_t::TEXT;
  int num_elems_min = 2;
  int num_elems_max = 4;
  value_t target_tol = VALUE_NONE;
  value_t target_tol_min = VALUE_NONE;
  value_t target_tol_max = VALUE_NONE;
  value_t series_min = VALUE_NONE;
  value_t series_max = VALUE_NONE;
  value_t total_min = 10000;
  value_t total_max = 100000;

  char short_opts[256];
  snprintf(short_opts, sizeof(short_opts),
           "%c:%c:%c:%c:%c:%c:%c:%c:%c:", OPT_SERIES, OPT_TARGET, OPT_FORMAT,
           OPT_NUM_ELEMS_MAX, OPT_TARGET_TOL_MAX, OPT_SERIES_MIN,
           OPT_SERIES_MAX, OPT_TOTAL_MIN, OPT_TOTAL_MAX);

  int opt;
  while ((opt = getopt_long(argc, argv, short_opts, long_opts, NULL)) != -1) {
    switch (opt) {
      case OPT_SERIES:
        series_str = optarg;
        break;
      case OPT_TARGET:
        target_str = optarg;
        break;
      case OPT_FORMAT:
        output_format = parse_output_format(optarg);
        break;
      case OPT_NUM_ELEMS_MIN:
        num_elems_min = std::stoi(optarg);
        break;
      case OPT_NUM_ELEMS_MAX:
        num_elems_max = std::stoi(optarg);
        break;
      case OPT_TARGET_TOL:
        target_tol = std::stod(optarg);
        break;
      case OPT_TARGET_TOL_MIN:
        target_tol_min = std::stod(optarg) / 100;
        break;
      case OPT_TARGET_TOL_MAX:
        target_tol_max = std::stod(optarg) / 100;
        break;
      case OPT_SERIES_MIN:
        series_min = std::stod(optarg);
        break;
      case OPT_SERIES_MAX:
        series_max = std::stod(optarg);
        break;
      case OPT_TOTAL_MIN:
        total_min = std::stod(optarg);
        break;
      case OPT_TOTAL_MAX:
        total_max = std::stod(optarg);
        ;
        break;
      case '?':
        return 1;
    }
  }

  if (value_is_valid(target_tol)) {
    if (value_is_valid(target_tol_min) || value_is_valid(target_tol_max)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    }
    target_tol_min = -target_tol;
    target_tol_max = target_tol;
  } else if (value_is_valid(target_tol_min) || value_is_valid(target_tol_max)) {
    if (value_is_valid(target_tol)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    } else if (!value_is_valid(target_tol_min) ||
               !value_is_valid(target_tol_max)) {
      std::fprintf(stderr, "*ERROR: Invalid args.\n");
      return -1;
    }
  } else {
    target_tol_min = -0.5;
    target_tol_max = 0.5;
  }

  if (output_format == output_format_t::JSON) {
    std::printf("[\n");
  }

  std::vector<value_t> target_values = get_values_vector(target_str);
  for (size_t ti = 0; ti < target_values.size(); ti++) {
    value_t target = target_values[ti];

    if (!value_is_valid(series_min)) {
      series_min = 1e2;
    }
    if (!value_is_valid(series_max)) {
      series_max = 1e6;
    }

    std::vector<value_t> value_vector =
        get_values_vector(series_str, series_min, series_max);
    if (value_vector.empty()) {
      std::fprintf(stderr, "*ERROR: No values in the specified range.\n");
      return -1;
    }
    ValueList value_list(value_vector);

    value_t target_min = target * (1 - target_tol_max);
    value_t target_max = target * (1 + target_tol_max);
    DividerSearchArgs dsa(value_list, num_elems_min, num_elems_max, total_min,
                          total_max, target, target_min, target_max);
    std::vector<DoubleCombination> combs;
    result_t res = search_dividers(dsa, combs);
    if (res != result_t::SUCCESS) {
      std::fprintf(stderr, "*ERROR: search_combinations failed: %s\n",
                   result_to_string(res));
      return -1;
    }

    if (output_format == output_format_t::JSON) {
      std::printf("  [\n");
      for (size_t i = 0; i < combs.size(); i++) {
        const auto& comb = combs[i];
        std::printf("    %s", comb->to_json_string().c_str());
        if (i + 1 < combs.size()) {
          std::printf(",\n");
        } else {
          std::printf("\n");
        }
      }
      std::printf("  ]");

      if (ti + 1 < target_values.size()) {
        std::printf(",\n");
      } else {
        std::printf("\n");
      }
    } else if (output_format == output_format_t::TEXT) {
      std::printf("Target: %g\n", target);
      for (size_t i = 0; i < combs.size(); i++) {
        const auto& comb = combs[i];
        std::printf("%s", comb->to_string().c_str());
      }
    }
  }

  if (output_format == output_format_t::JSON) {
    std::printf("]\n");
  }
  return 0;
}

std::vector<value_t> get_values_vector(const std::string& series, value_t min,
                                       value_t max) {
  if (series == "e1") {
    return get_series_vector(e1, min, max);
  } else if (series == "e3") {
    return get_series_vector(e3, min, max);
  } else if (series == "e6") {
    return get_series_vector(e6, min, max);
  } else if (series == "e12") {
    return get_series_vector(e12, min, max);
  } else if (series == "e24") {
    return get_series_vector(e24, min, max);
  } else if (series == "e48") {
    return get_series_vector(e48, min, max);
  } else if (series == "e96") {
    return get_series_vector(e96, min, max);
  } else if (series == "e192") {
    return get_series_vector(e192, min, max);
  } else if (series == "e24_e48") {
    return get_series_vector(e24_e48, min, max);
  } else if (series == "e24_e96") {
    return get_series_vector(e24_e96, min, max);
  } else if (series == "e24_e192") {
    return get_series_vector(e24_e192, min, max);
  } else {
    auto vals = split(series, ',');
    std::vector<value_t> result;
    for (const auto& v : vals) {
      const value_t val = static_cast<value_t>(std::stod(v));
      if (min <= val && val <= max) {
        result.push_back(val);
      }
    }
    return result;
  }
}

std::vector<value_t> get_series_vector(const std::vector<value_t>& series,
                                       value_t min, value_t max) {
  std::vector<value_t> result;
  for (int exp = -12; exp <= 12; exp++) {
    int e = exp - 3;
    for (const auto& v : series) {
      value_t val;
      if (e >= 0) {
        val = v * pow10(e);
      } else {
        val = v / pow10(-e);
      }
      if (min <= val && val <= max) {
        result.push_back(val);
      }
    }
  }
  return result;
}

int main_alt(int argc, char** argv) {
  auto t_start = std::chrono::high_resolution_clock::now();

  std::vector<value_t> K10 = {10000};
  std::vector<value_t> E3 = {100,    220,    470,    1000,  2200,
                             4700,   10000,  22000,  47000, 100000,
                             220000, 470000, 1000000};

  std::vector<ComponentType> types = {ComponentType::Resistor,
                                      ComponentType::Capacitor};

  {
    std::vector<value_t> targets = {
        100,  111,  123,  137,  150,  162,  178,   196,   215,   233,
        249,  270,  294,  316,  340,  364,  390,   430,   470,   511,
        540,  581,  620,  680,  721,  750,  820,   872,   930,   1575,
        2947, 3954, 4000, 7246, 9000, 9999, 14000, 26000, 31415,
    };
    for (const auto& type : types) {
      for (int max_elements = 1; max_elements <= 5; max_elements++) {
        RCMB_DEBUG_PRINT(
            "Testing search_combinations: type=%d, max_elements=%d\n",
            static_cast<int>(type), max_elements);
        for (const auto& target : targets) {
          bool ok = test_search_combinations(type, E3, max_elements, target);
          if (!ok) {
            RCMB_DEBUG_PRINT(
                "Test failed: type=%d, max_elements=%d, target=%.9f\n",
                static_cast<int>(type), max_elements, target);
            return -1;
          }
        }
      }
    }
  }

  {
    const auto type = ComponentType::Resistor;
    std::vector<value_t> series = {1};
    const int max_elements = 12;
    const value_t target = 3.14;
    bool ok = test_search_combinations(type, series, max_elements, target);
    if (!ok) {
      RCMB_DEBUG_PRINT("Test failed: type=%d, max_elements=%d, target=%.9f\n",
                       static_cast<int>(type), max_elements, target);
      return -1;
    }
  }

  {
    std::vector<value_t> targets = {
        0.01, 0.1, 0.2,  0.21,      0.3, 0.33, 1.0 / 3.0, 0.4,
        0.5,  0.6, 0.66, 2.0 / 3.0, 0.7, 0.8,  0.9,       0.99,
    };

    for (int max_elements = 2; max_elements <= 6; max_elements++) {
      RCMB_DEBUG_PRINT("Testing search_dividers: max_elements=%d\n",
                       max_elements);
      for (const auto& target : targets) {
        bool ok = test_search_dividers(E3, max_elements, target);
        if (!ok) {
          RCMB_DEBUG_PRINT(
              "Divider test failed: max_elements=%d, target=%.9f\n",
              max_elements, target);
          return -1;
        }
      }
    }
  }

  {
    int max_elements = 10;
    value_t target = 19.0 / 20.0;
    bool ok = test_search_dividers(K10, 10, target);
    if (!ok) {
      RCMB_DEBUG_PRINT("Divider test failed: max_elements=%d, target=%.9f\n",
                       max_elements, target);
      return -1;
    }
  }

  auto t_elapsed = std::chrono::high_resolution_clock::now() - t_start;
  auto ms =
      std::chrono::duration_cast<std::chrono::milliseconds>(t_elapsed).count();
  RCMB_DEBUG_PRINT("All tests passed. Elapsed time: %ld ms\n", ms);

  return 0;
}

bool test_search_combinations(ComponentType type, std::vector<value_t>& series,
                              int max_elements, value_t target) {
  value_t target_min = target * 0.5;
  value_t target_max = target * 1.5;

  ValueList value_list(series);
  ValueSearchArgs vsa(type, value_list, 1, max_elements, target, target_min,
                      target_max);

  std::vector<Combination> dut_combs;
  result_t ret = search_combinations(vsa, dut_combs);
  if (ret != result_t::SUCCESS) {
    printf("Error: %s\n", result_to_string(ret));
    return false;
  }
  int dut_elements = 9999;
  value_t dut_value = VALUE_NONE;
  value_t dut_error = VALUE_POSITIVE_INFINITY;
  Combination dut_comb;
  for (const auto& comb : dut_combs) {
    value_t error = std::abs(comb->value - target);
    if (error < dut_error) {
      dut_value = comb->value;
      dut_error = error;
      dut_elements = comb->topology->num_leafs;
      dut_comb = comb;
    }
  }

  value_t epsilon = target / 1e9;
  value_t exp_value = VALUE_NONE;
  value_t exp_error = VALUE_POSITIVE_INFINITY;
  int exp_elements = 0;
  TestCombination exp_comb;

  std::vector<bool> parallels = {false, true};

  int indices[max_elements] = {0};
  value_t slot[max_elements] = {0};
  for (int num_elements = 1; num_elements <= max_elements; num_elements++) {
    for (auto parallel : parallels) {
      if (num_elements == 1 && parallel) continue;
      auto& topos = test_get_topology(parallel, num_elements);

      for (auto& topo : topos) {
        for (int i = 0; i < num_elements; i++) {
          indices[i] = 0;
          slot[i] = series[0];
        }

        int series_size = series.size();
        bool done = false;
        while (!done) {
          int incr_pos = num_elements - 1;

          value_t value;
          test_calc_value(false, type, topo, slot, 0, &value);
          if (value != VALUE_NONE) {
            value_t error = std::abs(value - target);
            if (error < exp_error - epsilon) {
              exp_value = value;
              exp_error = error;
              exp_elements = num_elements;
              exp_comb = test_calc_value(true, type, topo, slot, 0);
              // RCMB_DEBUG_PRINT("Found better combination: %lf
              // (error=%lf)\n",
              //                    val, error);
            }
          }

          // Increment indices
          for (int i = num_elements - 1; i > incr_pos; i--) {
            indices[i] = 0;
            slot[i] = series[0];
          }
          for (int i = incr_pos; i >= 0; i--) {
            indices[i] = (indices[i] + 1) % series_size;
            slot[i] = series[indices[i]];
            if (indices[i] != 0) {
              break;
            } else if (i == 0) {
              done = true;
              break;
            }
          }
        }
      }
    }

    if (exp_error < epsilon) {
      break;
    }
  }

  bool unmatch = false;
  if ((dut_error > exp_error + epsilon * 10) ||
      (dut_error < exp_error - epsilon * 10)) {
    unmatch = true;
  }
  if ((dut_elements != exp_elements)) {
    unmatch = true;
  }
  if (unmatch) {
    printf("*ERROR: Mismatch found (Target=%lf):\n", target);
    printf("  |   | N|          Value|          Error|\n");
    printf("  |Exp|%2d|%15.9lf|%15.9lf| %s\n", exp_elements, exp_value,
           exp_error, exp_comb->to_string().c_str());
    printf("  |DUT|%2d|%15.9lf|%15.9lf| %s\n", dut_elements, dut_value,
           dut_error, dut_comb->to_string().c_str());
    printf("\n");
    // return false;
  }

  return true;
}

bool test_search_dividers(std::vector<value_t>& series, int max_elements,
                          value_t target, bool verbose) {
  const value_t total_min = 10000;
  const value_t total_max = 100000;
  const value_t target_min = target * 0.5;
  const value_t target_max = target * 1.5;
  ValueList value_list(series);
  DividerSearchArgs dsa(value_list, 2, max_elements, total_min, total_max,
                        target, target_min, target_max);
  auto start = std::chrono::high_resolution_clock::now();
  std::vector<DoubleCombination> dividers;
  result_t ret = search_dividers(dsa, dividers);
  if (ret != result_t::SUCCESS) {
    RCMB_DEBUG_PRINT("Error: %s\n", result_to_string(ret));
    return false;
  }

  bool success = true;

  if (dividers.empty()) {
    RCMB_DEBUG_PRINT("Divider test failed: no result found for target=%.9lf\n",
                     target);
    success = false;
  } else {
    value_t result = dividers[0]->ratio;
    value_t error = std::abs(result - target);
    if (target < total_min - 1e9 || total_max + 1e9 < result) {
      RCMB_DEBUG_PRINT(
          "Divider test failed: target=%.9lf, result=%.9lf, error=%.9lf\n",
          target, result, error);
      success = false;
    }
    value_t total =
        dividers[0]->uppers[0]->value + dividers[0]->lowers[0]->value;
    if (total < total_min - 1e9 || total_max + 1e9 < total) {
      RCMB_DEBUG_PRINT(
          "Divider test failed: target=%.9lf, total=%.9lf, error=%.9lf\n",
          target, total, error);
      success = false;
    }
  }

  if (!success || verbose) {
    auto end = std::chrono::high_resolution_clock::now();
    for (const auto& div : dividers) {
      RCMB_DEBUG_PRINT("%s\n", div->to_string().c_str());
      // printf("%s\n", div->to_json_string().c_str());
    }
    std::chrono::duration<double, std::milli> duration = end - start;
    RCMB_DEBUG_PRINT("Search took %.2f ms\n", duration.count());
  }

  return success;
}

TestCombination test_calc_value(bool bake, ComponentType type,
                                TestTopology& topo, const value_t* leaf_values,
                                int pos, value_t* out_value) {
  if (topo->is_leaf()) {
    if (out_value) {
      *out_value = leaf_values[pos];
    }
    if (bake) {
      return create_test_combination(topo, {}, leaf_values[pos]);
    } else {
      return nullptr;
    }
  }

  bool inv_sum;
  if (type == ComponentType::Resistor) {
    inv_sum = topo->parallel;
  } else {
    inv_sum = !topo->parallel;
  }

  int child_pos = pos;
  value_t accum = 0;
  uint32_t last_id = -1;
  value_t last_value = std::numeric_limits<value_t>::infinity();
  std::vector<TestCombination>* child_combs = nullptr;
  if (bake) {
    child_combs = new std::vector<TestCombination>();
  }
  for (auto& child : topo->children) {
    value_t child_value;
    auto child_comb = test_calc_value(bake, type, child, leaf_values, child_pos,
                                      &child_value);

    // 枝刈り
    if (child_value == VALUE_NONE) {
      *out_value = VALUE_NONE;
      return nullptr;
    } else if (child->id == last_id && child_value > last_value) {
      *out_value = VALUE_NONE;
      return nullptr;
    }
    last_id = child->id;
    last_value = child_value;

    if (bake) {
      child_combs->push_back(child_comb);
    }
    if (inv_sum) {
      accum += 1 / child_value;
    } else {
      accum += child_value;
    }
    child_pos += child->num_leafs;
  }
  value_t value = inv_sum ? (1 / accum) : accum;

  if (out_value) {
    *out_value = value;
  }
  if (bake) {
    auto ret = create_test_combination(topo, *child_combs, value);
    if (child_combs) {
      delete child_combs;
    }
    return ret;
  } else {
    return nullptr;
  }
}

std::vector<TestTopology>& test_get_topology(bool parallel, int n) {
  int key = ((n >= 2 && parallel) ? (1 << 16) : 0) | n;
  if (topologies.contains(key)) {
    return topologies[key];
  }

  if (n == 1) {
    std::vector<TestTopology> children;
    topologies[key] = {create_test_topology(false, 1, children)};
    return topologies[key];
  }

  std::vector<TestTopology> result;

  std::stack<std::vector<int>> stack;
  for (int i = n - 1; i >= 1; i--) {
    std::vector<int> part_size;
    part_size.push_back(i);
    stack.push(part_size);
  }
  while (!stack.empty()) {
    // RCMB_DEBUG_PRINT("stack.size()=%d\n", static_cast<int>(stack.size()));
    const auto poses = stack.top();
    stack.pop();

    int pos = poses.back();
    if (pos == n) {
      test_collect_topologies(parallel, result, poses);
      continue;
    } /*else if (pos > n) {
      // RCMB_DEBUG_PRINT("Invalid pos=%d > n=%d\n", pos, n);
      throw std::runtime_error("Invalid state");
    }*/

    int max_next_size = n - pos;

    int last_size = pos;
    if (poses.size() >= 2) {
      last_size -= poses[poses.size() - 2];
    }
    if (max_next_size > last_size) {
      max_next_size = last_size;
    }

    for (int next_size = max_next_size; next_size >= 1; next_size--) {
      std::vector<int> new_poses = poses;
      new_poses.push_back(pos + next_size);
      stack.push(new_poses);
      // RCMB_DEBUG_PRINT("pushed : %d, stack.size()=%d\n", next_size,
      //                    static_cast<int>(stack.size()));
    }
  }

  // RCMB_DEBUG_PRINT("Generated %d topologies for n=%d, parallel=%d\n",
  //                    static_cast<int>(result.size()), n, parallel ? 1 : 0);
  topologies[key] = result;
  return topologies[key];
}

void test_collect_topologies(bool parallel, std::vector<TestTopology>& topos,
                             const std::vector<int>& poses) {
  // RCMB_DEBUG_PRINT("Collecting topologies: parallel=%d, poses.size()=%d\n",
  //                    parallel ? 1 : 0, static_cast<int>(poses.size()));

  std::vector<std::vector<TestTopology>> parts;
  int num_leafs = 0;
  for (int p : poses) {
    int size = p - num_leafs;
    parts.push_back(test_get_topology(!parallel, size));
    num_leafs = p;
  }

  std::vector<size_t> indices(poses.size(), 0);
  while (indices[poses.size() - 1] < parts[poses.size() - 1].size()) {
    std::vector<TestTopology> children(poses.size());
    for (size_t i = 0; i < poses.size(); i++) {
      children[i] = parts[i][indices[i]];
    }
    topos.push_back(create_test_topology(parallel, num_leafs, children));

    for (size_t i = 0; i < poses.size(); i++) {
      indices[i]++;
      if (indices[i] < parts[i].size()) {
        break;
      } else if (i + 1 >= poses.size()) {
        break;
      } else {
        indices[i] = 0;
      }
    }
  }
}

std::vector<std::string> split(std::string str, char delimiter) {
  std::vector<std::string> result;
  size_t pos = 0;
  while (true) {
    size_t next_pos = str.find(delimiter, pos);
    if (next_pos == std::string::npos) {
      result.push_back(str.substr(pos));
      break;
    } else {
      result.push_back(str.substr(pos, next_pos - pos));
      pos = next_pos + 1;
    }
  }
  return result;
}

output_format_t parse_output_format(const std::string& format_str) {
  if (format_str == "t" || format_str == "text") {
    return output_format_t::TEXT;
  } else if (format_str == "j" || format_str == "json") {
    return output_format_t::JSON;
  } else {
    throw std::invalid_argument("Invalid output format: '" + format_str + "'");
  }
}
