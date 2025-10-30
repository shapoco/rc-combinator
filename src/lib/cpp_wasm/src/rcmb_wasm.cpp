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

std::string findCombinations(bool capacitor, const std::vector<double>& values,
                             double target_value, int max_elements,
                             int topology_constraint, int max_depth,
                             int filter) {
  auto type = capacitor ? ComponentType::Capacitor : ComponentType::Resistor;
  std::vector<value_t> val_vec;
  for (const auto& v : values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  value_t min = target_value / 2;
  value_t max = target_value * 2;
  ValueSearchOptions options(type, value_list, min, max, max_elements,
                             target_value);
  options.topology_constraint =
      static_cast<topology_constraint_t>(topology_constraint);
  options.max_depth = max_depth;
  options.filter = static_cast<filter_t>(filter);

  std::vector<Combination> combinations;
  auto ret = rcmb::search_combinations(options, combinations);
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

std::string findDividers(const std::vector<double>& values, double target_ratio,
                         double total_min, double total_max, int max_elements,
                         int topology_constraint, int max_depth,
                         int filter) {
  std::vector<value_t> val_vec;
  for (const auto& v : values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  DividerSearchOptions options(ComponentType::Resistor, value_list,
                               target_ratio, total_min, total_max,
                               max_elements);
  options.topology_constraint =
      static_cast<topology_constraint_t>(topology_constraint);
  options.max_depth = max_depth;
  options.filter = static_cast<filter_t>(filter);

  std::vector<DoubleCombination> combinations;
  auto ret = rcmb::search_dividers(options, combinations);
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
