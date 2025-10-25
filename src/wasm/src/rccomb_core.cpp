#include <cstdio>
#include <string>

#include <emscripten/bind.h>

#include "rccomb/rccomb.hpp"

#ifdef __cplusplus
#define EXTERN extern "C"
#else
#define EXTERN
#endif

using namespace rccomb;

std::string find_combinations(bool capacitor, const std::vector<double>& values,
                              double target_value, int max_elements) {
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

  auto combinations = rccomb::search_combinations(options);

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

std::string find_dividers(const std::vector<double>& values,
                          double target_ratio, double total_min,
                          double total_max, int max_elements) {
  std::vector<value_t> val_vec;
  for (const auto& v : values) {
    val_vec.push_back(static_cast<value_t>(v));
  }
  ValueList value_list(val_vec);

  DividerSearchOptions options(ComponentType::Resistor, value_list,
                               target_ratio, total_min, total_max,
                               max_elements);

  auto combinations = rccomb::search_dividers(options);

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
  emscripten::function("find_combinations", &find_combinations);
  emscripten::function("find_dividers", &find_dividers);
}
