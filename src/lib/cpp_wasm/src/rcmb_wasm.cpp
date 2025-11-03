#include <cstdio>
#include <string>

#include <emscripten/bind.h>

#include "rcmb/rcmb.hpp"

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

using namespace rcmb;

std::string findCombinations(bool capacitor,
                             const std::vector<double>& element_values,
                             int max_elements, int topology_constraint,
                             int max_depth, double target_value,
                             double target_min, double target_max) {
  auto type = capacitor ? ComponentType::Capacitor : ComponentType::Resistor;
  std::vector<value_t> val_vec;
  for (const auto& v : element_values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  ValueSearchArgs args(type, value_list, max_elements, target_value, target_min,
                       target_max);
  args.topology_constraint =
      static_cast<topology_constraint_t>(topology_constraint);
  args.max_depth = max_depth;

  std::vector<Combination> combinations;
  auto ret = rcmb::search_combinations(args, combinations);
  if (ret != result_t::SUCCESS) {
    return std::string("{\"error\":\"") + result_to_string(ret) + "\"}";
  }

  std::string result = "{\"result\":[";
  for (size_t i = 0; i < combinations.size(); i++) {
    const auto& comb = combinations[i];
    if (i > 0) {
      result += ",";
    }
    result += comb->to_json_string();
  }
  result += "]}";
  return result;
}

std::string findDividers(const std::vector<double>& element_values,
                         int max_elements, int topology_constraint,
                         int max_depth, double total_min, double total_max,
                         double target_value, double target_min,
                         double target_max) {
  std::vector<value_t> val_vec;
  for (const auto& v : element_values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  DividerSearchArgs args(value_list, max_elements, total_min, total_max,
                         target_value, target_min, target_max);
  args.topology_constraint =
      static_cast<topology_constraint_t>(topology_constraint);
  args.max_depth = max_depth;

  std::vector<DoubleCombination> combinations;
  auto ret = rcmb::search_dividers(args, combinations);
  if (ret != result_t::SUCCESS) {
    return std::string("{\"error\":\"") + result_to_string(ret) + "\"}";
  }

  std::string result = "{\"result\":[";
  for (size_t i = 0; i < combinations.size(); i++) {
    const auto& comb = combinations[i];
    if (i > 0) {
      result += ",";
    }
    result += comb->to_json_string();
  }
  result += "]}";
  return result;
}

EMSCRIPTEN_BINDINGS(RccombCore) {
  emscripten::register_vector<double>("VectorDouble");
  emscripten::function("findCombinations", &findCombinations);
  emscripten::function("findDividers", &findDividers);
}
